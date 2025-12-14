import { useEffect, useState } from "react";
import api from "@/services/api";

const cache = new Map<string, string | null>();

const isHttpUrl = (value?: string | null) =>
  !!value && (value.startsWith("http://") || value.startsWith("https://"));

/**
 * Resolve a file reference (direct URL or File id) to a usable URL, with simple in-memory caching.
 */
export function useResolvedFileUrl(fileRef?: string | null) {
  const [url, setUrl] = useState<string | null>(() => {
    if (isHttpUrl(fileRef)) return fileRef as string;
    if (fileRef && cache.has(fileRef)) return cache.get(fileRef) ?? null;
    return null;
  });

  useEffect(() => {
    let isMounted = true;

    if (!fileRef) {
      setUrl(null);
      return () => {
        isMounted = false;
      };
    }

    if (isHttpUrl(fileRef)) {
      setUrl(fileRef);
      return () => {
        isMounted = false;
      };
    }

    const cached = cache.get(fileRef);
    if (cached !== undefined) {
      setUrl(cached);
      return () => {
        isMounted = false;
      };
    }

    (async () => {
      try {
        const res = await api.get(`/files/${fileRef}`);
        const file = res.data?.data;
        const resolved = file?.signed_url || file?.secure_url || null;
        cache.set(fileRef, resolved);
        if (isMounted) setUrl(resolved);
      } catch {
        cache.set(fileRef, null);
        if (isMounted) setUrl(null);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [fileRef]);

  return url;
}
