import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api-errors';

const LTREE_LABEL_RE = /^[A-Za-z0-9_]+(\.[A-Za-z0-9_]+)*$/;

function validateLtreePath(path: string): boolean {
  return LTREE_LABEL_RE.test(path);
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return apiError('Unauthorized', 401);

    const { data, error } = await supabase
      .from('folders')
      .select('*')
      .eq('user_id', user.id)
      .order('path', { ascending: true });

    if (error) {
      console.error('Error fetching folders:', error);
      return apiError(error.message, 500);
    }
    return NextResponse.json(data);
  } catch (e) {
    return apiError('Internal server error', 500);
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return apiError('Unauthorized', 401);

    const { name, path } = await req.json();

    if (!name?.trim()) return apiError('name is required', 400);
    if (!path || !validateLtreePath(path)) {
      return apiError('path must be a valid ltree label (e.g. "root.sub")', 400);
    }

    const { data, error } = await supabase
      .from('folders')
      .insert([{ user_id: user.id, name: name.trim(), path }])
      .select()
      .single();

    if (error) {
      console.error('Error creating folder:', error);
      return apiError(error.message, 500);
    }
    return NextResponse.json(data);
  } catch (e) {
    return apiError('Internal server error', 500);
  }
}