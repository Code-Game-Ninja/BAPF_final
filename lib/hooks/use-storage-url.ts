import useSWR from "swr";
import { supabase } from "@/lib/supabase/client";

/**
 * Resolves a Supabase storage path to a temporary signed download URL.
 * Returns { url, isLoading, error }.
 */
export function useStorageUrl(filePath: string | null | undefined) {
  const { data, isLoading, error } = useSWR(
    filePath?.trim() ? `storage-url:${filePath}` : null,
    async () => {
      if (!filePath) return null;
      if (/^https?:\/\//i.test(filePath)) return filePath;

      let bucket = "documents";
      let path = filePath;

      if (filePath.startsWith("documents/")) {
        bucket = "documents";
        path = filePath.slice("documents/".length);
      } else if (filePath.startsWith("policies/")) {
        bucket = "policy-documents";
        path = filePath.slice("policies/".length);
      } else if (filePath.startsWith("profiles/")) {
        bucket = "avatars";
        path = filePath.slice("profiles/".length);
      }

      const { data: signed, error: signedError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 60 * 60);

      if (signedError) throw signedError;
      return signed?.signedUrl ?? null;
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 300_000,
      shouldRetryOnError: false,
      errorRetryCount: 0,
    }
  );

  return { url: data ?? null, isLoading, error };
}
