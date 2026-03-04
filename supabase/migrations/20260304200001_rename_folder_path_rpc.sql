
-- Migration to cascade path updates to descendants
CREATE OR REPLACE FUNCTION public.rename_folder_path(
  p_old_path LTREE,
  p_new_path LTREE,
  p_folder_id UUID
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Update the folder itself (name is the last part of the path)
  UPDATE public.folders 
  SET name = split_part(p_new_path::text, '.', nlevel(p_new_path)), 
      path = p_new_path
  WHERE id = p_folder_id;

  -- Cascade to all descendants
  UPDATE public.folders
  SET path = p_new_path || subpath(path, nlevel(p_old_path))
  WHERE path <@ p_old_path AND id != p_folder_id;
END;
$$;
