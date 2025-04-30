// client/src/AddTransactionForm.js
import React, { useState, useEffect } from 'react';

// Receives a callback function to notify the parent (Dashboard) when a transaction is added
function AddTransactionForm({ onTransactionAdded }) {
  // State for form inputs
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense'); // Default to 'expense'
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]); // Default to today
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState(''); // Store the selected category ID

  // State for categories dropdown
  const [categories, setCategories] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  // State for messages and loading status
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch categories when the component mounts
  useEffect(() => {
    const fetchCategories = async () => {
      // Reset state before fetch
      setError('');
      setCategories([]); // Clear previous categories
      setIsLoadingCategories(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setError("Authentication error - cannot fetch categories.");
        setIsLoadingCategories(false);
        return;
      }

      try {
        // Use the correct backend endpoint for categories
        const response = await fetch('/api/categories', { // Relative path assumes proxy is set up correctly
          headers: { 'Authorization': `Bearer ${token}` }
        });

        // Check if response is ok before trying to parse JSON
        if (!response.ok) {
            // If response is not ok, try to parse error message, otherwise use status text
             let errorMsg = `HTTP error ${response.status}: ${response.statusText}`;
             try {
                 const errorData = await response.json(); // Try parsing error body
                 errorMsg = `Error loading categories: ${errorData.message || errorMsg}`;
             } catch (parseError) {
                 // If parsing error body fails, stick with the original HTTP error
                 console.error("Could not parse error response as JSON", parseError);
                 // Check if response is HTML (common for 404s with bad proxy)
                 const textResponse = await response.text(); // Get response as text
                 if (textResponse.trim().startsWith('<!DOCTYPE html>')) {
                     errorMsg = "Error loading categories: Server returned HTML instead of JSON. Check API path and proxy setup.";
                 }
             }
             throw new Error(errorMsg);
        }

        const data = await response.json(); // Now parse JSON safely
        setCategories(data || []); // Store the fetched categories, default to empty array

      } catch (err) {
        console.error("Error fetching categories:", err);
        setError(err.message); // Set the error state to display to user
      } finally {
        setIsLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []); // Empty dependency array means run once on mount

  // Handle form submission
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsSubmitting(true);

    // Validation
    if (!amount || parseFloat(amount) <= 0 || !type || !transactionDate || !categoryId) {
      setError('Please fill in amount (>0), type, date, and select a category.');
      setIsSubmitting(false);
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) { /* ... handle auth error ... */ return; }

    try {
      // Call backend to add transaction
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          type: type,
          transaction_date: transactionDate,
          description: description,
          category_id: parseInt(categoryId, 10)
        }),
      });
      const data = await response.json();

      if (response.ok) {
        setSuccessMessage(`Transaction added successfully! (ID: ${data.transactionId})`);
        // Clear form
        setAmount(''); setType('expense'); setTransactionDate(new Date().toISOString().split('T')[0]);
        setDescription(''); setCategoryId('');
        // Trigger refresh in parent (Dashboard)
        if (onTransactionAdded) { onTransactionAdded(); }
        setTimeout(() => setSuccessMessage(''), 3000); // Clear message after 3s
      } else {
        // Handle backend errors during submission
        setError(`Error adding transaction: ${data.message || response.statusText}`);
        if (response.status === 401 || response.status === 403) { setError("Authentication failed. Please log in again."); }
      }
    } catch (err) {
      console.error('Error submitting transaction:', err);
      setError('Network error or server issue while adding transaction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render the form
  return (
    <div className="add-transaction-form">
      <h3>Add New Transaction</h3>
      {error && <p className="error-message">{error}</p>}
      {successMessage && <p className="success-message">{successMessage}</p>}

      <form onSubmit={handleSubmit}>
        {/* Type Selection */}
        <div className="form-group form-group-inline">
           <label>Type:</label>
           <label><input type="radio" value="expense" checked={type === 'expense'} onChange={(e) => setType(e.target.value)} /> Expense</label>
           <label style={{ marginLeft: '15px' }}><input type="radio" value="income" checked={type === 'income'} onChange={(e) => setType(e.target.value)} /> Income</label>
        </div>
        {/* Amount */}
        <div className="form-group">
          <label htmlFor="transaction-amount">Amount:</label>
          <input id="transaction-amount" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required placeholder="0.00" /> ₹
        </div>
        {/* Date */}
        <div className="form-group">
          <label htmlFor="transaction-date">Date:</label>
          <input id="transaction-date" type="date" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} required />
        </div>
        {/* Category */}
        <div className="form-group">
          <label htmlFor="transaction-category">Category:</label>
          <select id="transaction-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required disabled={isLoadingCategories}>
            <option value="">-- Select Category --</option>
            {isLoadingCategories ? ( <option disabled>Loading...</option> )
             : categories.length > 0 ? (
                categories.map((cat) => (<option key={cat.id} value={cat.id}>{cat.name}</option>))
             ) : ( <option disabled>No categories found</option> )
            }
          </select>
          {!isLoadingCategories && categories.length === 0 && !error && <span style={{ fontSize: '0.8em' }}> No categories available.</span>}
        </div>
        {/* Description */}
        <div className="form-group">
          <label htmlFor="transaction-description">Description:</label>
          <textarea id="transaction-description" value={description} onChange={(e) => setDescription(e.target.value)} rows="2" placeholder="(Optional)" />
        </div>
        {/* Submit */}
        <button type="submit" disabled={isSubmitting || isLoadingCategories}>
          {isSubmitting ? 'Adding...' : 'Add Transaction'}
        </button>
      </form>
    </div>
  );
}
export default AddTransactionForm;
