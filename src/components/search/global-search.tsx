'use client';

import { useCallback, useEffect, useMemo, useState, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import {
  ListChecks,
  FolderKanban,
  FileText,
  ClipboardList,
  Target,
  Scroll,
  Clock,
  Plus,
  LayoutDashboard,
  Columns3,
  CalendarDays,
  Users,
  Palette,
  Settings,
  Search,
  ShieldCheck,
} from 'lucide-react';

type ResultType = 'task' | 'project' | 'document' | 'sop' | 'goal';

interface SearchResult {
  type: ResultType;
  id: string;
  title: string;
  snippet: string;
  meta: string | null;
  link: string;
}

const TYPE_CONFIG: Record<ResultType, { label: string; emoji: string; icon: typeof ListChecks }> = {
  task: { label: 'Tasks', emoji: '🗂️', icon: ListChecks },
  project: { label: 'Projects', emoji: '📁', icon: FolderKanban },
  document: { label: 'Documents', emoji: '📄', icon: FileText },
  sop: { label: 'SOPs', emoji: '📋', icon: ClipboardList },
  goal: { label: 'Goals', emoji: '🎯', icon: Target },
  // changelog removed
};

const TYPE_ORDER: ResultType[] = ['task', 'project', 'document', 'sop', 'goal'];

const NAVIGATION_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/board', label: 'Board', icon: Columns3 },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/documents', label: 'Documents', icon: FileText },
  { href: '/control-center', label: 'OpenClaw Control', icon: ShieldCheck },
  { href: '/goals', label: 'Goals', icon: Target },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/agents', label: 'Agents', icon: Users },
  { href: '/palettes', label: 'Palettes', icon: Palette },
];

const QUICK_ACTIONS = [
  { id: 'new-task', label: 'New task', icon: Plus, action: 'new-task' },
  { id: 'new-project', label: 'New project', icon: Plus, action: 'new-project' },
  { id: 'new-document', label: 'New document', icon: Plus, action: 'new-document' },
];

const RECENT_KEY = 'mc-recent-searches';
const HISTORY_ENABLED_KEY = 'mc-search-history-enabled';

function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]').slice(0, 5);
  } catch {
    return [];
  }
}

function isHistoryEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const value = localStorage.getItem(HISTORY_ENABLED_KEY);
    return value === null ? true : value === 'true';
  } catch {
    return true;
  }
}

function saveRecentSearch(query: string) {
  if (!isHistoryEnabled()) return;
  const recent = getRecentSearches().filter((s) => s !== query);
  recent.unshift(query);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, 5)));
}

