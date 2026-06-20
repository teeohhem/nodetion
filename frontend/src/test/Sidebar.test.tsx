import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Sidebar } from '../components/Sidebar';
import { AuthContext } from '../context/AuthContext';

describe('Sidebar Component', () => {
  const mockUser = { id: 'u1', email: 'test@example.com', name: 'Nodetion Tester' };
  const mockAuthContext = {
    user: mockUser,
    login: vi.fn(),
    logout: vi.fn(),
    loading: false,
    register: vi.fn(),
    refreshUser: vi.fn()
  };

  const mockPages = [
    { id: 'p1', title: 'Page Title A', icon: '📝', parentId: null, isFavorite: true },
    { id: 'p2', title: 'Page Title B', icon: null, parentId: null, isFavorite: false }
  ];

  let props: any;

  beforeEach(() => {
    props = {
      pages: mockPages,
      currentPageId: 'p1',
      onSelectPage: vi.fn(),
      onCreatePage: vi.fn(),
      onToggleFavorite: vi.fn(),
      onArchivePage: vi.fn(),
      onRestorePage: vi.fn(),
      onDeletePage: vi.fn(),
      loadingPages: false
    };
  });

  const renderSidebar = () => {
    return render(
      <AuthContext.Provider value={mockAuthContext}>
        <Sidebar {...props} />
      </AuthContext.Provider>
    );
  };

  it('should render user profile information and control elements', () => {
    renderSidebar();
    expect(screen.getByText('Nodetion Tester')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('should render nested pages list and favorites list correctly', () => {
    renderSidebar();
    
    // Page listed under favorites
    const favoritesHeader = screen.getByText('Favorites');
    expect(favoritesHeader).toBeInTheDocument();

    // Page titles rendered
    expect(screen.getAllByText('Page Title A')[0]).toBeInTheDocument();
    expect(screen.getByText('Page Title B')).toBeInTheDocument();
  });

  it('should call onCreatePage callback when clicking add page button', () => {
    renderSidebar();
    const addPageBtn = screen.getByTitle('Create root page');
    fireEvent.click(addPageBtn);
    expect(props.onCreatePage).toHaveBeenCalledWith(null);
  });
});
