// client/src/Dashboard.js
import React, { useState, useEffect, useCallback } from 'react';
import AddTransactionForm from './AddTransactionForm'; // Import the form
import TransactionList from './TransactionList';     // Import the list
import SpendingPieChart from './SpendingPieChart';   // Import the Pie chart
import IncomeExpenseBarChart from './IncomeExpenseBarChart'; // Import the Bar chart
import styles from './Dashboard.module.css'; // Import the CSS Module

// Accepts currentUser object as a prop from App.js
function Dashboard({ currentUser }) {
  // State for the fetched monthly summary data
  const [summaryData, setSummaryData] = useState(null);
  // State for loading and error messages for the summary section
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [summaryError, setSummaryError] = useState(null);

  // State specifically for the "Quick Add Deduction" form inputs
  const [section, setSection] = useState('');
  const [description, setDescription] = useState('');
  const [deductionAmount, setDeductionAmount] = useState('');
  const [dateIncurred, setDateIncurred] = useState('');
  const [deductionMessage, setDeductionMessage] = useState(''); // Feedback message for deduction form

  // State variable used as a counter to trigger data refreshes in child components
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Extract user role and name from the currentUser prop for easier use
  const userRole = currentUser?.role;
  const userName = currentUser?.name || 'User'; // Provide a default name

  // --- Function to Fetch Monthly Summary Data ---
  // useCallback memoizes the function so it doesn't trigger unnecessary useEffect runs
  const fetchMonthlySummary = useCallback(async () => {
    // console.log("Attempting to fetch monthly summary..."); // Uncomment for debugging
    setIsLoadingSummary(true); // Indicate loading started
    setSummaryError(null);     // Clear previous errors
    setSummaryData(null);      // Clear previous data before fetching new data

    const token = localStorage.getItem('token');
    if (!token) {
      setSummaryError("Authentication error. Please log in again.");
      setIsLoadingSummary(false);
      return; // Stop if not authenticated
    }

    // Get current year and month for the API request
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // JS Date months are 0-11, API needs 1-12

    try {
      // Fetch data from the role-aware backend endpoint
      const response = await fetch(`/api/summary/monthly/${year}/${month}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // Check for non-JSON error responses before attempting to parse
      if (!response.ok) {
          let errorMsg = `HTTP error ${response.status}: ${response.statusText}`;
           try {
               // Try to get more specific error from backend JSON response body
               const errorData = await response.json();
               errorMsg = `Error loading summary: ${errorData.message || errorMsg}`;
           } catch (parseError) {
                // If response wasn't JSON (e.g., HTML 404/500 page from bad proxy or server error)
                console.error("Non-JSON response received from summary endpoint", parseError);
                const textResponse = await response.text(); // Check response body as text
                if (textResponse && textResponse.trim().startsWith('<!DOCTYPE html>')) {
                     errorMsg = "Error loading summary: Server returned an unexpected response (HTML). Check API path and proxy setup.";
                 } else {
                     errorMsg = `Error loading summary: Server returned status ${response.status}.`;
                 }
           }
           throw new Error(errorMsg); // Throw error to be caught below
      }

      const data = await response.json(); // Parse the successful JSON response
      setSummaryData(data); // Store the received summary data in state

    } catch (err) {
      // Catch errors from fetch or from throwing !response.ok
      console.error("Failed to fetch or parse monthly summary:", err);
      setSummaryError(err.message); // Display the error message
      setSummaryData(null); // Ensure data is null on error
    } finally {
      setIsLoadingSummary(false); // Ensure loading state is turned off
    }
  }, []); // Empty dependency array because it calculates year/month internally and doesn't depend on props/state

  // --- Effect to Load Initial Data ---
  // Runs when the component mounts or when currentUser changes (e.g., after login/logout)
  useEffect(() => {
    if (currentUser) {
        // console.log("CurrentUser exists, fetching initial summary..."); // Uncomment for debugging
        fetchMonthlySummary();
        // Note: Chart data fetching is handled within the chart components themselves
    } else {
        // console.log("No currentUser, clearing dashboard data..."); // Uncomment for debugging
        // Clear data if user logs out or isn't loaded yet
        setIsLoadingSummary(false);
        setSummaryData(null);
        setSummaryError(null);
    }
  }, [currentUser, fetchMonthlySummary]); // Re-run if currentUser or the fetch function instance changes

  // --- Function to Trigger Data Refresh in Child Components ---
  // This function is passed down to AddTransactionForm and TransactionList
  const handleDataRefresh = () => {
    console.log("Refreshing dashboard data (summary, list, charts)...");
    fetchMonthlySummary(); // Refresh the summary data shown here
    // Incrementing refreshCounter triggers useEffect in TransactionList and key prop change in charts
    setRefreshCounter(prev => prev + 1);
  };

  // --- Handler for Adding Deduction from Dashboard Form ---
  const handleAddDeduction = async (event) => {
    event.preventDefault();
    setDeductionMessage(''); // Clear previous messages
    const token = localStorage.getItem('token');
    if (!token) { setDeductionMessage('Auth error.'); return; }
    if (!description || !deductionAmount || parseFloat(deductionAmount) <= 0) {
        setDeductionMessage('Description and positive Amount required.'); return;
    }
    setIsLoadingSummary(true); // Indicate activity while saving deduction and refreshing summary
    try {
      // Call the existing backend endpoint for adding deductions
      const response = await fetch('/api/tax-deductions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
          body: JSON.stringify({
              section: section || null, // Send null if section is empty
              description,
              amount: parseFloat(deductionAmount),
              date_incurred: dateIncurred || null // Send null if date is empty
          })
      });
      const data = await response.json();
      if (response.ok) {
        setDeductionMessage(`Success: ${data.message}`);
        // Clear the deduction form
        setSection(''); setDescription(''); setDeductionAmount(''); setDateIncurred('');
        // Refresh summary data AFTER adding deduction, as it might affect calculations
        fetchMonthlySummary();
        // Clear success message after a delay
        setTimeout(() => setDeductionMessage(''), 3000);
      } else {
        // Handle potential errors (like auth failure)
        setDeductionMessage(`Error: ${data.message || response.statusText}`);
        if (response.status === 401 || response.status === 403) { setDeductionMessage("Auth error."); }
      }
    } catch (error) {
      setDeductionMessage('Network error adding deduction.');
      console.error("Error adding deduction:", error);
    } finally {
       // Intentionally not setting isLoadingSummary false here,
       // as fetchMonthlySummary() was called and will handle it.
    }
  };

  // --- Role-based display logic ---
  // Check if the summary data received from backend includes the demo tax fields
  const hasSpendableData = summaryData?.estimatedSpendable_DEMO !== undefined;
  // Safely parse amounts for budget check, defaulting to 0
  const spendableAmount = hasSpendableData ? parseFloat(summaryData.estimatedSpendable_DEMO) : 0;
  const expensesAmount = summaryData?.totalExpenses ? parseFloat(summaryData.totalExpenses) : 0;
  const isOverBudget_DEMO = hasSpendableData && expensesAmount > spendableAmount;
  // Determine if the current user role should see the deduction form on the dashboard
  const canAddDeductionsHere = userRole && userRole !== 'Basic User'; // Show for all except Basic

  // --- Render Component JSX ---
  return (
    <div>
      <h2>Dashboard</h2>
      <p>Welcome {userName}!</p>

      {/* --- Layout for Summary & Charts --- */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '20px', alignItems: 'flex-start' }}>
        {/* Summary Section */}
        <section className="summary-section" style={{ flex: '1 1 300px', minWidth: '280px' }}>
          <h3>Current Month Summary ({new Date().toLocaleString('default', { month: 'long', year: 'numeric' })})</h3>
          {/* Display loading indicator */}
          {isLoadingSummary && <p>Loading summary...</p>}
          {/* Display error if loading failed */}
          {summaryError && !isLoadingSummary && <p className="error-message">{summaryError}</p>}
          {/* Display summary data only if not loading, no error, and data object exists */}
          {!isLoadingSummary && !summaryError && summaryData && (
           <div className="summary-details">
             {/* Use nullish coalescing '??' for safer rendering if data properties are missing/null */}
             <p>Total Income: ₹{summaryData?.totalIncome ?? '0.00'}</p>
             <p>Total Expenses: ₹{summaryData?.totalExpenses ?? '0.00'}</p>
             <p>Net Savings: ₹{summaryData?.netSavings ?? '0.00'}</p>

             {/* Conditionally display DEMO tax/spendable info if backend provided it */}
             {hasSpendableData && (
               <>
                 <hr style={{margin: '10px 0', borderStyle: 'dashed'}}/>
                 <p><strong>Demonstration Estimates (Simplified Logic):</strong></p>
                 <p className="summary-detail-label"><small>Est. Monthly Tax:</small> ₹{summaryData?.estimatedMonthlyTax_DEMO ?? 'N/A'}</p>
                 <p className="summary-detail-label"><small>Est. Spendable Income:</small> ₹{summaryData?.estimatedSpendable_DEMO ?? 'N/A'}</p>
                 <p className={`summary-detail-label ${isOverBudget_DEMO ? 'warning-text' : ''}`}><small>Est. Remaining Spendable:</small> ₹{summaryData?.remainingSpendable_DEMO ?? 'N/A'}</p>
                 {/* Display budget alert */}
                 {isOverBudget_DEMO && ( <p className="warning-message">⚠️ Alert: Expenses exceed estimated spendable!</p> )}
                 {/* Display warning from backend about accuracy */}
                 <p className="disclaimer-text">{summaryData?.taxCalculationWarning || "Tax figures are illustrative estimates."}</p>
               </>
             )}
           </div>
          )}
          {/* Display message if loading finished without error but no data was returned */}
          {!isLoadingSummary && !summaryError && !summaryData && <p>No summary data available for this month.</p>}
        </section>

        {/* Pie Chart Section */}
        <section className="chart-section" style={{ flex: '1 1 300px', minWidth: '300px' }}>
           {/* Render Pie Chart. Pass refreshCounter as key to force re-render/re-fetch on data changes */}
           {/* Pie chart component handles its own internal loading/error state */}
           <SpendingPieChart key={`pie-${refreshCounter}`} />
        </section>
      </div>
      {/* --- End Summary & Pie Chart Section --- */}

      {/* --- Bar Chart Section --- */}
       <section className="chart-section" style={{ marginBottom: '20px' }}>
           {/* Render Bar Chart. Pass refreshCounter as key. */}
           {/* Bar chart component handles its own internal loading/error state */}
           <IncomeExpenseBarChart key={`bar-${refreshCounter}`} />
       </section>
       {/* --- End Bar Chart Section --- */}


      <hr />

       {/* --- Add Deduction Form (Conditionally Rendered based on role) --- */}
       {canAddDeductionsHere && (
           <section className="deduction-form-section">
               <h3>Quick Add Deduction</h3>
               {deductionMessage && <p className={`message ${deductionMessage.startsWith('Error') ? 'error-message' : 'success-message'}`}>{deductionMessage}</p>}
               <form onSubmit={handleAddDeduction}>
                   <div className="form-group"><label htmlFor="ded-sec">Section:</label><input id="ded-sec" type="text" value={section} onChange={(e) => setSection(e.target.value)} placeholder="e.g., 80C"/></div>
                   <div className="form-group"><label htmlFor="ded-desc">Description:</label><input id="ded-desc" type="text" value={description} onChange={(e) => setDescription(e.target.value)} required placeholder="e.g., ELSS"/></div>
                   <div className="form-group"><label htmlFor="ded-amt">Amount:</label><input id="ded-amt" type="number" step="0.01" value={deductionAmount} onChange={(e) => setDeductionAmount(e.target.value)} required/></div>
                   <div className="form-group"><label htmlFor="ded-date">Date:</label><input id="ded-date" type="date" value={dateIncurred} onChange={(e) => setDateIncurred(e.target.value)} /></div>
                   <button type="submit">Add Deduction</button>
               </form>
           </section>
       )}
       {/* Add HR only if the deduction form was shown */}
       {canAddDeductionsHere && <hr />}

      {/* --- Transaction Management Section --- */}
      <section className="transaction-section">
          <h3>Manage Transactions</h3>
          {/* Render the Add Transaction Form, passing the refresh handler */}
          <AddTransactionForm onTransactionAdded={handleDataRefresh} />
          <hr style={{ margin: '20px 0' }} />
          {/* Render the Transaction List, passing the refresh trigger and handler */}
          <TransactionList refreshTrigger={refreshCounter} onTransactionDeleted={handleDataRefresh} />
      </section>
      {/* --- End Transaction Management Section --- */}

    </div>
  );
}

export default Dashboard;
