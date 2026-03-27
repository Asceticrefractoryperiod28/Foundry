import React from 'react';
import { MainLayout } from '../../layouts/MainLayout';
import { DashboardPage } from '../../pages/dashboard/DashboardPage';

export const App: React.FC = () => {
  return (
    <MainLayout>
      <DashboardPage />
    </MainLayout>
  );
};

