// server/server.js
// --- Ensure all imports, middleware, dbPool, tax function exist above ---
// --- Imports ---
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');

// --- Configuration ---
const app = express();
const port = 5000;
const JWT_SECRET = 'THIS_IS_FOR_OUR_PROJECT!'; // <<< REPLACE
const dbPool = mysql.createPool({
  host: 'localhost',
  user: 'root',    // <<< REPLACE
  password: 'password', // <<< REPLACE
  database: 'expense_tracker_db', // <<< REPLACE if different
  waitForConnections: true, connectionLimit: 10, queueLimit: 0
});
dbPool.getConnection().then(conn => { console.log('MySQL connected.'); conn.release(); }).catch(err => console.error('MySQL connection error:', err));

// --- Middleware ---
const authenticateToken = (req, res, next) => { /* ... Same as before ... */
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);
    jwt.verify(token, JWT_SECRET, (err, userPayload) => {
      if (err) { console.log(`Token Verify Error: ${err.message}`); return res.sendStatus(403); } // Log specific verify error
      req.user = userPayload;
      next();
    });
};

// *** ADD THIS MIDDLEWARE FUNCTION ***
// Middleware to check user role against allowed roles
const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    if (req.user && req.user.role && allowedRoles.includes(req.user.role)) {
      return next(); // User has the required role, proceed
    }
    return res.status(403).json({ message: "Unauthorized: Insufficient role" }); // Forbidden
  };
};
app.use(cors());
app.use(express.json());

// --- Function for SIMPLIFIED Tax Calculation (Refactored - NEW REGIME FY24-25 DEMO) ---
// WARNING: Highly simplified logic based ONLY on limited search data. Assumes New Tax Regime FY 2024-25.
// Incorrectly applies/omits deductions, rebates, surcharges. FOR DEMO ONLY. DO NOT USE FOR FINANCIAL DECISIONS.
function calculateSimplifiedTax_NewRegimeDemo(taxableIncomeForSlabs) {
  let calculatedTax = 0;
  const slabs_fy24_25_new = [
      { limit: 400000, rate: 0.00 }, { limit: 800000, rate: 0.05 },
      { limit: 1200000, rate: 0.10 }, { limit: 1600000, rate: 0.15 },
      { limit: 2000000, rate: 0.20 }, { limit: 2400000, rate: 0.25 },
      { limit: Infinity, rate: 0.30 },
  ];

  if (typeof taxableIncomeForSlabs !== 'number' || isNaN(taxableIncomeForSlabs) || taxableIncomeForSlabs < 0) {
      console.error("calculateSimplifiedTax: Invalid input:", taxableIncomeForSlabs);
      return 0; // Or throw an error, depending on your error handling policy
  }

  let remainingIncome = taxableIncomeForSlabs;
  let previousSlabLimit = 0;

  console.log("calculateSimplifiedTax: Starting with income:", taxableIncomeForSlabs);

  for (const slab of slabs_fy24_25_new) {
      if (remainingIncome <= 0) break;

      const slabUpperLimit = slab.limit === Infinity ? Infinity : slab.limit;
      const incomeInThisSlab = Math.max(0, Math.min(remainingIncome, slabUpperLimit - previousSlabLimit));

      if (incomeInThisSlab > 0) {
          const taxInThisSlab = incomeInThisSlab * slab.rate;
          calculatedTax += taxInThisSlab;
          remainingIncome -= incomeInThisSlab;
          console.log(`  Slab: ${previousSlabLimit} - ${slabUpperLimit}, Income: ${incomeInThisSlab}, Tax: ${taxInThisSlab}, Total Tax: ${calculatedTax}`);
      }

      previousSlabLimit = slab.limit;
      if (slab.limit === Infinity) break;
  }

  console.log("calculateSimplifiedTax: Tax before rebate:", calculatedTax);

  const rebateThreshold = 700000;
  if (taxableIncomeForSlabs <= rebateThreshold && calculatedTax > 0) {
      calculatedTax = 0;
      console.log("calculateSimplifiedTax: Rebate applied, tax set to 0");
  }

  const cessRate = 0.04;
  const cessAmount = (calculatedTax > 0) ? calculatedTax * cessRate : 0;
  const totalTaxPayable = calculatedTax + cessAmount;

  console.log("calculateSimplifiedTax: Cess:", cessAmount);
  console.log("calculateSimplifiedTax: Total Tax Payable:", totalTaxPayable);

  return totalTaxPayable;
}


// --- Global Middleware ---
app.use(cors()); // Enable CORS - configure allowed origins for production
app.use(express.json()); // Middleware to parse incoming JSON request bodies
// --- End Global Middleware ---


// --- API Routes ---

