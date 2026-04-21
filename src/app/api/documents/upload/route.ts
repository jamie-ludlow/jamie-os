import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { logActivity } from '@/lib/activity';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    }

    // Validate file type
    const allowedExtensions = ['.md', '.txt', '.pdf', '.png', '.jpg', '.jpeg', '.csv'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      return NextResponse.json({ error: `File type ${ext} not allowed` }, { status: 400 });
    }

    // Upload to Supabase Storage
    const timestamp = Date.now();
    const storagePath = `uploads/${timestamp}-${file.name}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabaseAdmin.storage
      .from('documents')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('documents')
      .getPublicUrl(storagePath);

    const fileUrl = urlData.publicUrl;

    // Store metadata in documents table using content as JSON for file metadata
    const metadata = JSON.stringify({
      file_url: fileUrl,
      file_size: file.size,
      file_type: file.type,
      original_name: file.name,
      storage_path: storagePath,
    });

    const path = `files/${file.name}`;
    const { error: dbError } = await supabaseAdmin
      .from('documents')
      .upsert(
        {
          path,
          title: file.name,
          content: metadata,
          category: 'files',
          type: 'file',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'path' }
      );

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    await logActivity({
      action: 'file_uploaded',
      description: `File uploaded: ${file.name}`,
      agent: 'user',
      metadata: { path, file_url: fileUrl, file_size: file.size },
    });

    return NextResponse.json({
      success: true,
      path,
      file_url: fileUrl,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
    }, { status: 201 });
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
