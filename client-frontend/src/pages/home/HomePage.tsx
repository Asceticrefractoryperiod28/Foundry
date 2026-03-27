import React from 'react';
import { useAuth } from '../../modules/auth/AuthProvider';

export const HomePage: React.FC = () => {
  const { user } = useAuth();

  return (
    <section>
      <h1>Client Frontend</h1>
      <p>
        Welcome back, <strong>{user?.username || user?.email || 'user'}</strong>.
      </p>
    </section>
  );
};