// --- User Authentication Routes ---
// Register Route
app.post('/api/users/register', async (req, res) => {
    console.log('Register route hit!');
    const { name, email, password, role } = req.body;

    // Validation
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Name, email, password, and role are required' });
    }
    // Validate allowed roles (ensure these match frontend options and DB constraints)
    const allowedRoles = ['Basic User', 'Tax-conscious User', 'Investor', 'Premium User', 'Admin']; // Add Admin if used
    if (!allowedRoles.includes(role)) {
        return res.status(400).json({ message: 'Invalid user role selected.' });
    }

    let connection;
    try {
      connection = await dbPool.getConnection();
      // Check if email already exists
      const [existingUsers] = await connection.execute(
        'SELECT email FROM users WHERE email = ?', [email.toLowerCase()]
      );
      if (existingUsers.length > 0) {
        connection.release();
        return res.status(409).json({ message: 'Email already in use.' }); // 409 Conflict
      }

      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Insert new user (ensure 'role' column exists in your 'users' table)
      const [result] = await connection.execute(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        [name, email.toLowerCase(), hashedPassword, role]
      );

      console.log('User inserted successfully:', result);
      connection.release();
      res.status(201).json({ message: 'User registered successfully!', userId: result.insertId });

    } catch (error) {
       if (connection) connection.release();
       console.error('Error during registration:', error);
       if (error.code === 'ER_DUP_ENTRY') { // Specific MySQL error code for unique constraint
            return res.status(409).json({ message: 'Email already in use.' });
       }
       res.status(500).json({ message: 'Internal server error during registration' });
     }
});

// Login Route (Generates Token)
app.post('/api/users/login', async (req, res) => {
    console.log('Login route hit!');
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

    let connection;
    try {
        connection = await dbPool.getConnection();
        // Select user data including role
        const [users] = await connection.execute(
            'SELECT id, name, email, password, role FROM users WHERE email = ?',
            [email.toLowerCase()]
        );
        if (users.length === 0) {
            connection.release();
            return res.status(401).json({ message: 'Invalid email or password' }); // Unauthorized
        }

        const user = users[0];
        // Compare submitted password with stored hash
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            connection.release();
            return res.status(401).json({ message: 'Invalid email or password' }); // Unauthorized
        }

        console.log('Login successful for user:', user.email, 'Role:', user.role);
        // Create JWT payload (include essential, non-sensitive info)
        const payload = { userId: user.id, email: user.email, name: user.name, role: user.role };
        // Sign the token with expiry
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' }); // Example: 1 hour expiry

        connection.release();
        // Send token and user info (excluding password) back to client
        res.status(200).json({
            message: 'Login successful!',
            token: token,
            user: { id: user.id, email: user.email, name: user.name, role: user.role }
        });
    } catch (error) {
        if (connection) connection.release();
        console.error('Error during login:', error);
        res.status(500).json({ message: 'Internal server error during login' });
    }
});

// Get User Profile Route (Protected)
app.get('/api/user/profile', authenticateToken, (req, res) => {
    // The authenticateToken middleware already verified the token
    // and attached the payload to req.user
    console.log('Accessing protected profile route for user:', req.user.email);
    // Send back the user info obtained from the token
    res.status(200).json({
      message: 'Successfully accessed protected profile data',
      user: req.user
    });
});
// --- End User Authentication Routes ---


// --- Transaction Routes (Protected) ---
// Add Transaction
app.post('/api/transactions', authenticateToken, async (req, res) => {
  console.log('Add transaction route hit');
  const userId = req.user.userId;
  const { amount, type, transaction_date, description, category_id } = req.body;

  // Basic Validation
  if (amount == null || !type || !transaction_date || !category_id) {
    return res.status(400).json({ message: 'Missing required fields (amount, type, date, category).' });
  }
  if (type !== 'income' && type !== 'expense') {
     return res.status(400).json({ message: 'Invalid type. Must be "income" or "expense".' });
  }
  // Add more validation (e.g., amount > 0, valid date format, category_id exists)

  let connection;
  try {
    connection = await dbPool.getConnection();
    // Ensure transaction_date is in 'YYYY-MM-DD' format for MySQL DATE type
    const formattedDate = new Date(transaction_date).toISOString().split('T')[0];
    const [result] = await connection.execute(
      'INSERT INTO transactions (amount, type, transaction_date, description, user_id, category_id) VALUES (?, ?, ?, ?, ?, ?)',
      [amount, type, formattedDate, description || null, userId, category_id]
    );
    connection.release();
    console.log('Transaction inserted successfully:', result);
    res.status(201).json({
      message: 'Transaction added successfully!',
      transactionId: result.insertId
    });
  } catch (error) {
    if (connection) connection.release();
    console.error('Error adding transaction:', error);
    res.status(500).json({ message: 'Internal server error while adding transaction.' });
  }
});

