import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import * as Sentry from "@sentry/react";

// Import the new Provider
import { PlayerProvider } from './context/PlayerContext';

import MainPlayer from './MainPlayer';
import Login from './Login';
import SignUp from './SignUp';
import ForgotPassword from './ForgotPassword';
import ResetPassword from './ResetPassword';
import Admin from './Admin';

function App() {
  return (
    // The Provider wraps the Router, making audio globally available!
    <PlayerProvider>
      <Router>
        <Sentry.ErrorBoundary fallback={<div className="crash-screen">Oops! Something went wrong in the music player. Our engineers have been notified.</div>}>
          <Routes>
            <Route path="/" element={<MainPlayer />} />
            <Route path="/playlist/:id" element={<MainPlayer />} />
            <Route path="/profile" element={<MainPlayer />} />
            <Route path="/settings" element={<MainPlayer />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Sentry.ErrorBoundary>
      </Router>
    </PlayerProvider>
  );
}

export default App;