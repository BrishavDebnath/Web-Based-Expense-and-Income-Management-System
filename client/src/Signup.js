// client/src/Signup.js
import React, { useState } from 'react';
// Optional: import { useNavigate } from 'react-router-dom';

function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Default to Basic User, but allow choosing others including the new one
  const [role, setRole] = useState('Basic User');
  const [message, setMessage] = useState('');
  // const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    console.log('Sending signup data:', { name, email, password, role }); // Role included

    try {
      const response = await fetch('http://localhost:5000/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }), // Role sent
      });
      const data = await response.json();

      if (response.ok) {
        console.log('Signup successful:', data);
        setMessage(`Signup successful! User ID: ${data.userId}. You can now log in.`);
        setName(''); setEmail(''); setPassword(''); setRole('Basic User'); // Reset form
      } else {
        console.error('Signup failed:', response.status, data);
        setMessage(`Signup failed: ${data.message || response.statusText}`);
      }
    } catch (error) {
      console.error('Error during signup fetch:', error);
      setMessage('Signup failed due to a network error or server issue.');
    }
  };

  return (
    <div>
      <h2>Sign Up</h2>
      <form onSubmit={handleSubmit}>
        <div><label>Name:</label><input type="text" required value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><label>Email:</label><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div><label>Password:</label><input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>

        {/* --- Updated Role Selection --- */}
        <div>
          <label>User Type:</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} required>
            <option value="Basic User">Basic User (Track Expenses/Income)</option>
            <option value="Tax-conscious User">Tax-conscious User (Includes TDS Features)</option>
            <option value="Investor">Investor (Track + Future Investment Features)</option>
            {/* vvv Add the new combined role option vvv */}
            <option value="Premium User">Premium User (All Features)</option>
            {/* ^^^ Add the new combined role option ^^^ */}
          </select>
        </div>
        {/* --- End Role Selection --- */}

        <button type="submit">Sign Up</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
}
export default Signup;