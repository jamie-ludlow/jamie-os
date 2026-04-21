import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { logActivity } from '@/lib/activity';

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { oldPath, newPath } = body;

  if (!oldPath || !newPath) {
    return NextResponse.json(
      { error: 'oldPath and newPath are required' },
      { status: 400 }
    );
  }

  // Normalize paths: ensure no trailing slashes
  const normalizedOldPath = oldPath.replace(/\/$/, '');
  const normalizedNewPath = newPath.replace(/\/$/, '');

  try {
    // Fetch all documents whose path starts with the old folder path
    const { data: documents, error: fetchError } = await supabaseAdmin
      .from('documents')
      .select('id, path, title, category')
      .or(`path.eq.${normalizedOldPath},path.like.${normalizedOldPath}/%`);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!documents || documents.length === 0) {
      return NextResponse.json({ error: 'No documents found in folder' }, { status: 404 });
    }

    // Update each document's path
    const updates = documents.map((doc) => {
      let updatedPath = doc.path;
      if (doc.path === normalizedOldPath) {
        updatedPath = normalizedNewPath;
      } else if (doc.path.startsWith(`${normalizedOldPath}/`)) {
        updatedPath = doc.path.replace(normalizedOldPath, normalizedNewPath);
      }

      const updatedCategory = updatedPath.includes('/')
        ? updatedPath.split('/')[0]
        : 'general';

      return {
        id: doc.id,
        path: updatedPath,
        category: updatedCategory,
        updated_at: new Date().toISOString(),
      };
    });

    // Perform batch update
    const { error: updateError } = await supabaseAdmin
      .from('documents')
      .upsert(updates, { onConflict: 'id' });

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Log activity
    await logActivity({
      action: 'folder_renamed',
      description: `Folder renamed from "${normalizedOldPath}" to "${normalizedNewPath}"`,
      agent: body.agent || 'user',
      metadata: { oldPath: normalizedOldPath, newPath: normalizedNewPath, count: updates.length },
    });

    return NextResponse.json({
      success: true,
      updatedCount: updates.length,
    });
  } catch (error) {
    console.error('Error renaming folder:', error);
    return NextResponse.json(
      { error: 'Failed to rename folder' },
      { status: 500 }
    );
  }
}
