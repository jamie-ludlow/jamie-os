import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Simple keyword parser for natural language edits (fallback if no AI API available)
function parseNaturalLanguageEdit(editText: string, currentSession: any) {
  const updates: any = {};
  const lowerText = editText.toLowerCase();

  // DETECT DELETION INTENT FIRST (before other parsing)
  // Keywords: "delete", "remove", "cancel", "skip", "drop" when referring to the session itself
  const deletionKeywords = /\b(delete|remove|cancel|skip|drop)\b/i;
  const sessionReferences = /\b(this|the)?\s*(session|workout|run)\b/i;
  
  if (deletionKeywords.test(lowerText) && sessionReferences.test(lowerText)) {
    return { _shouldDelete: true };
  }

  // Extract distance
  const distanceMatch = editText.match(/(\d+\.?\d*)\s*(mi|mile|km|k)/i);
  if (distanceMatch) {
    const value = parseFloat(distanceMatch[1]);
    const unit = distanceMatch[2].toLowerCase();
    if (unit.startsWith('mi')) {
      updates.distance_miles = value;
      updates.distance_km = value * 1.60934;
    } else {
      updates.distance_km = value;
      updates.distance_miles = value / 1.60934;
    }
  }

  // Extract session type
  if (lowerText.includes('easy')) updates.session_type = 'Easy';
  else if (lowerText.includes('tempo')) updates.session_type = 'Tempo';
  else if (lowerText.includes('long run')) updates.session_type = 'Long Run';
  else if (lowerText.includes('track')) updates.session_type = 'Track';
  else if (lowerText.includes('recovery')) updates.session_type = 'Recovery';
  else if (lowerText.includes('race')) updates.session_type = 'Race';
  else if (lowerText.includes('rest')) updates.session_type = 'Rest';
  else if (lowerText.includes('marathon pace') || lowerText.includes('mp')) updates.session_type = 'Marathon Pace';

  // Extract pace
  const paceMatch = editText.match(/(\d+:\d+)\/?(km|mi|k|m)?/i);
  if (paceMatch) {
    updates.pace = paceMatch[1] + (paceMatch[2] ? '/' + paceMatch[2].toLowerCase() : '/km');
  }

  // If the edit text is just a note/comment, keep it in notes
  if (Object.keys(updates).length === 0) {
    updates.notes = editText;
  }

  return updates;
}

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const body = await request.json();
    const { id } = params;

    let updates: any = {};

    // If natural language edit, parse it
    if (body.edit_text) {
      // First, get the current session
      const { data: currentSession } = await supabaseAdmin
        .from('training_sessions')
        .select('*')
        .eq('id', id)
        .single();

      if (!currentSession) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }

      updates = parseNaturalLanguageEdit(body.edit_text, currentSession);
      
      // Check for deletion intent
      if (updates._shouldDelete) {
        const { error } = await supabaseAdmin
          .from('training_sessions')
          .delete()
          .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ deleted: true, message: 'Session deleted' });
      }
      
      updates.edited_by = 'user';
      updates.adjustment_reason = `User edit: "${body.edit_text}"`;
    } else {
      // Direct structured edit
      const { distance_miles, distance_km, pace, notes, session_type } = body;
      
      if (distance_miles !== undefined) updates.distance_miles = distance_miles;
      if (distance_km !== undefined) updates.distance_km = distance_km;
      if (pace !== undefined) updates.pace = pace;
      if (notes !== undefined) updates.notes = notes;
      if (session_type !== undefined) updates.session_type = session_type;
      
      updates.edited_by = 'user';
    }

    updates.edited_at = new Date().toISOString();
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('training_sessions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ session: data });
  } catch (error) {
    console.error('Update session error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const { id } = params;

    const { error } = await supabaseAdmin
      .from('training_sessions')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ deleted: true, message: 'Session deleted' });
  } catch (error) {
    console.error('Delete session error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
