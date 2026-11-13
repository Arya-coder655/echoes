import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

// Register Progressive Web App service worker
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('Echoes update available, reloading cache...');
  },
  onOfflineReady() {
    console.log('Echoes sanctuary cached and ready for offline reflection.');
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