// Get All Transactions for User
app.get('/api/transactions', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  console.log(`Fetching transactions for user ID: ${userId}`);

  let connection;
  try {
    connection = await dbPool.getConnection();
    // Join with categories to get name, filter by user, order by date
    // Ensure your tables are named 'transactions' and 'categories' and have the correct columns
    const [transactions] = await connection.execute(
      `SELECT t.id, t.amount, t.type, DATE_FORMAT(t.transaction_date, '%Y-%m-%d') as transaction_date, t.description, t.category_id, c.name as category_name
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id -- Use LEFT JOIN if category might be deleted
       WHERE t.user_id = ?
       ORDER BY t.transaction_date DESC, t.created_at DESC`,
      [userId]
    );
    connection.release();
    console.log(`Found ${transactions.length} transactions for user ID: ${userId}`);
    res.status(200).json(transactions); // Send array of transactions
  } catch (error) {
    if (connection) connection.release();
    console.error('Error fetching transactions:', error);
    res.status(500).json({ message: 'Internal server error while fetching transactions.' });
  }
});

// Delete Transaction
app.delete('/api/transactions/:id', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const transactionId = req.params.id;
  console.log(`Attempting to delete transaction ID: ${transactionId} for user ID: ${userId}`);

  if (!transactionId || isNaN(parseInt(transactionId, 10))) {
    return res.status(400).json({ message: 'Valid Transaction ID is required.' });
  }

  let connection;
  try {
    connection = await dbPool.getConnection();
    // Ensure user can only delete their own transactions
    const [result] = await connection.execute(
      'DELETE FROM transactions WHERE id = ? AND user_id = ?',
      [transactionId, userId]
    );
    connection.release();

    if (result.affectedRows === 0) {
      console.log(`Delete failed: Transaction ID ${transactionId} not found or does not belong to user ID ${userId}.`);
      return res.status(404).json({ message: 'Transaction not found or you do not have permission to delete it.' });
    }

    console.log(`Transaction ID ${transactionId} deleted successfully for user ID ${userId}.`);
    res.status(200).json({ message: 'Transaction deleted successfully!' });
  } catch (error) {
    if (connection) connection.release();
    console.error('Error deleting transaction:', error);
    res.status(500).json({ message: 'Internal server error while deleting transaction.' });
  }
});

// Get Single Transaction (for editing)
app.get('/api/transactions/:id', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const transactionId = req.params.id;
    console.log(`Fetching transaction ID: ${transactionId} for user ID: ${userId}`);

    if (!transactionId || isNaN(parseInt(transactionId, 10))) {
      return res.status(400).json({ message: 'Valid Transaction ID is required.' });
    }

    let connection;
    try {
      connection = await dbPool.getConnection();
      const [transactions] = await connection.execute(
        `SELECT t.id, t.amount, t.type, DATE_FORMAT(t.transaction_date, '%Y-%m-%d') as transaction_date, t.description, t.category_id
         FROM transactions t
         WHERE t.id = ? AND t.user_id = ?`,
        [transactionId, userId]
      );
      connection.release();

      if (transactions.length === 0) {
        return res.status(404).json({ message: 'Transaction not found or permission denied.' });
      }
      res.status(200).json(transactions[0]); // Send the single transaction object
    } catch (error) {
      if (connection) connection.release();
      console.error('Error fetching single transaction:', error);
      res.status(500).json({ message: 'Internal server error while fetching transaction.' });
    }
});

// Update Transaction
app.put('/api/transactions/:id', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const transactionId = req.params.id;
    const { amount, type, transaction_date, description, category_id } = req.body;
    console.log(`Attempting to update transaction ID: ${transactionId} for user ID: ${userId}`);

    // Validation
    if (!transactionId || isNaN(parseInt(transactionId, 10)) || amount == null || !type || !transaction_date || !category_id) {
        return res.status(400).json({ message: 'Missing or invalid required fields.' });
    }
    if (type !== 'income' && type !== 'expense') {
        return res.status(400).json({ message: 'Invalid transaction type.' });
    }

    let connection;
    try {
      connection = await dbPool.getConnection();
      const formattedDate = new Date(transaction_date).toISOString().split('T')[0];
      const [result] = await connection.execute(
        `UPDATE transactions
         SET amount = ?, type = ?, transaction_date = ?, description = ?, category_id = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND user_id = ?`,
        [amount, type, formattedDate, description || null, category_id, transactionId, userId]
      );
      connection.release();

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Transaction not found or permission denied.' });
      }
      res.status(200).json({ message: 'Transaction updated successfully!' });
    } catch (error) {
      if (connection) connection.release();
      console.error('Error updating transaction:', error);
      res.status(500).json({ message: 'Internal server error while updating transaction.' });
    }
});
// --- End Transaction Routes ---

// Add these routes within the // --- API Routes --- section of server.js

