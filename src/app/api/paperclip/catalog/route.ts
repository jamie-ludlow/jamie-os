import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  buildPaperclipProjectMappings,
  CANONICAL_PAPERCLIP_ROLES,
  normalizePaperclipRole,
} from '@/lib/paperclip-catalog';
import type { PaperclipAgent, PaperclipCatalog, PaperclipCompany, PaperclipProject, Project } from '@/lib/types';

export const dynamic = 'force-dynamic';

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Paperclip request failed: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

export async function GET() {
  const baseUrl = process.env.PAPERCLIP_API_URL || 'http://127.0.0.1:3100/api';

  try {
    const companiesRaw = await fetchJson<Array<Record<string, unknown>>>(`${baseUrl}/companies`);

    const companies: PaperclipCompany[] = companiesRaw.map((company) => ({
      id: String(company.id),
      name: String(company.name || company.slug || company.id),
      slug: typeof company.slug === 'string' ? company.slug : null,
    }));

    const projectResults = await Promise.all(
      companies.map(async (company) => {
        const projectsRaw = await fetchJson<Array<Record<string, unknown>>>(`${baseUrl}/companies/${company.id}/projects`);
        return projectsRaw.map((project) => ({
          id: String(project.id),
          companyId: company.id,
          name: String(project.name || project.slug || project.id),
          slug: typeof project.slug === 'string' ? project.slug : null,
        } satisfies PaperclipProject));
      })
    );

    const agentResults = await Promise.all(
      companies.map(async (company) => {
        const agentsRaw = await fetchJson<Array<Record<string, unknown>>>(`${baseUrl}/companies/${company.id}/agents`);
        return agentsRaw.map((agent) => ({
          id: String(agent.id),
          companyId: company.id,
          name: String(agent.name || agent.role || agent.id),
          role: normalizePaperclipRole(typeof agent.role === 'string' ? agent.role : typeof agent.name === 'string' ? agent.name : '') || 'Engineer',
          title: typeof agent.title === 'string' ? agent.title : null,
          status: typeof agent.status === 'string' ? agent.status : null,
          reportsTo: typeof agent.reportsTo === 'string' ? agent.reportsTo : null,
          lastHeartbeatAt: typeof agent.lastHeartbeatAt === 'string' ? agent.lastHeartbeatAt : null,
        } satisfies PaperclipAgent));
      })
    );

    const { data: mcProjects, error } = await supabaseAdmin
      .from('projects')
      .select('id, name, color, created_at')
      .order('name', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const projects = projectResults.flat();
    const agents = agentResults.flat();
    const projectMappings = buildPaperclipProjectMappings((mcProjects || []) as Project[], companies, projects, agents);

    const catalog: PaperclipCatalog = {
      companies,
      projects,
      agents,
      canonicalRoles: CANONICAL_PAPERCLIP_ROLES,
      projectMappings,
    };

    return NextResponse.json(catalog);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load Paperclip catalog' },
      { status: 500 }
    );
  }
}
