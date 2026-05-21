import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import './styles/main.css';
import { initFrontendSentry } from './src/observability/sentry';
import { registerSW } from 'virtual:pwa-register';

initFrontendSentry();

let updateServiceWorker: ReturnType<typeof registerSW> | undefined;
updateServiceWorker = registerSW({
  immediate: true,
  onNeedRefresh() {
    void updateServiceWorker?.(true);
  },
  onRegisteredSW(_swUrl, registration) {
    if (!registration) {
      return;
    }

    void registration.update();
    window.setInterval(() => {
      void registration.update();
    }, 60 * 60 * 1000);
  },
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
