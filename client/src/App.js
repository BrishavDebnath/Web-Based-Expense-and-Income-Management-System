// client/src/App.js
import React, { useState, useEffect } from 'react';
// BrowserRouter should be wrapping <App /> in index.js
import { Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import './App.css';

// --- Import Your Components ---
// Ensure all components used in Routes are imported and exist
import Signup from './Signup';
import Login from './Login';
import Dashboard from './Dashboard';
import ProtectedRoute from './ProtectedRoute'; // Assuming this checks token existence
import EditTransactionPage from './EditTransactionPage'; // Component needs to be created
import TdsPage from './TdsPage'; // Component exists (with demo logic)
import IncomeSourcesPage from './IncomeSourcesPage'; // Component exists (for TDS users)
import InvestmentPage from './InvestmentPage'; // Placeholder component exists

// Example function to fetch protected data (kept for testing)
const fetchUserProfile = async () => {
  const token = localStorage.getItem('token');
  if (!token) {
    alert('No token found. Please log in.');
    return;
  }
  try {
    const response = await fetch('http://localhost:5000/api/user/profile', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    if (response.ok) {
      console.log('Profile data received:', data);
      alert(`Welcome ${data?.user?.name || 'User'}! (Role: ${data?.user?.role})`);
    } else {
      console.error('Failed to fetch profile:', response.status, data);
      alert(`Error fetching profile: ${data.message || response.statusText}`);
      if (response.status === 401 || response.status === 403) {
         localStorage.removeItem('token');
         localStorage.removeItem('user');
         window.location.href = '/login'; // Force redirect
       }
    }
  } catch (error) {
    console.error('Error fetching profile:', error);
    alert('Network error while fetching profile.');
  }
};


function App() {
  // State holds the authenticated user object (or null)
  const [currentUser, setCurrentUser] = useState(null);
  // Hook for navigation
  const navigate = useNavigate();

  // Check auth status on initial load from localStorage
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (token && storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (error) {
         console.error("Failed to parse user from localStorage", error);
         // Clear corrupted storage
         localStorage.removeItem('token');
         localStorage.removeItem('user');
         setCurrentUser(null);
      }
    } else {
      setCurrentUser(null); // Ensure state is null if not authenticated
    }
  }, []); // Run only once on mount

  // Logout handler: Clears storage, state, and redirects
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setCurrentUser(null);
    alert('You have been logged out.');
    navigate('/login'); // Use hook for navigation
  };

  // Callback for Login component: Updates state after successful login
  const handleLoginSuccess = () => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
       try {
         setCurrentUser(JSON.parse(storedUser));
         // No automatic redirect here, Login component handles it
       } catch (error) {
         console.error("Failed to parse user from localStorage after login", error);
         handleLogout(); // Force logout if data is bad
       }
    } else {
        console.error("User info not found in localStorage after login success callback.");
        handleLogout(); // Force logout if data wasn't stored
    }
  };

  // --- Role-Based Access Control Logic ---
  const userRole = currentUser?.role; // Get role safely

  // Define access flags based on role (ensure role strings match DB/backend exactly)
  const isPremiumAdmin = userRole === 'Premium User' || userRole === 'Admin';
  const canAccessTdsFeatures = userRole === 'Tax-conscious User' || isPremiumAdmin;
  const canAccessInvestments = userRole === 'Investor' || isPremiumAdmin;
  // Manage Income Sources page is tied to TDS features per latest requirement
  const canAccessIncomeSourcesPage = canAccessTdsFeatures;


  return (
      // BrowserRouter is assumed to be wrapping this component in index.js
      <div className="App">
        <header className="app-header">
          <h1>Web-Based Expense and Income Management System</h1>
          <nav className="app-nav">
            {/* --- Conditional Links based on Role --- */}
            {!currentUser ? (
              // Logged Out Links
              <>
                <Link to="/signup">Sign Up</Link>
                <Link to="/login" style={{ marginLeft: '15px' }}>Sign In</Link>
              </>
            ) : (
              // Logged In Links
              <>
                {/* Links visible to ALL logged-in users */}
                <Link to="/dashboard">Dashboard</Link>

                {/* Conditionally show Manage Income Sources (TDS) link */}
                {canAccessIncomeSourcesPage && (
                    <Link to="/income-sources" style={{ marginLeft: '15px' }}>Manage Income Sources (TDS)</Link>
                )}

                {/* Conditionally show TDS Optimizer link */}
                {canAccessTdsFeatures && (
                    <Link to="/tds-optimization" style={{ marginLeft: '15px' }}>TDS Optimizer</Link>
                )}

                {/* Conditionally show Investments link */}
                {canAccessInvestments && (
                    <Link to="/investments" style={{ marginLeft: '15px' }}>Investments</Link>
                )}

                {/* General Logged-in buttons (Pushed to the right) */}
                <span style={{ marginLeft: 'auto' }}>
                  <button onClick={fetchUserProfile} className="nav-button">Get My Profile</button>
                  <button onClick={handleLogout} className="nav-button" style={{ marginLeft: '10px' }}>Logout</button>
                </span>
              </>
            )}
            {/* --- End Conditional Links --- */}
          </nav>
        </header>
        <hr />
        <main className="app-content">
          <Routes>
            {/* Public Routes */}
            <Route path="/signup" element={<Signup />} />
            {/* Pass callback to Login */}
            <Route path="/login" element={<Login onLoginSuccess={handleLoginSuccess} />} />

            {/* Protected Routes */}
            {/* ProtectedRoute checks auth. Pass currentUser for potential use inside */}
            <Route path="/dashboard" element={ <ProtectedRoute> <Dashboard currentUser={currentUser} /> </ProtectedRoute> } />
            {/* Edit Transaction Page - Component needs implementation */}
            <Route path="/transactions/edit/:id" element={ <ProtectedRoute> <EditTransactionPage /> </ProtectedRoute> } />

            {/* Role-Protected Routes */}
            <Route path="/income-sources" element={ <ProtectedRoute> {canAccessIncomeSourcesPage ? <IncomeSourcesPage /> : <Navigate to="/dashboard" replace />} </ProtectedRoute> } />
            <Route path="/tds-optimization" element={ <ProtectedRoute> {canAccessTdsFeatures ? <TdsPage /> : <Navigate to="/dashboard" replace />} </ProtectedRoute> } />
            <Route path="/investments" element={ <ProtectedRoute> {canAccessInvestments ? <InvestmentPage /> : <Navigate to="/dashboard" replace />} </ProtectedRoute> } />

            {/* Default/Fallback routes */}
            <Route path="/" element={currentUser ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} />
            <Route path="*" element={<div><h2>404 Not Found</h2><Link to="/">Go Home</Link></div>} />
          </Routes>
        </main>
      </div>
  );
}

