import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  PlusIcon,
  TrashIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  FileIcon,
  StarIcon,
  LogOutIcon,
  SearchIcon,
  SunIcon,
  MoonIcon,
  Spinner
} from './Icons';

interface PageSummary {
  id: string;
  title: string;
  icon: string | null;
  parentId: string | null;
  isFavorite: boolean;
}

interface SearchResult {
  id: string;
  title: string;
  icon: string | null;
  parentId: string | null;
  matchType: 'title' | 'content';
  snippet: string;
}

interface SidebarProps {
  pages: PageSummary[];
  currentPageId: string | null;
  onSelectPage: (id: string) => void;
  onCreatePage: (parentId: string | null) => Promise<void>;
  onToggleFavorite: (id: string, isFav: boolean) => Promise<void>;
  onArchivePage: (id: string) => Promise<void>;
  onRestorePage: (id: string) => Promise<void>;
  onDeletePage: (id: string) => Promise<void>;
  loadingPages: boolean;
}

// Inline restore icon
const RestoreIcon = ({ size = 14 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"></polyline>
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
  </svg>
);

export const Sidebar: React.FC<SidebarProps> = ({
  pages,
  currentPageId,
  onSelectPage,
  onCreatePage,
  onToggleFavorite,
  onArchivePage,
  onRestorePage,
  onDeletePage,
  loadingPages
}) => {
  const { user, logout } = useAuth();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchingLoading, setSearchingLoading] = useState(false);

  const [isTrashExpanded, setIsTrashExpanded] = useState(false);
  const [archivedPages, setArchivedPages] = useState<PageSummary[]>([]);
  const [loadingArchived, setLoadingArchived] = useState(false);

  const [expandedPages, setExpandedPages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedPages(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Group pages by parentId
  const pagesByParent = React.useMemo(() => {
    const map: Record<string, PageSummary[]> = {};
    pages.forEach(p => {
      const key = p.parentId || 'root';
      if (!map[key]) map[key] = [];
      map[key].push(p);
    });
    return map;
  }, [pages]);

  const rootPages = pagesByParent['root'] || [];
  const favoritePages = pages.filter(p => p.isFavorite);

  // Debounced search logic
  const searchTimeout = useRef<any>(null);
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setSearchingLoading(true);

    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/pages/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch (err) {
        console.error('Search query failed:', err);
      } finally {
        setSearchingLoading(false);
      }
    }, 400); // 400ms debounce
  }, [searchQuery]);

  // Load archived pages when trash is toggled
  const fetchArchived = async () => {
    setLoadingArchived(true);
    try {
      const res = await fetch('/api/pages/archived');
      if (res.ok) {
        const data = await res.json();
        setArchivedPages(data);
      }
    } catch (err) {
      console.error('Archived fetch error:', err);
    } finally {
      setLoadingArchived(false);
    }
  };

  useEffect(() => {
    if (isTrashExpanded) {
      fetchArchived();
    }
  }, [isTrashExpanded]);

  const handleRestoreClick = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await onRestorePage(id);
    // Reload archived pages
    fetchArchived();
  };

  const handleDeleteClick = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Permanently delete this page? This cannot be undone.')) {
      await onDeletePage(id);
      fetchArchived();
    }
  };

  const renderPageItem = (page: PageSummary, depth: number = 0) => {
    const hasChildren = !!pagesByParent[page.id]?.length;
    const isExpanded = expandedPages[page.id];
    const isActive = page.id === currentPageId;

    return (
      <div key={page.id} style={{ display: 'flex', flexDirection: 'column' }}>
        <div
          onClick={() => onSelectPage(page.id)}
          style={{ paddingLeft: `${depth * 12 + 10}px` }}
          className={`sidebar-item sidebar-page-item ${isActive ? 'active' : ''}`}
        >
          <button
            onClick={(e) => {
              toggleExpand(page.id, e);
              if (!isExpanded) {
                setExpandedPages(prev => ({ ...prev, [page.id]: true }));
              }
            }}
            style={{ visibility: hasChildren ? 'visible' : 'hidden' }}
            className="sidebar-icon-btn"
          >
            {isExpanded ? <ChevronDownIcon size={14} /> : <ChevronRightIcon size={14} />}
          </button>

          <span className="sidebar-page-icon-emoji">
            {page.icon ? page.icon : <FileIcon size={14} style={{ color: 'var(--text-secondary)' }} />}
          </span>

          <span className="sidebar-page-title-text">
            {page.title || 'Untitled'}
          </span>

          <div className="item-actions sidebar-page-item-actions">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(page.id, !page.isFavorite);
              }}
              className={`sidebar-item-action-btn ${page.isFavorite ? 'favorite' : ''}`}
              title={page.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
            >
              <StarIcon size={13} fill={page.isFavorite ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCreatePage(page.id);
                setExpandedPages(prev => ({ ...prev, [page.id]: true }));
              }}
              className="sidebar-item-action-btn"
              title="Add subpage"
            >
              <PlusIcon size={13} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('Are you sure you want to archive this page?')) {
                  onArchivePage(page.id);
                }
              }}
              className="sidebar-item-action-btn"
              title="Archive page"
            >
              <TrashIcon size={13} />
            </button>
          </div>
        </div>

        {isExpanded && pagesByParent[page.id] && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {pagesByParent[page.id].map(child => renderPageItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-user-info">
          <div className="sidebar-avatar">
            {user?.name ? user.name[0].toUpperCase() : 'U'}
          </div>
          <div className="sidebar-user-details">
            <div className="sidebar-user-name">{user?.name || 'User'}</div>
            <div className="sidebar-user-email">{user?.email}</div>
          </div>
        </div>

        <div className="sidebar-header-controls">
          <button onClick={toggleTheme} className="sidebar-control-btn" title="Toggle Theme">
            {theme === 'dark' ? <SunIcon size={16} /> : <MoonIcon size={16} />}
          </button>
          <button onClick={logout} className="sidebar-control-btn" title="Sign Out">
            <LogOutIcon size={16} />
          </button>
        </div>
      </div>

      <div className="sidebar-search-container">
        <div className="sidebar-search-bar">
          <SearchIcon size={14} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search pages and text..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="sidebar-search-input"
          />
        </div>
      </div>

      <div className="sidebar-nav-scroll">
        {isSearching ? (
          <div className="sidebar-section">
            <div className="sidebar-section-title">
              {searchingLoading ? 'Searching...' : 'Search Results'}
            </div>
            {searchingLoading && (
              <div className="sidebar-loading-container">
                <Spinner size={16} style={{ color: 'var(--text-muted)' }} />
              </div>
            )}
            {!searchingLoading && searchResults.length === 0 ? (
              <div className="sidebar-empty-state">No matches found</div>
            ) : (
              searchResults.map(result => (
                <div
                  key={result.id}
                  onClick={() => {
                    onSelectPage(result.id);
                    setSearchQuery('');
                  }}
                  className="sidebar-search-result-wrapper"
                >
                  <div className="sidebar-search-result-item">
                    <span className="sidebar-page-icon-emoji">{result.icon || '📓'}</span>
                    <span className="sidebar-search-result-title">{result.title || 'Untitled'}</span>
                  </div>
                  {result.matchType === 'content' && result.snippet && (
                    <div className="sidebar-search-result-snippet">
                      {result.snippet}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          <>
            {favoritePages.length > 0 && (
              <div className="sidebar-section">
                <div className="sidebar-section-title">
                  <StarIcon size={11} style={{ marginRight: '6px', color: 'var(--warning)' }} fill="var(--warning)" />
                  Favorites
                </div>
                {favoritePages.map(page => (
                  <div
                    key={`fav-${page.id}`}
                    onClick={() => onSelectPage(page.id)}
                    style={{ paddingLeft: '10px' }}
                    className={`sidebar-item sidebar-page-item ${page.id === currentPageId ? 'active' : ''}`}
                  >
                    <span className="sidebar-page-icon-emoji">{page.icon || '📓'}</span>
                    <span className="sidebar-page-title-text">{page.title || 'Untitled'}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="sidebar-section">
              <div className="sidebar-section-title-row">
                <span className="sidebar-section-title">Workspace Documents</span>
                <button
                  onClick={() => onCreatePage(null)}
                  className="sidebar-add-root-btn"
                  title="Create root page"
                >
                  <PlusIcon size={14} />
                </button>
              </div>

              {loadingPages ? (
                <div className="sidebar-loading-container">
                  <Spinner size={16} style={{ color: 'var(--text-muted)' }} />
                </div>
              ) : rootPages.length === 0 ? (
                <div className="sidebar-empty-state">No pages yet. Create one!</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {rootPages.map(page => renderPageItem(page, 0))}
                </div>
              )}
            </div>

            {/* Collapsible Trash drawer */}
            <div className="sidebar-section">
              <div
                onClick={() => setIsTrashExpanded(!isTrashExpanded)}
                className="sidebar-trash-title-row"
              >
                <div className="sidebar-trash-title">
                  <ChevronRightIcon
                    size={12}
                    className={`sidebar-trash-chevron ${isTrashExpanded ? 'expanded' : ''}`}
                  />
                  <span>Trash</span>
                </div>
              </div>

              {isTrashExpanded && (
                <div className="sidebar-trash-list">
                  {loadingArchived ? (
                    <div className="sidebar-loading-container">
                      <Spinner size={14} style={{ color: 'var(--text-muted)' }} />
                    </div>
                  ) : archivedPages.length === 0 ? (
                    <div className="sidebar-empty-state">Trash is empty</div>
                  ) : (
                    archivedPages.map(page => (
                      <div
                        key={`trash-${page.id}`}
                        className="sidebar-item sidebar-trash-page-item"
                      >
                        <span className="sidebar-page-icon-emoji">{page.icon || '📓'}</span>
                        <span className="sidebar-page-title-text">{page.title || 'Untitled'}</span>
                        <div className="item-actions sidebar-page-item-actions">
                          <button
                            onClick={(e) => handleRestoreClick(page.id, e)}
                            className="sidebar-item-action-btn"
                            title="Restore page"
                          >
                            <RestoreIcon size={13} />
                          </button>
                          <button
                            onClick={(e) => handleDeleteClick(page.id, e)}
                            className="sidebar-item-action-btn"
                            style={{ color: 'var(--error)' }}
                            title="Delete permanently"
                          >
                            <TrashIcon size={13} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

