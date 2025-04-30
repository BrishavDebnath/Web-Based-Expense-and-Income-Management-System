// client/src/Login.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Import for redirection

// Accept onLoginSuccess function as a prop from App.js
function Login({ onLoginSuccess }) {
  // State for form inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // State for displaying login errors to the user
  const [error, setError] = useState('');
  // Hook to programmatically navigate
  const navigate = useNavigate();

  // Handle form submission
  const handleSubmit = async (event) => {
    event.preventDefault(); // Prevent default browser form submission
    setError(''); // Clear any previous error messages
    console.log('Sending login data:', { email, password });

    try {
      // Send login credentials to the backend API endpoint
      const response = await fetch('http://localhost:5000/api/users/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json', // Indicate we're sending JSON data
        },
        // Convert email and password state to a JSON string for the request body
        body: JSON.stringify({ email, password }),
      });

      // Attempt to parse the JSON response from the server
      const data = await response.json();

      if (response.ok) { // Check if the HTTP status code indicates success (e.g., 200 OK)
        console.log('Login successful:', data);

        // Check if the expected token and user info are in the response
        if (data.token && data.user) {
          // Store the received token in the browser's localStorage
          localStorage.setItem('token', data.token);
          // Store the received user object (contains id, name, email, role) in localStorage
          // We stringify it because localStorage can only store strings
          localStorage.setItem('user', JSON.stringify(data.user));
          console.log('Token and user info stored in localStorage');

          // Call the callback function passed from App.js
          // This tells App.js that login was successful so it can update its state
          onLoginSuccess();

          // Redirect the user to the dashboard page after successful login
          navigate('/dashboard');

        } else {
           // Handle cases where the backend response was successful (2xx) but didn't contain expected data
           console.error('Login response missing token or user data.');
           setError('Login failed: Invalid response from server.');
           return; // Stop execution
        }

      } else {
        // Handle errors explicitly sent from the backend (e.g., 400, 401, 409)
        console.error('Login failed:', response.status, data);
        // Display the error message received from the backend, or a default one
        setError(`Login failed: ${data.message || response.statusText}`);
      }
    } catch (error) {
      // Handle network errors (e.g., server down, CORS issues not handled by backend)
      console.error('Error during login fetch:', error);
      setError('Login failed due to a network error or server issue.');
    }
  };

  // JSX for the login form
  return (
    <div>
      <h2>Sign In</h2>
      {/* Display error message to the user if the error state is set */}
      {error && <p className="error-message">{error}</p>}
      <form onSubmit={handleSubmit}>
         <div className="form-group">
           <label htmlFor="login-email">Email:</label>
           <input
             id="login-email"
             type="email"
             required
             value={email}
             onChange={(e) => setEmail(e.target.value)}
           />
         </div>
         <div className="form-group">
           <label htmlFor="login-password">Password:</label>
           <input
             id="login-password"
             type="password"
             required
             value={password}
             onChange={(e) => setPassword(e.target.value)}
           />
         </div>
         <button type="submit">Sign In</button>
      </form>
    </div>
  );
}

export default Login;
/*
/* Add relevant CSS to App.css or Dashboard.css if needed */
/*
.error-message {
  color: red;
  margin-bottom: 10px;
}
.form-group { margin-bottom: 10px; }
.form-group label { display: block; margin-bottom: 3px; font-weight: bold; }
.form-group input {
  width: 95%; /* Adjust as needed 
  8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}
.form-group button { /* Style as needed */ 