// --- GET Estimated Annual Income Route (Protected) ---
app.get('/api/user/annual-income', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  console.log(`Fetching estimated annual income for user ID: ${userId}`);
  let connection;
  try {
    connection = await dbPool.getConnection();
    const [users] = await connection.execute(
      'SELECT estimated_annual_income FROM users WHERE id = ?',
      [userId]
    );
    connection.release();
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.status(200).json({
      estimated_annual_income: users[0].estimated_annual_income // Will be null if not set
    });
  } catch (error) {
    if (connection) connection.release();
    console.error('Error fetching annual income:', error);
    res.status(500).json({ message: 'Internal server error fetching annual income.' });
  }
});

// --- PUT Estimated Annual Income Route (Protected) ---
app.put('/api/user/annual-income', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { annualIncome } = req.body; // Expecting { "annualIncome": 1200000 } or null

  console.log(`Updating estimated annual income for user ID: ${userId} to ${annualIncome}`);

  // Validation
  const incomeValue = annualIncome === null || annualIncome === '' ? null : parseFloat(annualIncome);
  if (incomeValue !== null && (isNaN(incomeValue) || incomeValue < 0)) {
    return res.status(400).json({ message: 'Invalid annual income amount provided.' });
  }

  let connection;
  try {
    connection = await dbPool.getConnection();
    const [result] = await connection.execute(
      'UPDATE users SET estimated_annual_income = ? WHERE id = ?',
      [incomeValue, userId] // Use null if parsed value is null
    );
    connection.release();

    if (result.affectedRows === 0) {
      // Should not happen if authenticateToken worked, but good practice
      return res.status(404).json({ message: 'User not found.' });
    }
    res.status(200).json({ message: 'Estimated annual income updated successfully.' });

  } catch (error) {
    if (connection) connection.release();
    console.error('Error updating annual income:', error);
    res.status(500).json({ message: 'Internal server error updating annual income.' });
  }
});

// --- End Annual Income Routes ---

// --- Categories Route ---
// GET Categories (Protected) - THIS WAS THE MISSING ROUTE
app.get('/api/categories', authenticateToken, async (req, res) => {
  console.log('Get categories route hit');
  let connection;
  try {
    connection = await dbPool.getConnection();
    const [categories] = await connection.execute(
      'SELECT id, name FROM categories ORDER BY name ASC' // Consider adding a type column if needed
    );
    connection.release();
    res.status(200).json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    if (connection) connection.release();
    res.status(500).json({ message: 'Internal server error while fetching categories.' });
  }
});
// --- End Categories Route ---


// --- Income Sources Routes (Protected - For TDS Page) ---
// Add Income Source
app.post('/api/income-sources', authenticateToken, async (req, res) => {
    console.log('Add income source route hit by user:', req.user.userId);
    const { source_name, amount, type, date_received } = req.body;
    const userId = req.user.userId;
    if (!source_name || amount == null || amount <= 0) {
      return res.status(400).json({ message: 'Source name and positive amount are required.' });
    }
    let connection;
    try {
      connection = await dbPool.getConnection();
      const formattedDate = date_received ? new Date(date_received).toISOString().split('T')[0] : null;
      const [result] = await connection.execute(
        'INSERT INTO income_sources (user_id, source_name, amount, type, date_received) VALUES (?, ?, ?, ?, ?)',
        [userId, source_name, amount, type || null, formattedDate]
      );
      connection.release();
      res.status(201).json({ message: 'Income source added successfully!', incomeSourceId: result.insertId });
    } catch (error) {
      if (connection) connection.release();
      console.error('Error adding income source:', error);
      res.status(500).json({ message: 'Internal server error while adding income source.' });
    }
});

// Get Income Sources
app.get('/api/income-sources', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    console.log('Get income sources route hit by user:', req.user.userId);
    let connection;
    try {
      connection = await dbPool.getConnection();
      const [incomeSources] = await connection.execute(
        `SELECT id, source_name, amount, type, DATE_FORMAT(date_received, '%Y-%m-%d') as date_received, created_at
         FROM income_sources WHERE user_id = ? ORDER BY date_received DESC, created_at DESC`,
        [userId]
      );
      connection.release();
      res.status(200).json(incomeSources);
    } catch (error) {
      if (connection) connection.release();
      console.error('Error fetching income sources:', error);
      res.status(500).json({ message: 'Internal server error while fetching income sources.' });
    }
});
// --- End Income Sources Routes ---


