// client/src/EditTransactionPage.js
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom'; // Import hooks

function EditTransactionPage() {
  const { id } = useParams(); // Get the transaction ID from the URL
  const navigate = useNavigate(); // Hook for navigation (e.g., back to dashboard)

  // State for form fields - initialize as empty or default
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense');
  const [transaction_date, setTransactionDate] = useState('');
  const [description, setDescription] = useState('');
  const [category_id, setCategoryId] = useState('');

  // State for loading and errors during fetch
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formMessage, setFormMessage] = useState(''); // For success/error messages on submit

  // --- Placeholder for Categories (same as AddTransactionForm) ---
  // IMPORTANT: Ensure IDs match your database
  const categories = [
      { id: 1, name: 'Food' }, { id: 2, name: 'Travel' }, { id: 3, name: 'Rent' },
      { id: 4, name: 'Utilities' }, { id: 5, name: 'Investments' }, { id: 6, name: 'Entertainment' },
      { id: 7, name: 'Health' }, { id: 8, name: 'Miscellaneous' }, { id: 9, name: 'Salary' },
  ];
  // TODO: Fetch categories dynamically later
  // --- End Placeholder ---

  // Fetch transaction data when component mounts or ID changes
  useEffect(() => {
    const fetchTransactionData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Not authorized.'); setIsLoading(false); return;
      }
      setIsLoading(true); setError(null);

      try {
        const response = await fetch(`http://localhost:5000/api/transactions/${id}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Fetched transaction data:', data);

        // Pre-fill the form state with fetched data
        setAmount(data.amount);
        setType(data.type);
        // Ensure date is in YYYY-MM-DD format for input type="date"
        setTransactionDate(data.transaction_date); // Already formatted by backend in example
        setDescription(data.description || ''); // Handle null description
        setCategoryId(data.category_id);

      } catch (err) {
        console.error("Failed to fetch transaction data:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactionData();
  }, [id]); // Re-run effect if the ID parameter changes

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormMessage(''); // Clear previous messages
    const token = localStorage.getItem('token');
  
    if (!token) {
      setFormMessage('Authentication error. Please log in again.');
      return;
    }
    if (!category_id) {
        setFormMessage('Please select a category.');
        return;
    }
  
    // Construct the updated data object from component state
    const updatedTransactionData = {
      amount: parseFloat(amount),
      type,
      transaction_date,
      description,
      category_id: parseInt(category_id, 10),
    };
  
    console.log('Submitting update for transaction ID:', id, updatedTransactionData);
  
    try {
      const response = await fetch(`http://localhost:5000/api/transactions/${id}`, { // Use ID in URL
        method: 'PUT', // Use PUT method for update
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // Send token
        },
        body: JSON.stringify(updatedTransactionData), // Send updated data
      });
  
      const data = await response.json(); // Try to parse JSON response
  
      if (response.ok) {
        console.log('Update successful:', data);
        setFormMessage('Transaction updated successfully!');
        alert('Transaction updated successfully!'); // Simple feedback
        // Optionally navigate back to dashboard after a short delay
        setTimeout(() => navigate('/dashboard'), 1500); // Redirect after 1.5 seconds
  
      } else {
        console.error('Failed to update transaction:', response.status, data);
        setFormMessage(`Error updating transaction: ${data.message || response.statusText}`);
      }
    } catch (error) {
      console.error('Error submitting update fetch:', error);
      setFormMessage('Network error while updating transaction.');
    }
  };
  // --- Render Logic ---
  if (isLoading) return <div>Loading transaction data...</div>;
  if (error) return <div style={{ color: 'red' }}>Error loading transaction: {error}</div>;

  // Form JSX (similar to AddTransactionForm, but uses state variables)
  return (
    <div>
      <h2>Edit Transaction (ID: {id})</h2>
      <form onSubmit={handleSubmit}>
        {/* Type */}
        <div>
          <label>Type: </label>
          <select value={type} onChange={(e) => setType(e.target.value)} required>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
          </select>
        </div>
        {/* Amount */}
        <div>
          <label>Amount: </label>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required step="0.01" />
        </div>
        {/* Date */}
         <div>
          <label>Date: </label>
          <input type="date" value={transaction_date} onChange={(e) => setTransactionDate(e.target.value)} required />
        </div>
        {/* Category */}
        <div>
          <label>Category: </label>
          <select value={category_id} onChange={(e) => setCategoryId(e.target.value)} required>
            <option value="" disabled>-- Select Category --</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </div>
        {/* Description */}
        <div>
          <label>Description: </label>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <button type="submit">Update Transaction</button>
      </form>
      {formMessage && <p>{formMessage}</p>}
      <hr />
      <Link to="/dashboard">Back to Dashboard</Link>
    </div>
  );
}

export default EditTransactionPage;