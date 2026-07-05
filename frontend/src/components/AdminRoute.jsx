import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePlayer } from '../context/PlayerContext'; 

const AdminRoute = ({ children }) => {
  const { currentUser, isLoading } = usePlayer(); // ⚡ Add an isLoading state
  
  // 1. Still loading? Show a spinner or null so we don't redirect accidentally
  if (isLoading) {
    return <div>Loading...</div>; 
  }

  // 2. Unauthenticated
  if (!currentUser) {
    return <Navigate to="/" replace />;
  }

  // 3. Authenticated but not an Admin
  if (currentUser.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  // 4. Authorized
  return children;
};

export default AdminRoute;