// --- Tax Deductions Routes (Protected) ---
// Add Tax Deduction
app.post('/api/tax-deductions', authenticateToken, async (req, res) => {
    console.log('Add tax deduction route hit by user:', req.user.userId);
    const { section, description, amount, date_incurred } = req.body;
    const userId = req.user.userId;
    if (!description || amount == null || amount <= 0) {
      return res.status(400).json({ message: 'Description and positive amount are required.' });
    }
    let connection;
    try {
      connection = await dbPool.getConnection();
      const formattedDate = date_incurred ? new Date(date_incurred).toISOString().split('T')[0] : null;
      const [result] = await connection.execute(
        'INSERT INTO tax_deductions (user_id, section, description, amount, date_incurred) VALUES (?, ?, ?, ?, ?)',
        [userId, section || null, description, amount, formattedDate]
      );
      connection.release();
      res.status(201).json({ message: 'Tax deduction added successfully!', deductionId: result.insertId });
    } catch (error) {
      if (connection) connection.release();
      console.error('Error adding tax deduction:', error);
      res.status(500).json({ message: 'Internal server error while adding tax deduction.' });
    }
});

// Get Tax Deductions
app.get('/api/tax-deductions', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    console.log('Get tax deductions route hit by user:', req.user.userId);
    let connection;
    try {
      connection = await dbPool.getConnection();
      const [deductions] = await connection.execute(
        `SELECT id, section, description, amount, DATE_FORMAT(date_incurred, '%Y-%m-%d') as date_incurred, created_at
         FROM tax_deductions WHERE user_id = ? ORDER BY date_incurred DESC, created_at DESC`,
        [userId]
      );
      connection.release();
      res.status(200).json(deductions);
    } catch (error) {
      if (connection) connection.release();
      console.error('Error fetching tax deductions:', error);
      res.status(500).json({ message: 'Internal server error while fetching tax deductions.' });
    }
});
// --- End Tax Deductions Routes ---




