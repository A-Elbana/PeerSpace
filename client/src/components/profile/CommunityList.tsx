import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { CommunityResponse } from '../../services/api';
import CommunityCard from '../common/CommunityCard';
import { Loader2 } from 'lucide-react';

interface FetchResult {
  data: CommunityResponse[];
  meta?: { page?: number; totalPages?: number };
}

interface Props {
  title?: string;
  fetcher: (page: number, limit: number) => Promise<FetchResult>;
  pageSize?: number;
  containerHeight?: number; // px; when provided, render scrollable container
  onCommunityClick?: (id: string) => void;
}

const CommunityList: React.FC<Props> = ({ title = 'Communities', fetcher, pageSize = 9, containerHeight = 384, onCommunityClick }) => {
  const [items, setItems] = useState<CommunityResponse[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollDebounceRef = useRef<number | null>(null);

  const loadPage = useCallback(async (p: number) => {
    try {
      setLoading(true);
      const res = await fetcher(p, pageSize);
      const list = res?.data ?? [];
      if (p === 1) setItems(list);
      else setItems(prev => [...prev, ...list]);
      const totalPages = res?.meta?.totalPages;
      if (typeof totalPages === 'number') setHasMore(p < totalPages);
      else setHasMore(list.length === pageSize);
      setPage(p);
    } catch (err) {
      console.error('CommunityList load error', err);
    } finally {
      setLoading(false);
    }
  }, [fetcher, pageSize]);

  useEffect(() => { void loadPage(1); }, [loadPage]);

  useEffect(() => {
    const onScroll = () => {
      if (scrollDebounceRef.current) window.clearTimeout(scrollDebounceRef.current);
      scrollDebounceRef.current = window.setTimeout(() => {
        const el = containerRef.current;
        let shouldLoad = false;

        if (containerHeight && el) {
          // scrolling inside the container
          shouldLoad = el.scrollTop + el.clientHeight >= el.scrollHeight - 100;
        } else {
          // window/document scrolling
          shouldLoad = window.innerHeight + window.scrollY >= document.body.offsetHeight - 300;
        }

        if (shouldLoad && !loading && hasMore) {
          void loadPage(page + 1);
        }
      }, 500);
    };

    const el = containerRef.current;

    if (containerHeight && el) {
      el.addEventListener('scroll', onScroll);
    } else {
      window.addEventListener('scroll', onScroll);
    }

    return () => {
      if (containerHeight && el) {
        el.removeEventListener('scroll', onScroll);
      } else {
        window.removeEventListener('scroll', onScroll);
      }
      if (scrollDebounceRef.current) {
        window.clearTimeout(scrollDebounceRef.current);
        scrollDebounceRef.current = null;
      }
    };
  }, [loadPage, loading, hasMore, page, containerHeight]);

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <h3 className="text-lg font-semibold mb-3">{title}</h3>
      <div ref={containerRef} style={containerHeight ? { height: containerHeight } : undefined} className={containerHeight ? 'overflow-auto' : ''}>
        {loading && items.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground">No communities yet.</div>
        ) : (
          <div className="space-y-2">
            {items.map(c => (
              <CommunityCard key={c.id} community={c} onClick={() => onCommunityClick ? onCommunityClick(c.id) : undefined} />
            ))}
            <div className="pt-3 flex items-center justify-center">
              {loading ? (
                <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
              ) : !hasMore ? (
                <div className="text-xs text-muted-foreground">No more communities</div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunityList;
