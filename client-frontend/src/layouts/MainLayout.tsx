import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../modules/auth/AuthProvider';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { user, logout, isLoading } = useAuth();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="logo">Client</div>
        <nav className="nav">
          <Link className="nav-item" to="/">
            Home
          </Link>
          <span className="nav-item nav-muted">{user?.username || user?.email || 'User'}</span>
          <button className="nav-button" type="button" onClick={logout} disabled={isLoading}>
            {isLoading ? 'Signing out...' : 'Sign out'}
          </button>
        </nav>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
};