// --- GET Monthly Summary Route (Role-Aware - FINAL FIX using Explicit Object Build) ---
// This is the section you selected and where the change is applied
app.get('/api/summary/monthly/:year/:month', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const userRole = req.user.role;
  const targetYear = parseInt(req.params.year, 10);
  const targetMonth = parseInt(req.params.month, 10); // API month is 1-12

  if (isNaN(targetYear) || isNaN(targetMonth) || targetMonth < 1 || targetMonth > 12) {
    return res.status(400).json({ message: 'Invalid year or month parameters.' });
  }
  console.log(`\n--- Monthly Summary ---`);
  console.log(`User: ${userId}, Role: ${userRole}, Target: ${targetYear}-${targetMonth}`);

  let connection;
  try {
    connection = await dbPool.getConnection();

    // Fetch ALL transactions for the user, getting date as YYYY-MM-DD string
    console.log(`Fetching all transactions for user ${userId}...`);
    const [allTransactions] = await connection.execute(
      `SELECT id, amount, type, DATE_FORMAT(transaction_date, '%Y-%m-%d') as dateString
       FROM transactions WHERE user_id = ?`, // Fetch all for user
      [userId]
    );
    console.log(`Fetched ${allTransactions.length} total transactions.`);

    // Calculate totals using JavaScript filtering and summation
    let totalMonthlyIncome = 0;
    let totalMonthlyExpenses = 0;
    let processedCount = 0;

    console.log(`Filtering transactions for ${targetYear}-${String(targetMonth).padStart(2, '0')}...`);
    allTransactions.forEach((tx, index) => {
      if (tx.dateString) {
          const [txYearStr, txMonthStr] = tx.dateString.split('-');
          const txYear = parseInt(txYearStr, 10);
          const txMonth = parseInt(txMonthStr, 10);
          if (txYear === targetYear && txMonth === targetMonth) {
              processedCount++;
              const amount = parseFloat(tx.amount || 0);
              if (tx.type === 'income') { // Use lowercase
                  totalMonthlyIncome += amount;
              } else if (tx.type === 'expense') { // Use lowercase
                  totalMonthlyExpenses += amount;
              }
          }
      }
    });
    console.log(`Finished filtering. Matched ${processedCount} transactions for the target month.`);
    console.log(`Calculated Totals: Income=${totalMonthlyIncome}, Expenses=${totalMonthlyExpenses}`);


    // Fetch Deductions (for all non-Basic users) - Logic remains the same
    let totalOtherDeductionsClaimed = 0;
    const rolesNeedingDeductions = ['Investor', 'Tax-conscious User', 'Premium User', 'Admin'];
    if (rolesNeedingDeductions.includes(userRole)) {
        const [deductions] = await connection.execute( 'SELECT amount FROM tax_deductions WHERE user_id = ?', [userId] );
        totalOtherDeductionsClaimed = deductions.reduce((sum, ded) => sum + parseFloat(ded.amount || 0), 0);
    }

    connection.release(); // Release connection

    // --- Prepare Response Object Explicitly ---
    const netSavings = totalMonthlyIncome - totalMonthlyExpenses;

    // Start with base details for all users
    let summaryResponse = {
        message: `Monthly summary for ${targetYear}-${String(targetMonth).padStart(2, '0')}`,
        year: targetYear,
        month: targetMonth,
        role: userRole,
        totalIncome: totalMonthlyIncome.toFixed(2),
        totalExpenses: totalMonthlyExpenses.toFixed(2),
        netSavings: netSavings.toFixed(2)
    };

    // Add tax/spendable fields ONLY if user is NOT Basic User
    if (userRole !== 'Basic User') {
        // Apply Simplified Tax Logic (Logic remains the same)
        const estimatedAnnualIncome = totalMonthlyIncome * 12;
        const standardDeduction = (estimatedAnnualIncome > 0) ? 75000 : 0; // EXAMPLE - VERIFY
        const incomeAfterStandardDeduction = Math.max(0, estimatedAnnualIncome - standardDeduction);
        const taxableIncomeForSlabs = Math.max(0, incomeAfterStandardDeduction - totalOtherDeductionsClaimed); // Simplified
        const estimatedAnnualTax = calculateSimplifiedTax_NewRegimeDemo(taxableIncomeForSlabs); // Assumes function exists
        const estimatedMonthlyTax_DEMO = estimatedAnnualTax / 12;
        const taxCalculationWarning = "Tax/Spendable figures are ILLUSTRATIVE DEMO values based on simplified logic. Inaccurate.";
        const estimatedSpendable_DEMO = totalMonthlyIncome - estimatedMonthlyTax_DEMO;
        const remainingSpendable_DEMO = estimatedSpendable_DEMO - totalMonthlyExpenses;

        // Add fields explicitly to the response object
        summaryResponse.estimatedMonthlyTax_DEMO = estimatedMonthlyTax_DEMO.toFixed(2);
        summaryResponse.estimatedSpendable_DEMO = estimatedSpendable_DEMO.toFixed(2);
        summaryResponse.remainingSpendable_DEMO = remainingSpendable_DEMO.toFixed(2);
        summaryResponse.totalDeductionsConsidered_DEMO = totalOtherDeductionsClaimed.toFixed(2);
        summaryResponse.calculatedTaxableIncome_DEMO = taxableIncomeForSlabs.toFixed(2);
        summaryResponse.taxCalculationWarning = taxCalculationWarning;
    }
    // --- End Explicit Object Build ---

    console.log("Sending summary response:", summaryResponse); // Log final response object
    res.status(200).json(summaryResponse); // Send the constructed object

  } catch (error) {
    console.error('Error fetching monthly summary:', error); // Log specific error
    if (connection) connection.release();
    res.status(500).json({ message: 'Internal server error fetching monthly summary.' }); // Generic message to frontend
  }
});
// --- End Monthly Summary Route ---
// --- GET Spending by Category Route (FINAL FIX - Reverting to SQL Aggregation) ---
// This is the section you selected and where the change is applied
app.get('/api/summary/spending-by-category', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  console.log(`\n--- Spending By Category ---`);
  console.log(`User ID: ${userId}`);

  const targetYear = new Date().getFullYear();
  const targetMonth = new Date().getMonth() + 1; // Target month (1-12)
  const yearMonthString = `${targetYear}-${String(targetMonth).padStart(2, '0')}`; // Format 'YYYY-MM'
  console.log(`Target Month: ${yearMonthString}`);

  let connection;
  try {
    connection = await dbPool.getConnection();

    // Attempting direct SQL aggregation again, using LEFT JOIN and DATE_FORMAT filter
    console.log(`SpendingByCategory: Fetching and aggregating expenses for user ${userId}, month ${yearMonthString} via SQL...`);
    const sqlQuery = `
      SELECT
          IFNULL(c.name, 'Uncategorized') as categoryName,
          SUM(t.amount) as totalAmount
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id -- Use LEFT JOIN
       WHERE t.user_id = ?
         AND t.type = 'expense'
         AND DATE_FORMAT(t.transaction_date, '%Y-%m') = ? -- Filter using DATE_FORMAT
       GROUP BY categoryName -- Group by the resulting category name
       HAVING SUM(t.amount) > 0
       ORDER BY totalAmount DESC`;
    console.log("SpendingByCategory: Executing SQL:", sqlQuery.replace(/\s+/g, ' ').trim(), [userId, yearMonthString]); // Log query
    const [categorySpending] = await connection.execute(sqlQuery, [userId, yearMonthString]);

    connection.release();
    console.log(`SpendingByCategory: SQL Query returned ${categorySpending.length} aggregated category rows.`);
    // console.log("SpendingByCategory: Aggregated Data:", categorySpending); // Uncomment to see raw aggregated data

    // Format data for Chart.js Pie/Doughnut chart
    const labels = categorySpending.map(item => item.categoryName);
    const dataValues = categorySpending.map(item => parseFloat(item.totalAmount)); // Ensure data are numbers
    console.log("SpendingByCategory: Formatted Labels:", labels);
    console.log("SpendingByCategory: Formatted Data:", dataValues);

    // Assign default colors dynamically based on data length
    const backgroundColors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#E7E9ED', '#8A2BE2', '#5F9EA0', '#D2691E', '#FF7F50', '#6495ED'];
    const datasetColors = dataValues.map((_, i) => backgroundColors[i % backgroundColors.length]);

    const chartResponseData = {
      labels: labels,
      datasets: [{
          label: 'Spending this Month',
          data: dataValues,
          backgroundColor: datasetColors,
          hoverBackgroundColor: datasetColors
      }]
    };
    console.log("SpendingByCategory: Sending Chart Response Data");
    res.status(200).json(chartResponseData);

  } catch (error) {
    if (connection) connection.release();
    console.error('Error fetching spending by category:', error); // Log the full error
    res.status(500).json({ message: 'Internal server error while fetching spending data.' });
  }
});

