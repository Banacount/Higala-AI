import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from '@/App';
import { AppProvider } from '@/context/AppContext';
import { AuthProvider } from '@/context/AuthContext';
import './index.css';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root element was not found.');
}

createRoot(container).render(
  <StrictMode>
    <AppProvider>
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </AppProvider>
  </StrictMode>,
);
