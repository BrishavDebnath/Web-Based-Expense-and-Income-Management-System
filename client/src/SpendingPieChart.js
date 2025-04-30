// client/src/SpendingPieChart.js
import React, { useState, useEffect, useCallback } from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from 'chart.js';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, Title);

function SpendingPieChart({ refreshTrigger }) { // Accept refresh trigger
  const [chartData, setChartData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Function to fetch chart data
  const fetchChartData = useCallback(async () => {
    // console.log("Fetching pie chart data..."); // Debug log
    setIsLoading(true); setError(null); setChartData(null); // Reset state
    const token = localStorage.getItem('token');
    if (!token) { setIsLoading(false); return; } // Don't attempt fetch if not logged in

    try {
      // Fetch data from the backend endpoint
      const response = await fetch('/api/summary/spending-by-category', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      // Check for non-JSON errors before parsing
      if (!response.ok) {
          let errorMsg = `HTTP error ${response.status}: ${response.statusText}`;
           try { const d = await response.json(); errorMsg = d.message || errorMsg; }
           catch (e) { const t = await response.text(); if (t.includes("DOCTYPE")) errorMsg="Server Error (HTML)";}
           throw new Error(errorMsg);
      }
      const data = await response.json(); // Parse successful JSON response

      // Check if the received data contains actual chart data points
      if (data && data.datasets && data.datasets[0].data.length > 0) {
         // Data received, prepare it (colors already added in backend in this version)
         setChartData(data);
      } else {
         // Response was OK, but no data points were returned (e.g., no expenses this month)
         console.log("Pie chart: No spending data returned from backend.");
         setChartData(null); // Set chartData to null to trigger "No data" message
      }
    } catch (err) {
      // Handle fetch errors or errors thrown from !response.ok check
      console.error("Error fetching pie chart data:", err);
      setError(`Could not load chart data: ${err.message}`);
      setChartData(null); // Ensure chartData is null on error
    } finally {
      setIsLoading(false); // Loading finished
    }
  }, []); // Empty dependency array

  // Fetch data on mount and when refreshTrigger changes
  useEffect(() => {
    fetchChartData();
  }, [fetchChartData, refreshTrigger]);

  // Chart options (customize as needed)
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', },
      title: { display: true, text: 'Spending Breakdown (Current Month)', },
      tooltip: { callbacks: { label: function(context) { /* ... tooltip formatter ... */ } } }
    },
  };

  // Render logic based on state
  if (isLoading) return <p>Loading chart data...</p>;
  // Display specific error message if fetch failed
  if (error) return <p className="error-message">{error}</p>;
  // Display "No data" message if fetch succeeded but returned no chartable data
  if (!chartData) return <div style={{textAlign: 'center', padding: '20px'}}>No spending data available for this month to display chart.</div>;

  // Render the chart if data is valid
  return (
    <div className="chart-container" style={{ position: 'relative', height: '300px', width:'100%', maxWidth: '400px', margin: '20px auto' }}>
        <Pie data={chartData} options={options} />
    </div>
  );
}

export default SpendingPieChart;

