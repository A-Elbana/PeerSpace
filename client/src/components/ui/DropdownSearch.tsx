import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Search as SearchIcon } from 'lucide-react';

type Option = { value: string; label: string; subtitle?: string };

interface DropdownSearchProps {
  value?: string | null;
  options: Option[];
  onChange: (option: Option | null) => void;
  placeholder?: string;
  leftIcon?: React.ReactNode;
  className?: string;
  /** Maximum height of the options list in pixels. If omitted, a default CSS limit will apply. */
  maxHeight?: number;
  /** Called when the user scrolls near the end of the list and more items should be loaded. */
  onLoadMore?: () => void;
  /** Parent should set to true while loading more to avoid duplicate calls. */
  loadingMore?: boolean;
  /** Whether there are more items to load. */
  hasMore?: boolean;
  /** Threshold in px from bottom to trigger load (default 48). */
  threshold?: number;
}

const DropdownSearch: React.FC<DropdownSearchProps> = ({ value, options, onChange, placeholder = 'Select...', leftIcon, className = '', maxHeight }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  const selected = options.find(o => o.value === value) || null;

  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(query.toLowerCase()) || o.subtitle?.toLowerCase().includes(query.toLowerCase())
  );


  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(s => !s)}
        className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 hover:bg-muted rounded-lg text-sm transition-colors w-full"
      >
        {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
        <span className={`flex-1 text-left truncate ${selected ? 'text-foreground' : 'text-muted-foreground'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-full bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-muted/50 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
              />
            </div>
          </div>

          <div
            ref={listRef}
            className="overflow-y-auto"
            style={{ maxHeight: maxHeight ? `${maxHeight}px` : undefined }}
          >
            <button
              type="button"
              onClick={() => { onChange(null); setOpen(false); setQuery(''); }}
              className="w-full px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              No relation
            </button>

            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-muted-foreground">No results</div>
            ) : (
              filtered.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onChange(opt); setOpen(false); setQuery(''); }}
                  className={`w-full px-3 py-2 text-left hover:bg-muted/50 transition-colors ${value === opt.value ? 'bg-primary/10' : ''}`}
                >
                  <div className="text-sm font-medium truncate">{opt.label}</div>
                  {opt.subtitle && <div className="text-xs text-muted-foreground">{opt.subtitle}</div>}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DropdownSearch;
