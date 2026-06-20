import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './App.css';
import * as Sentry from "@sentry/react"; 
import { GoogleOAuthProvider } from '@react-oauth/google'; // 👈 1. Import the Provider

// Initialize the Engine
Sentry.init({
  dsn: "https://c88d7395a26ddd8d6a4767abab8edb43@o4511553962442752.ingest.de.sentry.io/4511554002944080", 
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 1.0, 
  replaysSessionSampleRate: 0.1, 
  replaysOnErrorSampleRate: 1.0, 
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* 👈 2. Wrap the App component with the Google Provider */}
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>,
);