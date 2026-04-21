import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    // Create the table using a series of operations
    // Since we can't execute raw SQL, we'll use the REST API to create records
    // But first, check if any statuses already exist
    const { data: existing } = await supabase
      .from('task_statuses')
      .select('id')
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json({ 
        message: 'Migration already applied', 
        status: 'skipped' 
      });
    }

    // If we get here without error, table exists but is empty
    // Insert default statuses (using hex values for dot_colour for theme consistency)
    const { error: insertError } = await supabase
      .from('task_statuses')
      .insert([
        { slug: 'todo', label: 'To Do', colour: '#f59e0b', dot_colour: '#f59e0b', sort_order: 0, is_default: true },
        { slug: 'doing', label: 'In Progress', colour: '#a855f7', dot_colour: '#a855f7', sort_order: 1, is_default: false },
        { slug: 'review', label: 'Review', colour: '#3b82f6', dot_colour: '#3b82f6', sort_order: 2, is_default: false },
        { slug: 'done', label: 'Done', colour: '#22c55e', dot_colour: '#22c55e', sort_order: 3, is_default: true },
      ]);

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Default statuses created successfully', 
      status: 'success' 
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // If table doesn't exist, provide SQL to run manually
    if (errorMessage.includes('task_statuses')) {
      return NextResponse.json({
        error: 'Table does not exist',
        message: 'Please run the following SQL in Supabase Dashboard SQL Editor:',
        sql: `
CREATE TABLE IF NOT EXISTS task_statuses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  label text NOT NULL,
  colour text NOT NULL,
  dot_colour text,
  sort_order integer NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Use hex values for dot_colour for theme consistency
INSERT INTO task_statuses (slug, label, colour, dot_colour, sort_order, is_default) VALUES
  ('todo', 'To Do', '#f59e0b', '#f59e0b', 0, true),
  ('doing', 'In Progress', '#a855f7', '#a855f7', 1, false),
  ('review', 'Review', '#3b82f6', '#3b82f6', 2, false),
  ('done', 'Done', '#22c55e', '#22c55e', 3, true)
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE task_statuses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON task_statuses;
CREATE POLICY "Service role full access" ON task_statuses FOR ALL USING (true) WITH CHECK (true);
        `.trim()
      }, { status: 400 });
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
