import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { logActivity } from '@/lib/activity';

// Create a folder by creating a placeholder document
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { folderPath } = body;

  if (!folderPath) {
    return NextResponse.json({ error: 'folderPath is required' }, { status: 400 });
  }

  // Normalize path
  const normalizedPath = folderPath.replace(/\/$/, '');
  const placeholderPath = `${normalizedPath}/.keep`;

  try {
    // Check if folder already exists (has documents)
    const { data: existing } = await supabaseAdmin
      .from('documents')
      .select('id')
      .or(`path.eq.${normalizedPath},path.like.${normalizedPath}/%`)
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: 'Folder already exists' }, { status: 400 });
    }

    // Create placeholder document
    const category = normalizedPath.includes('/') ? normalizedPath.split('/')[0] : normalizedPath;
    const { error: insertError } = await supabaseAdmin
      .from('documents')
      .insert({
        path: placeholderPath,
        title: '.keep',
        content: '',
        category,
        type: 'folder_placeholder',
      });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Log activity
    await logActivity({
      action: 'folder_created',
      description: `Folder created: ${normalizedPath}`,
      agent: body.agent || 'user',
      metadata: { folderPath: normalizedPath },
    });

    return NextResponse.json({ success: true, folderPath: normalizedPath });
  } catch (error) {
    console.error('Error creating folder:', error);
    return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 });
  }
}

// Delete a folder and all documents inside
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const folderPath = searchParams.get('path');

  if (!folderPath) {
    return NextResponse.json({ error: 'path parameter is required' }, { status: 400 });
  }

  // Normalize path
  const normalizedPath = folderPath.replace(/\/$/, '');

  try {
    // Fetch all documents in the folder
    const { data: documents, error: fetchError } = await supabaseAdmin
      .from('documents')
      .select('id, path')
      .or(`path.eq.${normalizedPath},path.like.${normalizedPath}/%`);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!documents || documents.length === 0) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    // Soft delete all documents
    const { error: deleteError } = await supabaseAdmin
      .from('documents')
      .update({ deleted_at: new Date().toISOString() })
      .or(`path.eq.${normalizedPath},path.like.${normalizedPath}/%`);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // Log activity
    await logActivity({
      action: 'folder_deleted',
      description: `Folder deleted: ${normalizedPath}`,
      agent: 'user',
      metadata: { folderPath: normalizedPath, count: documents.length },
    });

    return NextResponse.json({
      success: true,
      deletedCount: documents.length,
    });
  } catch (error) {
    console.error('Error deleting folder:', error);
    return NextResponse.json({ error: 'Failed to delete folder' }, { status: 500 });
  }
}
