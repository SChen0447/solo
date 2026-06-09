import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AnnotationProvider } from './stores/annotationStore';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AnnotationProvider>
      <App />
    </AnnotationProvider>
  </React.StrictMode>
);

const loading = document.getElementById('loading');
if (loading) loading.remove();
