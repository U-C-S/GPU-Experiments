import { useEffect, useState } from "react";
import { getPageFromHash } from "../routing";
import type { PageKey } from "../routing";

export function useHashPage() {
  const [page, setPage] = useState<PageKey>(() => getPageFromHash());

  useEffect(() => {
    const handleHashChange = () => setPage(getPageFromHash());
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  return page;
}
