import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { CommunityResponse } from '../../services/api';
import CommunityCard from '../common/CommunityCard';
import { Loader2, Users } from 'lucide-react';

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
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        </div>
      </div>

      {/* Content */}
      <div
        ref={containerRef}
        style={containerHeight ? { height: containerHeight } : undefined}
        className={`${containerHeight ? 'overflow-auto' : ''} px-4 py-4 space-y-3`}
      >
        {loading && items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Loading communities...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground text-center">No communities yet</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {items.map(c => (
                <CommunityCard
                  key={c.id}
                  community={c}
                  onClick={() => onCommunityClick ? onCommunityClick(c.id) : undefined}
                />
              ))}
            </div>
            <div className="pt-4 flex items-center justify-center">
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading...</span>
                </div>
              ) : !hasMore ? (
                <div className="text-xs text-muted-foreground">• End of list •</div>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CommunityList;
