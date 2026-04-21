import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import type { TokenUsageResponse, TokenUsageBreakdown } from '@/lib/types';

interface TokenUsageRequest {
  agent: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost: number;
  session_id?: string;
  project_id?: string;
  task_id?: string;
  context?: string;
}

export async function POST(request: Request) {
  // API key check
  const apiKey = request.headers.get('x-api-key');
  const expectedKey = process.env.MC_API_KEY;

  if (!expectedKey) {
    return NextResponse.json(
      { error: 'MC_API_KEY not configured' },
      { status: 500 }
    );
  }

  if (!apiKey || apiKey !== expectedKey) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body: TokenUsageRequest = await request.json();

    // Validate required fields
    const { agent, model, input_tokens, output_tokens, cost } = body;
    if (!agent || !model || typeof input_tokens !== 'number' || typeof output_tokens !== 'number' || typeof cost !== 'number') {
      return NextResponse.json(
        { error: 'Missing or invalid required fields: agent, model, input_tokens, output_tokens, cost' },
        { status: 400 }
      );
    }

    // Insert into Supabase
    const { data, error } = await supabaseAdmin
      .from('token_usage')
      .insert({
        agent,
        model,
        input_tokens,
        output_tokens,
        cost,
        session_id: body.session_id || null,
        project_id: body.project_id || null,
        task_id: body.task_id || null,
        context: body.context || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json(
        { error: 'Failed to insert token usage record', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('Token usage POST error:', err);
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period');
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    const projectId = searchParams.get('project_id');
    const agent = searchParams.get('agent');
    const model = searchParams.get('model');

    // Calculate date filter - support both date range and period
    let fromDate: string | null = null;
    let toDate: string | null = null;

    if (fromParam && toParam) {
      // Use explicit date range — ensure 'to' covers the full day
      fromDate = new Date(fromParam).toISOString();
      const toEnd = new Date(toParam);
      toEnd.setHours(23, 59, 59, 999);
      toDate = toEnd.toISOString();
    } else if (period) {
      // Fallback to period-based filtering for backwards compatibility
      const now = new Date();
      if (period === 'day') {
        const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        fromDate = dayAgo.toISOString();
      } else if (period === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        fromDate = weekAgo.toISOString();
      } else if (period === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        fromDate = monthAgo.toISOString();
      }
    }

    // Build query
    let query = supabaseAdmin.from('token_usage').select('*');
    
    if (fromDate) {
      query = query.gte('created_at', fromDate);
    }
    if (toDate) {
      query = query.lte('created_at', toDate);
    }
    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    if (agent) {
      query = query.eq('agent', agent);
    }
    if (model) {
      query = query.eq('model', model);
    }

    const { data: records, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch token usage', details: error.message },
        { status: 500 }
      );
    }

    // Calculate aggregates
    const totalTokens = records?.reduce((sum, r) => sum + r.input_tokens + r.output_tokens, 0) || 0;
    const totalCost = records?.reduce((sum, r) => sum + r.cost, 0) || 0;

    // Breakdown by agent
    const agentMap = new Map<string, { tokens: number; cost: number }>();
    records?.forEach((r) => {
      const existing = agentMap.get(r.agent) || { tokens: 0, cost: 0 };
      agentMap.set(r.agent, {
        tokens: existing.tokens + r.input_tokens + r.output_tokens,
        cost: existing.cost + r.cost,
      });
    });
    const breakdownByAgent: TokenUsageBreakdown[] = Array.from(agentMap.entries()).map(([agent, data]) => ({
      agent,
      total_tokens: data.tokens,
      total_cost: data.cost,
    }));

    // Breakdown by project
    const projectMap = new Map<string, { tokens: number; cost: number; name: string | null }>();
    records?.forEach((r) => {
      if (!r.project_id) return;
      const existing = projectMap.get(r.project_id) || { tokens: 0, cost: 0, name: null };
      projectMap.set(r.project_id, {
        tokens: existing.tokens + r.input_tokens + r.output_tokens,
        cost: existing.cost + r.cost,
        name: existing.name,
      });
    });

    // Fetch project names
    const projectIds = Array.from(projectMap.keys());
    let projectNames: Record<string, string> = {};
    if (projectIds.length > 0) {
      const { data: projects } = await supabaseAdmin
        .from('projects')
        .select('id, name')
        .in('id', projectIds);
      projectNames = (projects || []).reduce((acc, p) => ({ ...acc, [p.id]: p.name }), {});
    }

    const breakdownByProject: TokenUsageBreakdown[] = Array.from(projectMap.entries()).map(([projectId, data]) => ({
      project_id: projectId,
      project_name: projectNames[projectId] || 'Unknown',
      total_tokens: data.tokens,
      total_cost: data.cost,
    }));

    // Breakdown by day
    const dayMap = new Map<string, { tokens: number; cost: number }>();
    records?.forEach((r) => {
      const date = new Date(r.created_at).toISOString().split('T')[0];
      const existing = dayMap.get(date) || { tokens: 0, cost: 0 };
      dayMap.set(date, {
        tokens: existing.tokens + r.input_tokens + r.output_tokens,
        cost: existing.cost + r.cost,
      });
    });
    const breakdownByDay: TokenUsageBreakdown[] = Array.from(dayMap.entries())
      .map(([date, data]) => ({
        date,
        total_tokens: data.tokens,
        total_cost: data.cost,
      }))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    // Helper function to derive provider from model name
    const getProvider = (model: string): string => {
      if (model.startsWith('claude-')) return 'Anthropic';
      if (model.startsWith('gpt-') || model.startsWith('o1-') || model.startsWith('o3-') || model.startsWith('codex-')) return 'OpenAI';
      if (model.startsWith('gemini-')) return 'Google';
      return 'Other';
    };

    // Breakdown by model
    const CLAUDE_MAX_MODELS = [
      'claude-opus-4-6',
      'claude-sonnet-4-5',
      'claude-haiku-3-5',
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
    ];
    
    const isClaudeMax = (model: string): boolean => {
      return CLAUDE_MAX_MODELS.some((m) => model.includes(m));
    };

    const modelMap = new Map<string, { tokens: number; cost: number; isClaudeMax: boolean }>();
    records?.forEach((r) => {
      const existing = modelMap.get(r.model) || { tokens: 0, cost: 0, isClaudeMax: isClaudeMax(r.model) };
      modelMap.set(r.model, {
        tokens: existing.tokens + r.input_tokens + r.output_tokens,
        cost: existing.cost + r.cost,
        isClaudeMax: existing.isClaudeMax,
      });
    });
    const breakdownByModel: TokenUsageBreakdown[] = Array.from(modelMap.entries()).map(([model, data]) => ({
      model,
      total_tokens: data.tokens,
      total_cost: data.cost,
      is_claude_max: data.isClaudeMax,
    }));

    // Breakdown by provider
    const providerMap = new Map<string, { tokens: number; cost: number }>();
    records?.forEach((r) => {
      const provider = getProvider(r.model);
      const existing = providerMap.get(provider) || { tokens: 0, cost: 0 };
      providerMap.set(provider, {
        tokens: existing.tokens + r.input_tokens + r.output_tokens,
        cost: existing.cost + r.cost,
      });
    });
    const breakdownByProvider: TokenUsageBreakdown[] = Array.from(providerMap.entries()).map(([provider, data]) => ({
      provider,
      total_tokens: data.tokens,
      total_cost: data.cost,
    }));

    const response: TokenUsageResponse = {
      total_tokens: totalTokens,
      total_cost: totalCost,
      breakdown_by_agent: breakdownByAgent,
      breakdown_by_project: breakdownByProject,
      breakdown_by_model: breakdownByModel,
      breakdown_by_provider: breakdownByProvider,
      breakdown_by_day: breakdownByDay,
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (err) {
    console.error('Token usage GET error:', err);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
