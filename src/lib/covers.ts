import { supabase } from "@/integrations/supabase/client";

/**
 * Fetch one preview photo per folder (event) id.
 * Runs a small limited query per folder so folders are never missed because of
 * a global row cap, and resolves to a map of eventId -> preview_path.
 */
export async function fetchFolderCovers(ids: string[]): Promise<Record<string, string>> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  const map: Record<string, string> = {};
  const concurrency = 8;
  let index = 0;

  async function worker() {
    while (index < unique.length) {
      const id = unique[index++]!;
      const { data } = await supabase
        .from("photos")
        .select("preview_path")
        .eq("event_id", id)
        .order("created_at", { ascending: true })
        .limit(1);
      const path = data?.[0]?.preview_path;
      if (path) map[id] = path;
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, unique.length) }, () => worker()),
  );
  return map;
}

/**
 * Resolve the images to show on a folder tile: the folder's own photo first,
 * then a photo from each of its subfolders.
 */
export function tilePathsFor(
  eventId: string,
  childIds: string[],
  covers: Record<string, string>,
  max = 4,
): string[] {
  const paths: string[] = [];
  const own = covers[eventId];
  if (own) paths.push(own);
  for (const childId of childIds) {
    const p = covers[childId];
    if (p && !paths.includes(p)) paths.push(p);
    if (paths.length >= max) break;
  }
  return paths.slice(0, max);
}
