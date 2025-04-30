// client/src/TdsPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom'; // Ensure Link is imported

function TdsPage() {
  // State removed for income sources text area approach
  // const [incomeSourcesText, setIncomeSourcesText] = useState('[]');
  // const [incomeSources, setIncomeSources] = useState([]);
  // const [saveIncomeMessage, setSaveIncomeMessage] = useState('');

  // State for the individual deduction input form
  const [section, setSection] = useState('');
  const [description, setDescription] = useState('');
  const [deductionAmount, setDeductionAmount] = useState('');
  const [dateIncurred, setDateIncurred] = useState('');
  const [deductionMessage, setDeductionMessage] = useState(''); // Feedback for adding deductions

  // State for fetching/saving details and analysis
  // We still need loading/error state, primarily for deductions/analysis now
  const [isLoading, setIsLoading] = useState(false); // Initially false, maybe load deductions?
  const [error, setError] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  // State to display the list of deductions added individually
  const [deductionList, setDeductionList] = useState([]);

  // Fetch existing DEDUCTIONS details only
  const fetchDeductions = useCallback(async () => {
      setIsLoading(true); setError(null);
      const token = localStorage.getItem('token');
      if (!token) { setError("Not logged in"); setIsLoading(false); return; }

      try {
           // Fetch individual deductions list
           const deductionResponse = await fetch('http://localhost:5000/api/tax-deductions', { // Assuming GET endpoint exists
               headers: { 'Authorization': `Bearer ${token}` }
           });
           if (!deductionResponse.ok) throw new Error(`HTTP error fetching deductions: ${deductionResponse.status}`);
           const deductionData = await deductionResponse.json();
           setDeductionList(deductionData || []); // Store list of deductions

      } catch (err) {
          setError(`Failed to load deductions: ${err.message}`);
          console.error(err);
      } finally {
          setIsLoading(false);
      }
  }, []);

  useEffect(() => {
      fetchDeductions(); // Fetch deductions when component mounts
  }, [fetchDeductions]);

  // Handler for saving income sources REMOVED
  // const handleSaveIncomeDetails = async (event) => { ... };

  // --- Handler for Adding Individual Deductions Form (Remains the same) ---
  const handleDeductionSubmit = async (event) => {
    event.preventDefault();
    setDeductionMessage(''); // Clear previous messages
    const token = localStorage.getItem('token');

    if (!token) {
      setDeductionMessage('Error: You must be logged in.');
      return;
    }
     if (!description || !deductionAmount || parseFloat(deductionAmount) <= 0) {
         setDeductionMessage('Error: Description and positive Amount are required.');
         return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/tax-deductions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          section: section,
          description: description,
          amount: parseFloat(deductionAmount),
          date_incurred: dateIncurred || null
        }),
      });
      const data = await response.json();

      if (response.ok) {
        console.log('Tax deduction added:', data);
        setDeductionMessage(`Success: ${data.message} (ID: ${data.deductionId})`);
        // Clear the form
        setSection('');
        setDescription('');
        setDeductionAmount('');
        setDateIncurred('');
        // Re-fetch the list of deductions to update the display
        fetchDeductions(); // Call the fetch function for deductions
      } else {
        console.error('Failed to add tax deduction:', response.status, data);
        setDeductionMessage(`Error: ${data.message || response.statusText}`);
      }
    } catch (error) {
      console.error('Error adding tax deduction:', error);
      setDeductionMessage('Error: Network error or server issue.');
    }
  };


  // Handle running the analysis (calls placeholder endpoint) - Remains the same
  const handleRunAnalysis = async () => {
        setAnalysisResult(null); setError(null); setAnalysisLoading(true);
        const token = localStorage.getItem('token');
        if (!token) { setError("Not logged in"); setAnalysisLoading(false); return; }

        try {
            const response = await fetch('http://localhost:5000/api/tds/analysis', { // Assuming GET endpoint exists
                headers: { 'Authorization': `Bearer ${token}` }
            });
             const data = await response.json();
             if (!response.ok) {
                 throw new Error(data.message || `Error ${response.status}`);
             }
             setAnalysisResult(data);
         } catch (err) {
             setError(`Analysis error: ${err.message}`);
             console.error(err);
         } finally {
             setAnalysisLoading(false);
         }
    };


  if (isLoading) return <div>Loading Deductions Data...</div>;


  return (
    <div>
      <h2>TDS Optimization</h2>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

       {/* --- Income Sources Section REMOVED --- */}


      {/* --- Add Individual Tax Deduction Section --- */}
      <section>
        <h3>Add Tax Deduction / Exemption</h3>
        {deductionMessage && <p style={{ color: deductionMessage.startsWith('Error') ? 'red' : 'green' }}>{deductionMessage}</p>}
        <form onSubmit={handleDeductionSubmit}>
          <div>
            <label>Section:</label>
            <input type="text" value={section} onChange={(e) => setSection(e.target.value)} placeholder="e.g., 80C, 80D" />
          </div>
          <div>
            <label>Description:</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} required placeholder="e.g., Life Insurance, PPF" />
          </div>
          <div>
            <label>Amount:</label>
            <input type="number" step="0.01" value={deductionAmount} onChange={(e) => setDeductionAmount(e.target.value)} required />
          </div>
          <div>
            <label>Date Incurred/Paid:</label>
            <input type="date" value={dateIncurred} onChange={(e) => setDateIncurred(e.target.value)} />
          </div>
          <button type="submit">Add Deduction</button>
        </form>
      </section>

      {/* --- Display Added Deductions List --- */}
      <section>
          <hr />
          <h3>Your Added Deductions</h3>
          {isLoading ? <p>Loading deductions...</p> : (
              deductionList.length === 0 ? (
                <p>No deductions added yet.</p>
              ) : (
                <ul>
                    {deductionList.map(ded => (
                        <li key={ded.id}>
                            {ded.section ? `(${ded.section}) ` : ''}
                            {ded.description}: {ded.amount}
                            {/* Add Edit/Delete buttons later */}
                        </li>
                    ))}
                </ul>
              )
          )}
      </section>


      {/* --- Analysis Section --- */}
      <section>
        <hr />
        <h3>TDS Analysis</h3>
        <button onClick={handleRunAnalysis} disabled={analysisLoading}>
          {analysisLoading ? 'Calculating...' : 'Run Analysis'}
        </button>
        {analysisResult && (
            <pre style={{marginTop: '10px', background:'#f0f0f0', padding:'10px'}}>
                {JSON.stringify(analysisResult, null, 2)}
            </pre>
        )}
        {/* Display specific analysis error if needed */}
        {/* {error && error.startsWith('Analysis error:') && <p style={{color: 'red'}}>{error}</p>} */}
      </section>

      <hr />
      <Link to="/dashboard">Back to Dashboard</Link>
    </div>
  );
}

export default TdsPage;