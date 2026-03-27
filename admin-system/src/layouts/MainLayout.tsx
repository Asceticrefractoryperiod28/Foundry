import React from 'react';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">Admin</div>
        <nav className="sidebar-nav">
          <div className="sidebar-section-title">Overview</div>
          <button className="sidebar-nav-item is-active" type="button">
            Dashboard
          </button>
        </nav>
      </aside>
      <div className="content">
        <header className="content-header">
          <h1 className="content-title">Admin System</h1>
        </header>
        <main className="content-main">{children}</main>
      </div>
    </div>
  );
};

