"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function deleteArtifact(id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("artifacts")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to delete artifact: ${error.message}`);
  }

  // Revalidate the pages that display artifacts
  revalidatePath("/artifacts");
  revalidatePath("/study");
}

export async function revalidateArtifacts() {
  revalidatePath("/artifacts");
}
