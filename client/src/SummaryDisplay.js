// client/src/SummaryDisplay.js
import React from 'react';

// Receive props from Dashboard
function SummaryDisplay({ summary }) {
  // Removed internal state and useEffect/fetch logic

  // Use default values if summary prop is not fully populated yet
  const currentBalance = summary?.currentBalance || '0.00';
  const monthlyIncome = summary?.monthlyIncome || '0.00';
  const monthlyExpenses = summary?.monthlyExpenses || '0.00';
  const monthlySavings = summary?.monthlySavings || '0.00';


  // Display the summary data from props
  return (
    <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ccc' }}>
      <h4>Summary</h4>
      <p>Current Balance: ${currentBalance}</p>
      <p style={{ marginTop:'5px' }}>Current Month Income: ${monthlyIncome}</p>
      <p>Current Month Expenses: ${monthlyExpenses}</p>
      <p>Current Month Savings: ${monthlySavings}</p>
    </div>
  );
}

export default SummaryDisplay;