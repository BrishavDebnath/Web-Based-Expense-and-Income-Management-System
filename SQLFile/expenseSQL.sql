CREATE DATABASE IF NOT EXISTS expense_tracker_db;
USE expense_tracker_db;
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL, -- Store the long hash here
    name VARCHAR(255),             -- Optional: add if needed
    role VARCHAR(50) DEFAULT 'Basic User', -- Optional: add if needed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
select *from users;
delete from users where email="brishavdevnath@gmail.com";
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    -- Optional: add a type ('income'/'expense') if categories are type-specific
    -- type ENUM('income', 'expense')
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Example Expense Categories from SRS 3.2.2
INSERT IGNORE INTO categories (name, description) VALUES
('Food', 'Expenses related to food and groceries'),
('Travel', 'Expenses related to commuting and travel'),
('Rent', 'Housing rent expenses'),
('Utilities', 'Expenses for utilities like electricity, water, internet'),
('Investments', 'Money allocated to investments'),
('Entertainment', 'Expenses for leisure and entertainment'),
('Health', 'Expenses related to healthcare'),
('Miscellaneous', 'Other uncategorized expenses');
-- Example Income Category (You might want more)
INSERT IGNORE INTO categories (name, description) VALUES
('Salary', 'Regular income from employment');
-- Add other income categories like 'Freelance', 'Investment Returns' etc. if needed
CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    amount DECIMAL(10, 2) NOT NULL, -- Suitable for currency (e.g., up to 99,999,999.99)
    type ENUM('income', 'expense') NOT NULL, -- Type of transaction
    transaction_date DATE NOT NULL, -- Date the transaction occurred
    description TEXT,
    user_id INT NOT NULL, -- Foreign Key linking to the user
    category_id INT NOT NULL, -- Foreign Key linking to the category
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- Optional: track updates

    -- Define Foreign Key constraints
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, -- If user is deleted, delete their transactions
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT -- Prevent deleting category if transactions use it
);
select *from transactions;
SELECT * FROM transactions WHERE id = 1;
SELECT * FROM transactions WHERE id = 1 AND user_id = 2;
CREATE TABLE IF NOT EXISTS tds_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE, -- Each user has one set of TDS data
    -- Store complex details as JSON initially for flexibility
    -- Alternatively, create separate tables for income_sources and deductions linked by user_id
    income_sources JSON,
    -- Example JSON structure: [{"sourceType": "Salary", "annualAmount": 600000}, {"sourceType": "Freelance", "annualEstimate": 100000}]
    deductions JSON,
    -- Example JSON structure: [{"section": "80C", "description": "ELSS Investment", "amount": 50000}, {"section": "80D", "description": "Medical Insurance", "amount": 25000}]
    estimated_tds DECIMAL(12, 2), -- To store the calculated result later
    last_calculated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS income_sources (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,              -- Foreign key to the users table
    source_name VARCHAR(255) NOT NULL, -- e.g., 'Salary', 'Freelance Project X', 'Interest Income'
    amount DECIMAL(15, 2) NOT NULL,   -- The amount of income
    type VARCHAR(100),                 -- e.g., 'Salary', 'Freelance', 'Investment', 'Other'
    date_received DATE,                -- Optional: When the income was received
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE -- Link to users table
);

CREATE TABLE IF NOT EXISTS tax_deductions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,              -- Foreign key to the users table
    section VARCHAR(50),               -- e.g., '80C', '80D', 'HRA'
    description VARCHAR(255) NOT NULL, -- e.g., 'ELSS Investment', 'Medical Insurance Premium'
    amount DECIMAL(15, 2) NOT NULL,   -- The amount of deduction claimed/invested
    date_incurred DATE,                -- Optional: When the expense/investment was made
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE -- Link to users table
);
select *from transactions;