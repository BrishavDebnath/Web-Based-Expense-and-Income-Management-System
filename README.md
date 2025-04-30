# Web-Based Expense and Income Management System

A full-stack web application designed to help users track, manage, and analyze their financial transactions efficiently. This system also provides graphical insights and features aimed at Tax Deducted at Source (TDS) optimization.

---

## 🌐 Technologies Used

- **Frontend:** React.js, CSS
- **Backend:** Node.js
- **Database:** MySQL
- **Other Libraries:**
  - Backend: Express, CORS, bcrypt, mysql2, jsonwebtoken
  - Frontend: Chart.js, React-Chartjs-2, React-Router-DOM

---

## ⚙️ Setup Instructions

### 🔧 Prerequisites

- [Node.js](https://nodejs.org/)
- [MySQL](https://www.mysql.com/)

### 📦 Install Dependencies

#### Backend

```bash
cd server
npm init -y
npm install express cors bcrypt mysql2 jsonwebtoken
```

#### Frontend

```bash
cd client
npm install
npm install chart.js react-chartjs-2
npm install react-router-dom
```

---

## 🚀 Running the Project

1. **Clone the Repository**

   ```bash
   git clone https://github.com/yourusername/your-repo-name.git
   ```

2. **Setup the Database**

   - Use MySQL to create a database.
   - Import the `.sql` file included in the project to create the required tables.
   - Refer to the Database Schema in the documentation for details.

3. **Configure Backend**

   - Open `server/server.js`
   - Around line 10, replace MySQL credentials with your own:

     ```js
     const db = mysql.createConnection({
       host: 'localhost',
       user: 'your-username',
       password: 'your-password',
       database: 'your-database-name'
     });
     ```

4. **Start the Application**

   - In **Terminal 1**:

     ```bash
     cd server
     node server.js
     ```

   - In **Terminal 2**:

     ```bash
     cd client
     npm start
     ```

5. **Open your browser**

   Visit `http://localhost:3000`

---

## 🧩 Features

- **User Authentication:** Secure sign-up and login.
- **Dashboard:** Overview of total income, expenses, and savings with charts.
- **Transaction Management:** Add/edit/delete financial transactions (type, category, date, description).
- **TDS Optimization:** Tools to analyze income sources (under development).
- **Investment Recommendations:** Planned feature for smart financial suggestions.
- **Responsive UI:** Works on desktop, tablet, and mobile devices.

---

## 🎯 Target Audience

- College students managing personal budgets
- Freelancers and working professionals
- Taxpayers interested in TDS optimization

---

## 🛠️ SDLC & Testing

- **SDLC Model:** Waterfall Model
- **Testing Methods:**
  - Unit Testing (transactions)
  - Integration Testing (frontend ↔ backend ↔ database)
  - UI Testing
  - Security Testing (login system)

---

## 🌐 Deployment

- The application currently runs on a local system.
- Deployment to a public platform is planned.

---

## 🔮 Future Enhancements

- Complete TDS feature implementation
- Mobile app version (React Native / Flutter)
- Automatic bank statement import
- AI-powered budgeting assistant
- SMS/Email notifications

---

## 👥 Team Members

- **Ritika Mathur** – Documentation & SRS
- **Brishav Debnath** – Full-stack Implementation
- **Akarsh Shukla** – Presentation (PPT)

---

## 📄 License

This project is for educational purposes only. All rights reserved by the respective team members.
