import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

import { registerSW } from 'virtual:pwa-register';

const updateSW = registerSW({
  onNeedRefresh() {
    window.dispatchEvent(new Event('pwa-update-available'));
  },
  onOfflineReady() {
    window.dispatchEvent(new Event('pwa-offline-ready'));
  },
});

(window as any).__PWA_UPDATE_SW__ = updateSW;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);