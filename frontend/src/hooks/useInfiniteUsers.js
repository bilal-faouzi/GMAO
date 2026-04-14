// hooks/useInfiniteUsers.js
import { useState, useCallback, useRef } from "react";
import { getUtilisateurs } from "@/services/securiteService";

export const useInfiniteUsers = () => {
  const [users, setUsers] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const pageRef = useRef(1);
  const loadingRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const res = await getUtilisateurs({
        page: pageRef.current,
        page_size: 10,
      });
      const { results, total_pages } = res.data;
      setUsers((prev) => [...prev, ...results]);
      setHasMore(pageRef.current < total_pages);
      pageRef.current += 1;
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [hasMore]);

  const reset = useCallback(() => {
    setUsers([]);
    setHasMore(true);
    pageRef.current = 1;
    loadingRef.current = false;
  }, []);

  return { users, hasMore, loading, loadMore, reset };
};
