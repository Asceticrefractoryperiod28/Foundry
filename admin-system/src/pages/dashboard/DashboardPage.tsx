import React from 'react';

export const DashboardPage: React.FC = () => {
  return (
    <section>
      <h2>Overview</h2>
      <p>This is the admin dashboard shell.</p>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Users</div>
          <div className="stat-value">-</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Requests (24h)</div>
          <div className="stat-value">-</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Errors</div>
          <div className="stat-value">-</div>
        </div>
      </div>
    </section>
  );
};

