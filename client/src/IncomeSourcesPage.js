// client/src/IncomeSourcesPage.js
import React, { useState } from 'react';

function IncomeSourcesPage() {
  const [sourceName, setSourceName] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('');
  const [dateReceived, setDateReceived] = useState('');
  const [message, setMessage] = useState(''); // For success/error messages

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage(''); // Clear previous messages
    const token = localStorage.getItem('token');

    if (!token) {
      setMessage('Error: You must be logged in.');
      return;
    }
    if (!sourceName || !amount || parseFloat(amount) <= 0) {
         setMessage('Error: Source Name and positive Amount are required.');
         return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/income-sources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          source_name: sourceName,
          amount: parseFloat(amount), // Ensure amount is a number
          type: type,
          date_received: dateReceived || null // Send null if date is empty
        }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log('Income source added:', data);
        setMessage(`Success: ${data.message} (ID: ${data.incomeSourceId})`);
        // Clear the form
        setSourceName('');
        setAmount('');
        setType('');
        setDateReceived('');
      } else {
        console.error('Failed to add income source:', response.status, data);
        setMessage(`Error: ${data.message || response.statusText}`);
      }
    } catch (error) {
      console.error('Error adding income source:', error);
      setMessage('Error: Network error or server issue.');
    }
  };

  return (
    <div>
      <h2>Manage Income Sources (for TDS Analysis)</h2>
      <p>Add details about your different sources of income.</p>

      {message && <p style={{ color: message.startsWith('Error') ? 'red' : 'green' }}>{message}</p>}

      <form onSubmit={handleSubmit}>
        <div>
          <label>Source Name:</label>
          <input type="text" value={sourceName} onChange={(e) => setSourceName(e.target.value)} required />
          <small> (e.g., Salary, Freelance Project X, Interest)</small>
        </div>
        <div>
          <label>Amount:</label>
          <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </div>
        <div>
          <label>Type:</label>
          <input type="text" value={type} onChange={(e) => setType(e.target.value)} />
           <small> (Optional: e.g., Salary, Business, Investment)</small>
        </div>
        <div>
          <label>Date Received:</label>
          <input type="date" value={dateReceived} onChange={(e) => setDateReceived(e.target.value)} />
           <small> (Optional)</small>
        </div>
        <button type="submit">Add Income Source</button>
      </form>

      {/* TODO: Add section later to display list of added income sources */}
    </div>
  );
}

export default IncomeSourcesPage;