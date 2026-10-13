"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  defaultSearchFilters,
  readSearchFilters,
  searchFilterUrl,
  type SearchFilters,
} from "./search-state";

export function useSearchFilters() {
  const [filters, setFilters] = useState(defaultSearchFilters);
  const current = useRef(defaultSearchFilters);
  useEffect(() => {
    const restore = () => {
      const next = readSearchFilters(window.location.search);
      current.current = next;
      setFilters(next);
    };
    restore();
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);
  const updateFilters = useCallback(
    (patch: Partial<SearchFilters>, replace = false) => {
      const next = { ...current.current, ...patch };
      current.current = next;
      setFilters(next);
      const url = searchFilterUrl(window.location.href, next);
      if (
        url !==
        window.location.pathname + window.location.search + window.location.hash
      ) {
        if (replace) window.history.replaceState(window.history.state, "", url);
        else window.history.pushState(window.history.state, "", url);
      }
    },
    [],
  );
  return { filters, updateFilters };
}
