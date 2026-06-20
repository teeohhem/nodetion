import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Auth } from './pages/Auth';
import { Dashboard } from './pages/Dashboard';
import { Spinner } from './components/Icons';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={styles.loadingScreen}>
        <Spinner size={40} style={{ color: 'var(--accent-hover)' }} />
        <span style={styles.loadingText}>Initializing Workspace...</span>
      </div>
    );
  }

  return user ? <Dashboard /> : <Auth />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

const styles: Record<string, React.CSSProperties> = {
  loadingScreen: {
    height: '100%',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    backgroundColor: '#121214',
  },
  loadingText: {
    fontSize: '14px',
    color: '#9ca3af',
    fontWeight: 500,
  },
};

export default App;