// --- End Spending by Category Route ---


// *** ADD THIS NEW ROUTE ***
// --- GET Monthly Income vs Expense History Route (for Bar Chart) ---
app.get('/api/summary/income-expense-history', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  // Default to last 6 months, including current
  const numberOfMonths = 6;
  console.log(`Fetching income/expense history for last ${numberOfMonths} months for user ID: ${userId}`);

  let connection;
  try {
      connection = await dbPool.getConnection();

      // SQL Query to get monthly sums for income and expenses for the user over the last N months
      // Note: Date calculations in SQL can vary slightly between DB versions. This works for recent MySQL.
      const [monthlyData] = await connection.execute(
         `SELECT
              DATE_FORMAT(transaction_date, '%Y-%m') AS monthYear,
              SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS monthlyIncome,
              SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS monthlyExpense
          FROM transactions
          WHERE user_id = ?
            AND transaction_date >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
            AND transaction_date <= LAST_DAY(CURDATE()) -- Ensure we include up to the end of the current month
          GROUP BY monthYear
          ORDER BY monthYear ASC`,
          [userId, numberOfMonths - 1] // INTERVAL N MONTH goes back N-1 full months + current partial month
      );

      connection.release();

      // Process data for Chart.js Bar chart
      const labels = []; // Month-Year labels (e.g., "2025-04")
      const incomeData = [];
      const expenseData = [];

      // Create a map of results for easy lookup
      const resultsMap = new Map();
      monthlyData.forEach(row => {
          resultsMap.set(row.monthYear, {
              income: parseFloat(row.monthlyIncome || 0),
              expense: parseFloat(row.monthlyExpense || 0)
          });
      });

      // Generate labels and data for the last N months, filling gaps with 0
      const today = new Date();
      for (let i = numberOfMonths - 1; i >= 0; i--) {
          const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0'); // Format month as 01, 02 etc.
          const monthYearLabel = `${year}-${month}`;

          labels.push(monthYearLabel); // Add label (e.g., "2025-04")
          const dataPoint = resultsMap.get(monthYearLabel);
          incomeData.push(dataPoint?.income || 0);
          expenseData.push(dataPoint?.expense || 0);
      }


      res.status(200).json({
          labels: labels,
          datasets: [
              {
                  label: 'Monthly Income',
                  data: incomeData,
                  backgroundColor: 'rgba(75, 192, 192, 0.6)', // Teal/Green
                  borderColor: 'rgba(75, 192, 192, 1)',
                  borderWidth: 1
              },
              {
                  label: 'Monthly Expenses',
                  data: expenseData,
                  backgroundColor: 'rgba(255, 99, 132, 0.6)', // Red/Pink
                  borderColor: 'rgba(255, 99, 132, 1)',
                  borderWidth: 1
              }
          ]
      });

  } catch (error) {
    if (connection) connection.release();
    console.error('Error fetching income/expense history:', error);
    res.status(500).json({ message: 'Internal server error while fetching income/expense history.' });
  }
});
// --- End Monthly Income vs Expense History Route ---


