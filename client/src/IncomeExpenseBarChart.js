// client/src/IncomeExpenseBarChart.js
import React, { useState, useEffect, useCallback } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, // x axis
  LinearScale,   // y axis
  BarElement,    // Bar itself
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register Chart.js components for Bar chart
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

function IncomeExpenseBarChart({ refreshTrigger }) { // Accept refresh trigger
  const [chartData, setChartData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Function to fetch chart data
  const fetchChartData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setChartData(null); // Reset
    const token = localStorage.getItem('token');
    if (!token) { setIsLoading(false); return; } // Don't attempt fetch if not logged in

    try {
      const response = await fetch('/api/summary/income-expense-history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      if (response.ok) {
        // Check if there's data to display
        if (data && data.datasets && data.datasets.some(ds => ds.data.length > 0)) {
           setChartData(data);
        } else {
           setChartData(null); // No data
        }
      } else {
        throw new Error(data.message || `HTTP error ${response.status}`);
      }
    } catch (err) {
      console.error("Error fetching bar chart data:", err);
      setError(`Could not load income/expense history: ${err.message}`);
      setChartData(null);
    } finally {
      setIsLoading(false);
    }
  }, []); // useCallback with empty dependency array

  // Fetch data on mount and when refreshTrigger changes
  useEffect(() => {
    fetchChartData();
  }, [fetchChartData, refreshTrigger]);

  // Chart options
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Monthly Income vs. Expenses (Last 6 Months)',
      },
      tooltip: {
         mode: 'index', // Show tooltips for both bars at the same index
         intersect: false,
         callbacks: {
            label: function(context) {
                let label = context.dataset.label || '';
                if (label) { label += ': '; }
                if (context.parsed.y !== null) {
                    label += `₹${context.parsed.y.toFixed(2)}`;
                }
                return label;
            }
        }
      }
    },
    scales: {
        y: {
            beginAtZero: true, // Start y-axis at 0
             ticks: {
                 // Format y-axis ticks as currency
                 callback: function(value) {
                     return '₹' + value.toLocaleString();
                 }
             }
        }
    }
  };

  // Render logic
  if (isLoading) return <p>Loading income/expense chart...</p>;
  if (error) return <p className="error-message">{error}</p>;
  if (!chartData) return <div style={{textAlign: 'center', padding: '20px'}}>No income or expense data for recent months to display chart.</div>;

  return (
    <div className="chart-container" style={{ position: 'relative', height: '300px', width:'100%', maxWidth: '600px', margin: '20px auto' }}>
      <Bar options={options} data={chartData} />
    </div>
  );
}

export default IncomeExpenseBarChart;
