import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const week = searchParams.get('week');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    let query = supabaseAdmin
      .from('training_sessions')
      .select('*')
      .order('date', { ascending: true });

    if (week) {
      query = query.eq('week_number', parseInt(week));
    }

    if (from && to) {
      query = query.gte('date', from).lte('date', to);
    } else if (from) {
      query = query.gte('date', from);
    } else if (to) {
      query = query.lte('date', to);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ sessions: data || [] });
  } catch (error) {
    console.error('Get sessions error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
