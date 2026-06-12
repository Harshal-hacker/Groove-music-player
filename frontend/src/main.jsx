import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './App.css';
import * as Sentry from "@sentry/react"; // 👈 1. Import Sentry

// 2. Initialize the Engine
Sentry.init({
  dsn: "https://c88d7395a26ddd8d6a4767abab8edb43@o4511553962442752.ingest.de.sentry.io/4511554002944080", // 👈 Paste your unique link here
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  // Performance Monitoring
  tracesSampleRate: 1.0, 
  // Session Replay (Records a video of the user's screen when it crashes!)
  replaysSessionSampleRate: 0.1, 
  replaysOnErrorSampleRate: 1.0, 
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);