"use client";

import { useRef, useCallback, useEffect } from "react";

/**
 * Custom hook to track and automatically revoke Object URLs on:
 * 1. Component unmount
 * 2. File clear / tool reset
 * 3. Specific URL disposal
 */
export function useObjectUrls() {
  const urlsRef = useRef<Set<string>>(new Set());

  const createTrackedUrl = useCallback((blob: Blob | MediaSource): string => {
    const url = URL.createObjectURL(blob);
    urlsRef.current.add(url);
    return url;
  }, []);

  const revokeUrl = useCallback((url?: string | null) => {
    if (!url) return;
    if (urlsRef.current.has(url)) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
      urlsRef.current.delete(url);
    }
  }, []);

  const revokeAll = useCallback(() => {
    urlsRef.current.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
    });
    urlsRef.current.clear();
  }, []);

  useEffect(() => {
    const urls = urlsRef.current;
    return () => {
      urls.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // ignore
        }
      });
      urls.clear();
    };
  }, []);

  return { createTrackedUrl, revokeUrl, revokeAll };
}
