import { createClient } from "@supabase/supabase-js";

// Browser-side Supabase client. Uses the public anon key - Storage bucket
// policies (set up in Supabase dashboard) control who can upload/read.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
);

const BUCKET = "materials-photos";

// Uploads a File to Supabase Storage and returns its public URL.
// folder e.g. "tasks/{taskId}" or "materials/{materialId}"
export async function uploadPhoto(file: File, folder: string): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