function clearRecentSearches() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(RECENT_KEY);
}

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-primary/20 text-foreground rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        )
      )}
    </>
  );
}

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [historyEnabled, setHistoryEnabled] = useState(true);

  const runSearch = useCallback(async (value: string) => {
    if (!value.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(value.trim())}`);
      const data = await res.json();
      setResults(data.results || []);
    } catch {
      setResults([]);
    }
    setLoading(false);
  }, []);

  // Cmd+K shortcut
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Debounced search (300ms)
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => runSearch(query), 300);
    return () => clearTimeout(timer);
  }, [query, runSearch, open]);

  // Load recent searches and preference when opening, reset on close
  useEffect(() => {
    if (open) {
      setRecentSearches(getRecentSearches());
      setHistoryEnabled(isHistoryEnabled());
    } else {
      setQuery('');
      setResults([]);
    }
  }, [open]);

  const handleClearRecent = useCallback(() => {
    clearRecentSearches();
    setRecentSearches([]);
  }, []);

  const handleToggleHistory = useCallback((enabled: boolean) => {
    setHistoryEnabled(enabled);
    localStorage.setItem(HISTORY_ENABLED_KEY, String(enabled));
    if (!enabled) {
      clearRecentSearches();
      setRecentSearches([]);
    }
  }, []);

  const grouped = useMemo(() => {
    const groups: Partial<Record<ResultType, SearchResult[]>> = {};
    for (const r of results) {
      (groups[r.type] ??= []).push(r);
    }
    return groups;
  }, [results]);

  const handleNavigate = useCallback((path: string) => {
    if (query.trim()) saveRecentSearch(query.trim());
    setOpen(false);
    router.push(path);
  }, [query, router]);

  const handleAction = useCallback((action: string) => {
    setOpen(false);
    if (action === 'new-task') {
      router.push('/board?action=new-task');
    } else if (action === 'new-project') {
      router.push('/projects?action=new-project');
    } else if (action === 'new-document') {
      router.push('/documents?new=true');
    }
  }, [router]);

  const filteredNavigation = useMemo(() => {
    if (!query) return [];
    return NAVIGATION_ITEMS.filter((item) =>
      item.label.toLowerCase().includes(query.toLowerCase())
    );
  }, [query]);

  const filteredActions = useMemo(() => {
    if (!query) return QUICK_ACTIONS;
    return QUICK_ACTIONS.filter((item) =>
      item.label.toLowerCase().includes(query.toLowerCase())
    );
  }, [query]);

  const showRecent = !query.trim() && recentSearches.length > 0 && historyEnabled;
  const hasResults = results.length > 0;
  const isSearching = query.trim().length > 0;

  return (
    <>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
        <button
          onClick={() => setOpen(true)}
          className="h-8 w-48 pl-8 pr-10 text-[13px] text-left bg-secondary border border-border/20 rounded-lg outline-none cursor-pointer hover:border-primary/30 transition-colors duration-150 text-muted-foreground/40"
        >
          Search...
        </button>
        <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 pointer-events-none">
          <span className="text-[10px] font-medium text-muted-foreground/40">⌘K</span>
        </kbd>
      </div>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        shouldFilter={false}
        title="Search"
        description="Search across tasks, projects, documents, SOPs, and goals"
        showCloseButton={false}
      >
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder="Search tasks, projects, docs..."
        />
        <CommandList className="max-h-[420px]">
          {/* Empty state when searching */}
          {isSearching && !loading && !hasResults && filteredNavigation.length === 0 && filteredActions.length === 0 && (
            <CommandEmpty>No results found.</CommandEmpty>
          )}

          {/* Loading */}
          {loading && isSearching && (
            <div className="py-6 text-center text-[13px] text-muted-foreground">Searching…</div>
          )}

          {/* Recent searches */}
          {showRecent && (
            <CommandGroup heading={
              <div className="flex items-center justify-between">
                <span>Recent Searches</span>
                <button
                  onClick={handleClearRecent}
                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors duration-150"
                >
                  Clear all
                </button>
              </div>
            }>
              {recentSearches.map((term) => (
                <CommandItem key={term} onSelect={() => setQuery(term)}>
                  <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>{term}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Quick actions (always show when no query, or if matching) */}
          {filteredActions.length > 0 && (
            <>
              <CommandGroup heading="Quick Actions">
                {filteredActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <CommandItem
                      key={action.id}
                      onSelect={() => handleAction(action.action)}
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      <span>{action.label}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
              {(hasResults || filteredNavigation.length > 0) && <CommandSeparator />}
            </>
          )}

          {/* Navigation (show when no query or when matching) */}
          {!isSearching && (
            <>
              <CommandGroup heading="Navigate">
                {NAVIGATION_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <CommandItem
                      key={item.href}
                      onSelect={() => handleNavigate(item.href)}
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      <span>{item.label}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </>
          )}

          {/* Filtered navigation when searching */}
          {isSearching && filteredNavigation.length > 0 && (
            <>
              <CommandGroup heading="Navigate">
                {filteredNavigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <CommandItem
                      key={item.href}
                      onSelect={() => handleNavigate(item.href)}
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      <span>{item.label}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
              {hasResults && <CommandSeparator />}
            </>
          )}

          {/* Search results grouped by type */}
          {!loading && TYPE_ORDER.map((type, i) => {
            const items = grouped[type];
            if (!items?.length) return null;
            const config = TYPE_CONFIG[type];
            const Icon = config.icon;
            return (
              <Fragment key={type}>
                {i > 0 && Object.keys(grouped).indexOf(type) > 0 && <CommandSeparator />}
                <CommandGroup heading={`${config.emoji} ${config.label}`}>
                  {items.map((item) => (
                    <CommandItem
                      key={`${item.type}-${item.id}`}
                      onSelect={() => handleNavigate(item.link)}
                      className="flex items-start gap-2"
                    >
                      <Icon className="mr-2 h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="truncate">
                          <HighlightText text={item.title} query={query} />
                        </span>
                        {item.snippet && (
                          <span className="text-[11px] text-muted-foreground line-clamp-1">
                            <HighlightText text={item.snippet} query={query} />
                          </span>
                        )}
                      </div>
                      {item.meta && (
                        <Badge variant="outline" className="text-[10px] capitalize shrink-0 self-center">
                          {item.meta}
                        </Badge>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Fragment>
            );
          })}

          {/* Hint removed */}
        </CommandList>
        <div className="flex items-center justify-between border-t border-border/20 px-4 py-2 bg-muted/20">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleToggleHistory(!historyEnabled)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-150 ${
                historyEnabled ? 'bg-primary' : 'bg-muted-foreground/20'
              }`}
              role="switch"
              aria-checked={historyEnabled}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform duration-150 ${
                  historyEnabled ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
            <span className="text-[12px] text-muted-foreground">Save search history</span>
          </div>
          <div className="text-[11px] text-muted-foreground/40">
            ↑↓ to navigate · ↵ to select
          </div>
        </div>
      </CommandDialog>
    </>
  );
}
