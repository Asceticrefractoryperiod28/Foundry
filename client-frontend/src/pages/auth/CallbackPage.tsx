import React from 'react';
import { Link } from 'react-router-dom';

export const CallbackPage: React.FC = () => {
  return (
    <section className="auth-page">
      <div className="auth-card">
        <h1>Auth callback</h1>
        <p>Third-party login callback is reserved for future integration.</p>
        <p className="auth-footnote">
          Return to <Link to="/login">sign in</Link>.
        </p>
      </div>
    </section>
  );
};
