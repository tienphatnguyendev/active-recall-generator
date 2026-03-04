import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api-errors';

const LTREE_LABEL_RE = /^[A-Za-z0-9_]+(\.[A-Za-z0-9_]+)*$/;

function validateLtreePath(path: string): boolean {
  return LTREE_LABEL_RE.test(path);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return apiError('Unauthorized', 401);

    const id = (await params).id;
    const { name, path: newPath } = await req.json();

    if (newPath) {
      if (!validateLtreePath(newPath)) return apiError('Invalid ltree path', 400);

      // Fetch current path first to check ownership and cascade
      const { data: folder, error: fetchError } = await supabase
        .from('folders').select('path, user_id').eq('id', id).single();

      if (fetchError || !folder) return apiError('Folder not found', 404);
      if (folder.user_id !== user.id) return apiError('Unauthorized', 403);

      const oldPath = folder.path;

      // Cascade rewrite all descendants using raw SQL via RPC
      const { error: cascadeError } = await supabase.rpc('rename_folder_path', {
        p_old_path: oldPath,
        p_new_path: newPath,
        p_folder_id: id,
      });
      
      if (cascadeError) {
        console.error('Error cascading path update:', cascadeError);
        return apiError('Failed to update folder path', 500);
      }
      
      return NextResponse.json({ success: true, path: newPath });
    }

    // Just update name if path not provided
    if (!name?.trim()) return apiError('name or path is required', 400);

    const { data, error } = await supabase
      .from('folders')
      .update({ name: name.trim() })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating folder:', error);
      return apiError(error.message, 500);
    }
    return NextResponse.json(data);
  } catch (e) {
    return apiError('Internal server error', 500);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return apiError('Unauthorized', 401);

    const id = (await params).id;

    const { error } = await supabase
      .from('folders')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting folder:', error);
      return apiError(error.message, 500);
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    return apiError('Internal server error', 500);
  }
}