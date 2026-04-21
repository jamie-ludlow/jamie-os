import type { Project } from '@/lib/types';

export type CanonicalPaperclipRole = 'CEO' | 'Engineer' | 'Designer' | 'QA';

export interface PaperclipCompany {
  id: string;
  name: string;
  slug?: string | null;
}

export interface PaperclipProject {
  id: string;
  companyId: string;
  name: string;
  slug?: string | null;
}

export interface PaperclipAgent {
  id: string;
  companyId: string;
  name: string;
  role: CanonicalPaperclipRole | string;
  title?: string | null;
  status?: string | null;
  reportsTo?: string | null;
  lastHeartbeatAt?: string | null;
}

export interface PaperclipProjectMapping {
  mcProjectId: string;
  paperclipCompanyId: string;
  paperclipProjectId: string | null;
  availableRoles: string[];
}

export interface PaperclipCatalog {
  companies: PaperclipCompany[];
  projects: PaperclipProject[];
  agents: PaperclipAgent[];
  canonicalRoles: CanonicalPaperclipRole[];
  projectMappings: Record<string, PaperclipProjectMapping>;
}

export const CANONICAL_PAPERCLIP_ROLES: CanonicalPaperclipRole[] = ['CEO', 'Engineer', 'Designer', 'QA'];

export function normalizePaperclipRole(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === 'ceo') return 'CEO';
  if (normalized === 'engineer') return 'Engineer';
  if (normalized === 'designer') return 'Designer';
  if (normalized === 'qa') return 'QA';
  if (normalized === 'quality assurance') return 'QA';
  return value.trim();
}

function slugify(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function guessCompanyIdForProject(project: Project, companies: PaperclipCompany[]): string | null {
  const name = project.name.trim().toLowerCase();
  const slug = slugify(project.name);

  const direct = companies.find((company) => {
    const companyName = company.name.trim().toLowerCase();
    const companySlug = company.slug?.toLowerCase();
    return companyName === name || companySlug === slug;
  });
  if (direct) return direct.id;

  if (name.includes('mission control')) {
    return companies.find((company) => company.name.toLowerCase().includes('mission control'))?.id ?? null;
  }
  if (name.includes('air social')) {
    return companies.find((company) => company.name.toLowerCase().includes('air social'))?.id ?? null;
  }
  if (name.includes('lead rise')) {
    return companies.find((company) => company.name.toLowerCase().includes('lead rise'))?.id ?? null;
  }

  return null;
}

function guessProjectIdForCompany(companyId: string, projects: PaperclipProject[]): string | null {
  const companyProjects = projects.filter((project) => project.companyId === companyId);
  if (companyProjects.length === 1) return companyProjects[0].id;
  return companyProjects[0]?.id ?? null;
}

export function buildPaperclipProjectMappings(mcProjects: Project[], companies: PaperclipCompany[], projects: PaperclipProject[], agents: PaperclipAgent[]): Record<string, PaperclipProjectMapping> {
  const mappings: Record<string, PaperclipProjectMapping> = {};

  for (const project of mcProjects) {
    const paperclipCompanyId = guessCompanyIdForProject(project, companies);
    if (!paperclipCompanyId) continue;

    const paperclipProjectId = guessProjectIdForCompany(paperclipCompanyId, projects);
    const availableRoles = Array.from(new Set(
      agents
        .filter((agent) => agent.companyId === paperclipCompanyId)
        .map((agent) => normalizePaperclipRole(agent.role) || agent.name)
        .filter((value): value is string => Boolean(value))
    ));

    mappings[project.id] = {
      mcProjectId: project.id,
      paperclipCompanyId,
      paperclipProjectId,
      availableRoles,
    };
  }

  return mappings;
}
