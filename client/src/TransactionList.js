// client/src/TransactionList.js
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom'; // For Edit link

// Receives props to trigger refresh and notify parent of deletion
function TransactionList({ refreshTrigger, onTransactionDeleted }) {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Function to fetch transactions
  const fetchTransactions = useCallback(async () => {
    // console.log("Fetching transactions..."); // Debug log
    setIsLoading(true);
    setError(null);
    const token = localStorage.getItem('token');
    if (!token) {
      setError("Authentication error.");
      setIsLoading(false);
      return;
    }

    try {
      // Fetch transactions list from the backend
      const response = await fetch('/api/transactions', { // Relative path assumes proxy
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      if (response.ok) {
        setTransactions(data || []); // Set state, default to empty array
      } else {
        // Handle potential auth errors or other backend issues
         if (response.status === 401 || response.status === 403) {
             setError("Authentication failed fetching transactions.");
         } else {
            throw new Error(data.message || 'Failed to fetch transactions');
         }
      }
    } catch (err) {
      console.error("Error fetching transactions:", err);
      setError(`Error loading transactions: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, []); // useCallback with empty dependency array

  // Fetch transactions on initial mount and when refreshTrigger prop changes
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions, refreshTrigger]); // Re-fetch when refreshTrigger increments

  // Handle deleting a transaction
  const handleDelete = async (transactionId) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) {
      return;
    }

    setError(null); // Clear previous errors
    const token = localStorage.getItem('token');
    if (!token) { /* ... handle auth error ... */ return; }

    try {
      // Call the backend DELETE endpoint
      const response = await fetch(`/api/transactions/${transactionId}`, { // Relative path
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      if (response.ok) {
        console.log('Transaction deleted:', transactionId);
        // Notify parent (Dashboard) to refresh summary data etc.
        if (onTransactionDeleted) {
            onTransactionDeleted(); // This will trigger fetchTransactions via refreshTrigger prop change
        } else {
            fetchTransactions(); // Fallback to refetch directly if prop not passed
        }
        alert(data.message || 'Transaction deleted successfully!'); // Give feedback
      } else {
         if (response.status === 401 || response.status === 403) {
             setError("Authentication failed.");
         } else {
            throw new Error(data.message || 'Failed to delete transaction');
         }
      }
    } catch (err) {
      console.error("Error deleting transaction:", err);
      setError(`Error deleting transaction: ${err.message}`);
      alert(`Error: ${err.message}`); // Show error to user
    }
  };

  // Render logic
  if (isLoading) return <p>Loading transactions...</p>;
  // Display error prominently if one occurred during fetch/delete
  if (error) return <p className="error-message">{error}</p>;

  return (
    <div className="transaction-list">
      <h3>Your Transactions</h3>
      {transactions.length === 0 ? (
        <p>No transactions found. Add one using the form above!</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Category</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id}>
                {/* Format date for display */}
                <td>{new Date(tx.transaction_date + 'T00:00:00').toLocaleDateString()}</td>
                {/* Capitalize type */}
                <td>{tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}</td>
                <td>{tx.category_name || 'N/A'}</td>
                <td>{tx.description || '-'}</td>
                {/* Format amount with sign and color */}
                <td style={{ color: tx.type === 'income' ? 'green' : 'red', fontWeight: 'bold' }}>
                  {tx.type === 'income' ? '+' : '-'} ₹{Math.abs(tx.amount).toFixed(2)}
                </td>
                <td>
                  {/* Link to the Edit page (ensure route exists in App.js) */}
                  <Link to={`/transactions/edit/${tx.id}`} className="action-button edit-button">Edit</Link>
                  {/* Delete button */}
                  <button onClick={() => handleDelete(tx.id)} className="action-button delete-button">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default TransactionList;

/* Example CSS additions (add to App.css or similar) */
/*
.transaction-list { margin-top: 20px; }
.transaction-list table { width: 100%; border-collapse: collapse; }
.transaction-list th, .transaction-list td { border: 1px solid #ddd; padding: 8px; text-align: left; vertical-align: middle;}
.transaction-list th { background-color: #f2f2f2; font-weight: bold;}
.transaction-list tr:nth-child(even) { background-color: #f9f9f9; }
.action-button { padding: 4px 8px; margin: 2px; border: none; border-radius: 4px; cursor: pointer; text-decoration: none; font-size: 0.9em; display: inline-block; }
.edit-button { background-color: #ffc107; color: black; }
.edit-button:hover { background-color: #e0a800; }
.delete-button { background-color: #dc3545; color: white; }
.delete-button:hover { background-color: #c82333; }
*/

