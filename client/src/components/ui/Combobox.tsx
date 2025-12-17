import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Search as SearchIcon, X } from 'lucide-react';

type ComboboxOption = { value: string; label: string; subtitle?: string };

interface ComboboxProps {
  value?: string | null;
  options: ComboboxOption[];
  onChange: (option: ComboboxOption | null) => void;
  onSearchChange: (query: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  isLoading?: boolean;
  className?: string;
  maxHeight?: number;
  clearable?: boolean;
}

const Combobox: React.FC<ComboboxProps> = ({
  value,
  options,
  onChange,
  onSearchChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  isLoading = false,
  className = '',
  maxHeight = 300,
  clearable = true,
}) => {
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
    o.label.toLowerCase().includes(query.toLowerCase()) ||
    o.value.toLowerCase().includes(query.toLowerCase()) ||
    o.subtitle?.toLowerCase().includes(query.toLowerCase())
  );

  const handleSearchChange = (newQuery: string) => {
    setQuery(newQuery);
    onSearchChange(newQuery);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setQuery('');
    onSearchChange('');
  };

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(s => !s)}
        className="flex items-center gap-2 px-3 py-2 bg-card border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring w-full hover:border-border transition-colors"
      >
        <span className={`flex-1 text-left truncate ${selected ? 'text-foreground' : 'text-muted-foreground'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <div className="flex items-center gap-1">
          {clearable && selected && (
            <X
              className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-pointer"
              onClick={handleClear}
            />
          )}
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-full bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={query}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-muted/50 border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
              />
            </div>
          </div>

          <div
            ref={listRef}
            className="overflow-y-auto"
            style={{ maxHeight: `${maxHeight}px` }}
          >
            {isLoading ? (
              <div className="px-3 py-4 text-center text-sm text-muted-foreground">Loading...</div>
            ) : filtered.length === 0 && !query ? (
              <div className="px-3 py-4 text-center text-sm text-muted-foreground">Type to search...</div>
            ) : filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-muted-foreground">No results found</div>
            ) : (
              filtered.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt);
                    setOpen(false);
                    setQuery('');
                  }}
                  className={`w-full px-3 py-2 text-left hover:bg-muted/50 transition-colors ${
                    value === opt.value ? 'bg-primary/10 border-l-2 border-primary' : ''
                  }`}
                >
                  <div className="text-sm font-medium truncate">{opt.label}</div>
                  {opt.subtitle && <div className="text-xs text-muted-foreground truncate">{opt.subtitle}</div>}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Combobox;
