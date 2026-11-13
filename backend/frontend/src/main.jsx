import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// After a deploy, old page files are removed. A visitor who still has the previous version open
// then can't load the next page ("Failed to fetch dynamically imported module") and the site looks
// broken. When that happens, reload once to pick up the new version. The cart is kept (localStorage).
const RELOAD_KEY = 'vc-chunk-reload-at';
const reloadForNewVersion = () => {
  let last = 0;
  try { last = Number(sessionStorage.getItem(RELOAD_KEY)) || 0; } catch { /* storage blocked */ }
  if (Date.now() - last < 30000) return false; // already tried just now; don't loop
  try { sessionStorage.setItem(RELOAD_KEY, String(Date.now())); } catch { /* storage blocked */ }
  window.location.reload();
  return true;
};

window.addEventListener('vite:preloadError', (event) => {
  if (reloadForNewVersion()) event.preventDefault();
});

const isChunkError = (msg = '') => /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS/i.test(msg);
window.addEventListener('unhandledrejection', (event) => {
  if (isChunkError(event?.reason?.message)) reloadForNewVersion();
});
window.addEventListener('error', (event) => {
  if (isChunkError(event?.message)) reloadForNewVersion();
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
