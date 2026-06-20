import React, { useState, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar';
import { Editor } from '../components/Editor';
import { Block } from '../context/EditorContext';
import { Spinner } from '../components/Icons';

interface PageSummary {
  id: string;
  title: string;
  icon: string | null;
  parentId: string | null;
  isFavorite: boolean;
}

interface SelectedPageDetails {
  id: string;
  title: string;
  icon: string | null;
  cover: string | null;
  content: string;
  isFavorite: boolean;
}

export const Dashboard: React.FC = () => {
  const [pages, setPages] = useState<PageSummary[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [selectedPage, setSelectedPage] = useState<SelectedPageDetails | null>(null);
  
  const [loadingPages, setLoadingPages] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);


  useEffect(() => {
    const fetchList = async () => {
      try {
        const res = await fetch('/api/pages');
        if (res.ok) {
          const data = await res.json();
          setPages(data);
        }
      } catch (err) {
        console.error('Fetch pages summary error:', err);
      } finally {
        setLoadingPages(false);
      }
    };
    fetchList();
  }, []);

  const fetchPageDetails = async (pageId: string) => {
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/pages/${pageId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedPage(data);
      } else {
        setSelectedPage(null);
        setSelectedPageId(null);
      }
    } catch (err) {
      console.error('Fetch page details error:', err);
      setSelectedPage(null);
      setSelectedPageId(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    if (selectedPageId) {
      fetchPageDetails(selectedPageId);
    } else {
      setSelectedPage(null);
    }
  }, [selectedPageId]);

  const handleCreatePage = async (parentId: string | null = null) => {
    try {
      const res = await fetch('/api/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Untitled', parentId })
      });

      if (res.ok) {
        const newPage = await res.json();
        // Sync list fetch
        const resList = await fetch('/api/pages');
        if (resList.ok) {
          const data = await resList.json();
          setPages(data);
        }
        setSelectedPageId(newPage.id);
      }
    } catch (err) {
      console.error('Create page error:', err);
    }
  };

  const handleToggleFavorite = async (id: string, isFavorite: boolean) => {
    try {
      const res = await fetch(`/api/pages/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite })
      });
      if (res.ok) {
        setPages(prev => prev.map(p => p.id === id ? { ...p, isFavorite } : p));
        if (selectedPageId === id) {
          setSelectedPage(prev => prev ? { ...prev, isFavorite } : null);
        }
      }
    } catch (err) {
      console.error('Favorite toggle failed:', err);
    }
  };

  const handleArchivePage = async (id: string) => {
    try {
      const res = await fetch(`/api/pages/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: true })
      });

      if (res.ok) {
        // Refetch pages
        const resList = await fetch('/api/pages');
        if (resList.ok) {
          const data = await resList.json();
          setPages(data);
        }
        if (selectedPageId === id) {
          setSelectedPageId(null);
        }
      }
    } catch (err) {
      console.error('Archive page error:', err);
    }
  };

  const handleRestorePage = async (id: string) => {
    try {
      const res = await fetch(`/api/pages/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: false })
      });
      if (res.ok) {
        const resList = await fetch('/api/pages');
        if (resList.ok) {
          const data = await resList.json();
          setPages(data);
        }
      }
    } catch (err) {
      console.error('Restore page failed:', err);
    }
  };

  const handleDeletePermanently = async (id: string) => {
    try {
      const res = await fetch(`/api/pages/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const resList = await fetch('/api/pages');
        if (resList.ok) {
          const data = await resList.json();
          setPages(data);
        }
        if (selectedPageId === id) {
          setSelectedPageId(null);
        }
      }
    } catch (err) {
      console.error('Permanent delete failed:', err);
    }
  };

  const handleSavePage = async (updates: {
    title?: string;
    icon?: string | null;
    cover?: string | null;
    content?: Block[];
    isFavorite?: boolean;
  }) => {
    if (!selectedPageId) return;

    const payload: any = { ...updates };
    if (updates.content) {
      payload.content = JSON.stringify(updates.content);
    }

    try {
      const res = await fetch(`/api/pages/${selectedPageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const updatedPage = await res.json();
        setPages(prev =>
          prev.map(p =>
            p.id === selectedPageId
              ? {
                  ...p,
                  title: updatedPage.title,
                  icon: updatedPage.icon,
                  isFavorite: updatedPage.isFavorite
                }
              : p
          )
        );
        setSelectedPage(updatedPage);
      }
    } catch (err) {
      console.error('Update save failed:', err);
    }
  };

  const parseBlocks = (contentString: string): Block[] => {
    try {
      const parsed = JSON.parse(contentString);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  return (
    <div className="layout-container">
      <Sidebar
        pages={pages}
        currentPageId={selectedPageId}
        onSelectPage={setSelectedPageId}
        onCreatePage={handleCreatePage}
        onToggleFavorite={handleToggleFavorite}
        onArchivePage={handleArchivePage}
        onRestorePage={handleRestorePage}
        onDeletePage={handleDeletePermanently}
        loadingPages={loadingPages}
      />

      <div className="workspace-pane">
        {loadingDetails ? (
          <div className="loading-wrapper">
            <Spinner size={32} style={{ color: 'var(--accent-hover)' }} />
          </div>
        ) : selectedPageId && selectedPage ? (
          <Editor
            pageId={selectedPage.id}
            initialTitle={selectedPage.title}
            initialIcon={selectedPage.icon}
            initialCover={selectedPage.cover}
            initialBlocks={parseBlocks(selectedPage.content)}
            isFavorite={selectedPage.isFavorite}
            onSavePage={handleSavePage}
            onSelectPage={setSelectedPageId}
          />
        ) : (
          <div className="dashboard-container fade-in">
            <h1 className="greeting-title">Welcome back to Nodetion</h1>
            <p className="greeting-desc">
              A secure, high-performance workspace where thoughts turn into structures.
            </p>

            <div className="action-grid">
              <button
                onClick={() => handleCreatePage(null)}
                className="hover-scale glow-accent card-btn"
              >
                <div className="card-emoji">📓</div>
                <div className="card-label">Create a new Page</div>
                <div className="card-sub">Start writing instantly</div>
              </button>

              <div className="recent-panel glass-panel">
                <h3 className="panel-title">Quick Workspace Guide</h3>
                <ul className="guide-list">
                  <li>🌲 <b>Nested Hierarchies:</b> Hover pages in sidebar to build directories inside directories.</li>
                  <li>⚡ <b>Slash Commands:</b> Type <code>/</code> inside the editor to trigger block options.</li>
                  <li>🔒 <b>Strict Security:</b> Your sessions are fully guarded with secure HTTP-only cookies.</li>
                  <li>💾 <b>Auto-save:</b> Write freely; modifications are debounced and saved in real-time.</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
