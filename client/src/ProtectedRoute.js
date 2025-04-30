// client/src/ProtectedRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom'; // Import Navigate for redirection

// This component wraps around routes that require authentication
function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token'); // Check if token exists

  if (!token) {
    // If no token, redirect to the login page
    console.log('ProtectedRoute: No token found, redirecting to /login');
    // 'replace' prevents user from using browser back button to get back to protected route
    return <Navigate to="/login" replace />;
  }

  // If token exists, render the child component (the actual protected page)
  // Note: This doesn't verify the token's validity here, relies on API calls failing if invalid
  return children;
}

export default ProtectedRoute;