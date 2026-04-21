import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

interface AgentDef {
  id: string;
  name: string;
  role: string;
  model: string;
  tier: 'owner' | 'orchestrator' | 'manager' | 'worker';
  status: 'active' | 'idle';
  emoji: string;
  description: string;
  skills: string[];
}

// Tier mapping based on agent role
function getTier(id: string): AgentDef['tier'] {
  if (id === 'casper') return 'orchestrator';
  return 'worker';
}

export async function GET() {
  // Fetch agents from DB — single source of truth
  const { data: dbAgents, error: agentsError } = await supabaseAdmin
    .from('agent_status')
    .select('*')
    .order('id');

  const AGENTS: AgentDef[] = (dbAgents || []).map((a) => ({
    id: a.id,
    name: a.name || a.id,
    role: a.role || 'Agent',
    model: a.model || 'unknown',
    tier: getTier(a.id),
    status: a.status === 'active' ? 'active' : 'idle',
    emoji: a.emoji || '🤖',
    description: '',
    skills: [],
  }));

  if (agentsError) {
    console.error('Failed to fetch agents:', agentsError);
  }
  // Get token usage from Supabase (table may not exist yet)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let records: any[] = [];
  try {
    const { data: usageData, error } = await supabaseAdmin
      .from('token_usage')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && usageData) records = usageData;
  } catch {
    // token_usage table doesn't exist yet — that's fine
  }
  const totalCost = records.reduce((sum, r) => sum + Number(r.cost), 0);
  const totalInput = records.reduce((sum, r) => sum + (r.input_tokens || 0), 0);
  const totalOutput = records.reduce((sum, r) => sum + (r.output_tokens || 0), 0);

  // Today's usage
  const today = new Date().toISOString().split('T')[0];
  const todayRecords = records.filter(r => r.created_at?.startsWith(today));
  const todayCost = todayRecords.reduce((sum, r) => sum + Number(r.cost), 0);

  return NextResponse.json({
    agents: AGENTS,
    usage: {
      totalCost: Math.round(totalCost * 100) / 100,
      todayCost: Math.round(todayCost * 100) / 100,
      totalInput,
      totalOutput,
      sessionCount: records.length,
      todayCosts: todayRecords.slice(0, 20).map(r => ({
        session: r.session_id || r.agent || 'unknown',
        cost: Number(r.cost),
        tokens: (r.input_tokens || 0) + (r.output_tokens || 0),
      })),
      currency: 'USD',
    },
  });
}