export default App;

/* Example CSS additions for App.css */
/*
.app-header { background-color: #282c34; padding: 10px 20px; color: white; }
.app-nav { display: flex; align-items: center; flex-wrap: wrap; } // Added flex-wrap
.app-nav a { color: #61dafb; text-decoration: none; margin-right: 15px; white-space: nowrap; } // Added nowrap
.app-nav a:hover { text-decoration: underline; }
.nav-button {
  background: none; border: none; color: #61dafb;
  text-decoration: underline; cursor: pointer; padding: 0;
  font: inherit; margin: 0; white-space: nowrap; // Added nowrap
}
.nav-button:hover { color: #21a1c4; }
.app-nav span[style*="margin-left: auto"] { margin-left: auto; padding-left: 15px;} // Ensure space before buttons pushed right
.app-content { padding: 20px; }
.error-message { color: red; }
.success-message { color: green; }
.warning-message { color: orange; font-weight: bold; }
.warning-text { color: orange; }
.disclaimer-text { font-size: 0.8em; color: gray; margin-top: 10px; }
.form-group { margin-bottom: 10px; }
.form-group label { display: block; margin-bottom: 4px; font-weight: bold; }
.form-group input[type="number"], .form-group input[type="date"],
.form-group input[type="text"], .form-group input[type="email"],
.form-group input[type="password"], .form-group select, .form-group textarea {
  width: 95%; max-width: 400px; padding: 8px; border: 1px solid #ccc;
  border-radius: 4px; box-sizing: border-box;
}
.form-group textarea { resize: vertical; }
.form-group-inline label { display: inline-block; margin-right: 5px; font-weight: normal;}
.form-group-inline input[type="radio"] { margin-right: 5px; vertical-align: middle; }
button[type="submit"] {
  padding: 10px 15px; background-color: #007bff; color: white;
  border: none; border-radius: 4px; cursor: pointer; font-size: 1em;
}
button[type="submit"]:hover { background-color: #0056b3; }
button[type="submit"]:disabled { background-color: #ccc; cursor: not-allowed; }
*/
