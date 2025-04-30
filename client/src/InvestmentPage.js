// client/src/InvestmentPage.js
import React from 'react';
import { Link } from 'react-router-dom'; // Import Link

function InvestmentPage() {
  return (
    <div>
      <h2>Investment Recommendations</h2>
      <p>This feature is currently under development.</p>
      <p>Personalized investment suggestions based on your spending habits, income trends, and risk profile will be available in future updates.</p>
      <br />
      <Link to="/dashboard">Back to Dashboard</Link> {/* Add a way back */}
    </div>
  );
}

export default InvestmentPage;