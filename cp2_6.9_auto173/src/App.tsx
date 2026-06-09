import React, { Suspense, lazy } from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import type { Page } from './types';

const Navbar = lazy(() => import('./components/Navbar'));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'));
const KanbanPage = lazy(() => import('./pages/KanbanPage'));
const OverviewPage = lazy(() => import('./pages/OverviewPage'));
const MessagePanel = lazy(() => import('./components/MessagePanel'));
const TaskDetailPanel = lazy(() => import('./components/TaskDetailPanel'));

const PageContent: React.FC = () => {
  const { currentPage } = useAppContext();
  
  const renderPage = () => {
    switch (currentPage as Page) {
      case 'overview':
        return <OverviewPage />;
      case 'kanban':
        return <KanbanPage />;
      case 'projects':
      default:
        return <ProjectsPage />;
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
      <Navbar />
      <main style={{ paddingTop: 56, minHeight: '100vh' }}>
        <Suspense fallback={
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: 'calc(100vh - 56px)',
            color: 'var(--text-secondary)'
          }}>
            加载中...
          </div>
        }>
          {renderPage()}
        </Suspense>
      </main>
      <Suspense fallback={null}>
        <MessagePanel />
        <TaskDetailPanel />
      </Suspense>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <PageContent />
    </AppProvider>
  );
};

export default App;