// --- TDS Analysis Route (Simulator - Protected & More Robust) ---
// Apply role check middleware
app.get('/api/tds/analysis',
  authenticateToken,
  checkRole(['Tax-conscious User', 'Premium User', 'Admin']), // Restrict access
  async (req, res) => {
    console.log(`\n--- TDS Analysis (Simulator) ---`);
    const userId = req.user.userId;
    console.log(`User ID: ${userId}`);
    let connection;
     try {
       connection = await dbPool.getConnection();

       // 1. Fetch User's Income Sources from income_sources table
       console.log("TDS Analysis: Fetching income sources...");
       const [incomeSources] = await connection.execute(
           'SELECT source_name, amount, type FROM income_sources WHERE user_id = ?', [userId]
       );
       console.log(`TDS Analysis: Fetched ${incomeSources?.length ?? 0} income sources.`);

       // 2. Fetch User's Tax Deductions from tax_deductions table
       console.log("TDS Analysis: Fetching tax deductions...");
       const [deductions] = await connection.execute(
           'SELECT section, description, amount FROM tax_deductions WHERE user_id = ?', [userId]
       );
       console.log(`TDS Analysis: Fetched ${deductions?.length ?? 0} deductions.`);

       connection.release(); // Release connection

       // --- 3. Perform DEMONSTRATION Tax Calculations ---
       console.log("TDS Analysis: Starting simplified calculations...");
       // Ensure fetched data are arrays before using reduce/some
       const incomeSourcesArray = Array.isArray(incomeSources) ? incomeSources : [];
       const deductionsArray = Array.isArray(deductions) ? deductions : [];

       // Calculate total income from the dedicated income_sources table
       const totalIncome = incomeSourcesArray.reduce((sum, source) => sum + parseFloat(source?.amount || 0), 0);
       console.log(`TDS Analysis: Total Income from sources = ${totalIncome}`);

       // Calculate total deductions from the dedicated tax_deductions table
       const totalDeductionsClaimed = deductionsArray.reduce((sum, ded) => sum + parseFloat(ded?.amount || 0), 0);
       console.log(`TDS Analysis: Total Deductions claimed = ${totalDeductionsClaimed}`);

       // Apply standard deduction (simplified) - Check if 'Salary' type exists in incomeSources
       const standardDeduction = (incomeSourcesArray.some(s => s?.type && s.type.toLowerCase() === 'salary')) ? 75000 : 0;
       console.log(`TDS Analysis: Standard Deduction applied = ${standardDeduction}`);
       const incomeAfterStandardDeduction = Math.max(0, totalIncome - standardDeduction);

       // Calculate Taxable Income (Simplified - Subtracts fetched deductions)
       // WARNING: Still ignores deduction limits/rules and assumes New Regime only
       const taxableIncomeForSlabs = Math.max(0, incomeAfterStandardDeduction - totalDeductionsClaimed);
       console.log(`TDS Analysis: Demo Taxable Annual Income = ${taxableIncomeForSlabs}`);

       // Calculate estimated annual tax using the simplified function
       let totalTaxPayable = 0; // Initialize to a default value
       try {
           totalTaxPayable = calculateSimplifiedTax_NewRegimeDemo(taxableIncomeForSlabs); // Direct assignment
           console.log("TDS Analysis: Tax calculation function executed.");
       } catch (taxCalcError) {
           console.error("TDS Analysis: Error within tax calculation function:", taxCalcError);
           throw new Error("Tax calculation failed internally.");
       }
       console.log(`TDS Analysis: Demo Estimated Total Tax = ${totalTaxPayable}`);
       // --- End Calculations ---

       // 4. Prepare Response
       const analysisResult = {
         message: "DEMONSTRATION tax analysis from TDS page data. Assumes New Regime FY 2024-25. Logic is SIMPLIFIED, likely INACCURATE. DO NOT USE FOR FINANCIAL DECISIONS.",
         calculationTimestamp: new Date().toISOString(),
         summary: {
           totalReportedIncome: totalIncome.toFixed(2),
           standardDeductionApplied: standardDeduction.toFixed(2),
           totalOtherDeductionsClaimed: totalDeductionsClaimed.toFixed(2),
           calculatedTaxableIncome: taxableIncomeForSlabs.toFixed(2),
           estimatedTotalTaxPayable: totalTaxPayable.toFixed(2), // Contains cess
           // Add more details from taxDetails if needed
           // calculatedTaxBeforeCess: taxDetails.calculatedTaxBeforeCess.toFixed(2),
           // cessAmount: taxDetails.cessAmount.toFixed(2),
           // rebateApplied_87A_Simplified: taxDetails.rebateApplied_87A_Simplified.toFixed(2),
         },
         // taxBreakdown: taxDetails.taxBreakdown, // Optionally include slab breakdown
         incomeSourcesUsed: incomeSourcesArray, // Data used from income_sources table
         deductionsUsed: deductionsArray, // Data used from tax_deductions table
       };
       console.log("TDS Analysis: Sending analysis response.");
       res.status(200).json(analysisResult);

     } catch (error) {
        // Catch errors from DB queries or the tax calculation function
        console.error('Error during TDS analysis (simulator):', error);
        if (connection) connection.release();
        // Send back the specific error message if available, otherwise generic
        res.status(500).json({ message: error.message || 'Internal server error during TDS analysis.' });
     }
});
// --- End TDS Analysis Route ---


// --- Start Server ---
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
// --- End Start Server ---

