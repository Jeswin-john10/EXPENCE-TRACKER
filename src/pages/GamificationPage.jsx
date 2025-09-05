import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import { useNavigate } from "react-router-dom";

// Neon glow style
const neonText = {
  textShadow: "0 0 10px #0ff, 0 0 20px #0ff, 0 0 40px #0ff",
};

export default function GamificationPage() {
  const navigate = useNavigate();
  // Define API constant locally since it's not exported from ReportsPage
  const API = import.meta.env.VITE_API_URL || "https://expence-tracker-backend-klge.onrender.com";
  const [transactions, setTransactions] = useState([]);
  const [xp, setXp] = useState(1200);
  const [level, setLevel] = useState(1);
  const [leaderboard, setLeaderboard] = useState([]);
  const [monthlyData, setMonthlyData] = useState({});
  const [dailyData, setDailyData] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("monthly"); // "monthly" or "daily"

  useEffect(() => {
    fetchTransactions();
    fetchLeaderboard();
  }, []);

  // Go back function
  const handleGoBack = () => {
    navigate(-1); // Go back to previous page
  };

  // Fetch transactions from your API
  async function fetchTransactions() {
    try {
      const res = await axios.get(API + "/api/transactions");
      setTransactions(res.data || []);
      processMonthlyData(res.data || []);
      processDailyData(res.data || []);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch transactions:", err.message);
      setLoading(false);
    }
  }

  // Fetch leaderboard from API
  async function fetchLeaderboard() {
    try {
      // This would be your actual API endpoint for leaderboard
      const res = await axios.get(API + "/api/leaderboard");
      setLeaderboard(res.data || []);
    } catch (err) {
      console.error("Failed to fetch leaderboard:", err.message);
      // Fallback to generating from transactions if API not available
      generateLeaderboardFromTransactions();
    }
  }

  // Generate leaderboard from transactions data as fallback
  function generateLeaderboardFromTransactions() {
    // In a real app, you would have user data
    // This is a simplified version using transaction data
    const userSavings = {};
    
    transactions.forEach((transaction) => {
      // Group by user (in a real app, you'd have user IDs)
      const user = transaction.userId || "You"; // Default to "You" if no userId
      
      if (!userSavings[user]) {
        userSavings[user] = 0;
      }
      
      if (transaction.type === "income") {
        userSavings[user] += Number(transaction.amount || 0);
      } else if (transaction.type === "expense") {
        userSavings[user] -= Number(transaction.amount || 0);
      }
    });
    
    // Convert to leaderboard format
    const leaderboardData = Object.entries(userSavings)
      .map(([name, savings], index) => ({
        id: index + 1,
        name,
        savings: Math.max(0, savings), // Ensure non-negative
        xp: Math.max(0, Math.floor(savings / 10))
      }))
      .sort((a, b) => b.savings - a.savings);
    
    setLeaderboard(leaderboardData);
  }

  // Process monthly data for savings and expenses
  function processMonthlyData(transactions) {
    const monthlySummary = {};
    
    transactions.forEach((transaction) => {
      const date = new Date(transaction.date);
      const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      
      if (!monthlySummary[monthYear]) {
        monthlySummary[monthYear] = {
          income: 0,
          expense: 0,
          savings: 0
        };
      }
      
      if (transaction.type === "income") {
        monthlySummary[monthYear].income += Number(transaction.amount || 0);
      } else if (transaction.type === "expense") {
        monthlySummary[monthYear].expense += Number(transaction.amount || 0);
      }
      
      monthlySummary[monthYear].savings = monthlySummary[monthYear].income - monthlySummary[monthYear].expense;
    });
    
    setMonthlyData(monthlySummary);
    
    // Calculate XP based on savings (1 XP per 10 rupees saved)
    const totalSavings = Object.values(monthlySummary).reduce((total, month) => total + month.savings, 0);
    const calculatedXp = Math.max(1200, Math.floor(totalSavings / 10)); // Minimum 1200 XP
    setXp(calculatedXp);
    setLevel(Math.floor(calculatedXp / 1000) + 1);
  }

  // Process daily data for savings and expenses
  function processDailyData(transactions) {
    const dailySummary = {};
    
    transactions.forEach((transaction) => {
      const date = new Date(transaction.date);
      const dayKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
      
      if (!dailySummary[dayKey]) {
        dailySummary[dayKey] = {
          income: 0,
          expense: 0,
          savings: 0,
          date: dayKey
        };
      }
      
      if (transaction.type === "income") {
        dailySummary[dayKey].income += Number(transaction.amount || 0);
      } else if (transaction.type === "expense") {
        dailySummary[dayKey].expense += Number(transaction.amount || 0);
      }
      
      dailySummary[dayKey].savings = dailySummary[dayKey].income - dailySummary[dayKey].expense;
    });
    
    setDailyData(dailySummary);
  }

  // Get current month's savings
  function getCurrentMonthSavings() {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    return monthlyData[currentMonth] ? monthlyData[currentMonth].savings : 0;
  }

  // Get today's savings
  function getTodaySavings() {
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
    return dailyData[todayKey] ? dailyData[todayKey].savings : 0;
  }

  // Get best savings month
  function getBestSavingsMonth() {
    let bestMonth = null;
    let bestSavings = -Infinity;
    
    for (const [month, data] of Object.entries(monthlyData)) {
      if (data.savings > bestSavings) {
        bestSavings = data.savings;
        bestMonth = month;
      }
    }
    
    return bestMonth ? { month: bestMonth, savings: bestSavings } : null;
  }

  // Get best savings day
  function getBestSavingsDay() {
    let bestDay = null;
    let bestSavings = -Infinity;
    
    for (const [day, data] of Object.entries(dailyData)) {
      if (data.savings > bestSavings) {
        bestSavings = data.savings;
        bestDay = day;
      }
    }
    
    return bestDay ? { day: bestDay, savings: bestSavings } : null;
  }

  // Get highest expense month
  function getHighestExpenseMonth() {
    let highestMonth = null;
    let highestExpense = -Infinity;
    
    for (const [month, data] of Object.entries(monthlyData)) {
      if (data.expense > highestExpense) {
        highestExpense = data.expense;
        highestMonth = month;
      }
    }
    
    return highestMonth ? { month: highestMonth, expense: highestExpense } : null;
  }

  // Get highest expense day
  function getHighestExpenseDay() {
    let highestDay = null;
    let highestExpense = -Infinity;
    
    for (const [day, data] of Object.entries(dailyData)) {
      if (data.expense > highestExpense) {
        highestExpense = data.expense;
        highestDay = day;
      }
    }
    
    return highestDay ? { day: highestDay, expense: highestExpense } : null;
  }

  // Get lowest expense month
  function getLowestExpenseMonth() {
    let lowestMonth = null;
    let lowestExpense = Infinity;
    
    for (const [month, data] of Object.entries(monthlyData)) {
      if (data.expense < lowestExpense && data.expense > 0) {
        lowestExpense = data.expense;
        lowestMonth = month;
      }
    }
    
    return lowestMonth ? { month: lowestMonth, expense: lowestExpense } : null;
  }

  // Get lowest expense day
  function getLowestExpenseDay() {
    let lowestDay = null;
    let lowestExpense = Infinity;
    
    for (const [day, data] of Object.entries(dailyData)) {
      if (data.expense < lowestExpense && data.expense > 0) {
        lowestExpense = data.expense;
        lowestDay = day;
      }
    }
    
    return lowestDay ? { day: lowestDay, expense: lowestExpense } : null;
  }

  // Calculate badges based on real data
  function calculateBadges() {
    const badges = [];
    const currentSavings = getCurrentMonthSavings();
    const todaySavings = getTodaySavings();
    const bestMonth = getBestSavingsMonth();
    const bestDay = getBestSavingsDay();
    const expenseMonth = getHighestExpenseMonth();
    const expenseDay = getHighestExpenseDay();
    const lowExpenseMonth = getLowestExpenseMonth();
    const lowExpenseDay = getLowestExpenseDay();
    const totalTransactions = transactions.length;
    
    // Saver Pro badge - if saved more than 5000 this month
    if (currentSavings > 5000) {
      badges.push({
        id: 1,
        title: "💰 Saver Pro",
        desc: `Saved ₹${currentSavings.toLocaleString()} this month`,
        color: "#00ffcc"
      });
    }
    
    // Daily Saver badge - if saved today
    if (todaySavings > 0) {
      badges.push({
        id: 7,
        title: "📅 Daily Saver",
        desc: `Saved ₹${todaySavings.toLocaleString()} today`,
        color: "#00bfff"
      });
    }
    
    // Budget Master badge - if expenses are less than 60% of income
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    if (monthlyData[currentMonth] && monthlyData[currentMonth].income > 0) {
      const expenseRatio = monthlyData[currentMonth].expense / monthlyData[currentMonth].income;
      if (expenseRatio < 0.6) {
        badges.push({
          id: 2,
          title: "📊 Budget Master",
          desc: `Spent only ${(expenseRatio * 100).toFixed(0)}% of income`,
          color: "#fddb3a"
        });
      }
    }
    
    // Consistency badge - if has transactions for 3+ consecutive months
    const months = Object.keys(monthlyData).sort();
    if (months.length >= 3) {
      badges.push({
        id: 3,
        title: "⏱️ Consistency King",
        desc: `Tracking for ${months.length} months`,
        color: "#4cafef"
      });
    }
    
    // Expense awareness badge - if user has viewed expense reports
    if (totalTransactions > 10) {
      badges.push({
        id: 4,
        title: "📈 Finance Tracker",
        desc: `Logged ${totalTransactions} transactions`,
        color: "#9c27b0"
      });
    }
    
    // Add best month badge if applicable
    if (bestMonth && bestMonth.savings > 10000) {
      badges.push({
        id: 5,
        title: "🏆 Savings Champion",
        desc: `Saved ₹${bestMonth.savings.toLocaleString()} in ${bestMonth.month}`,
        color: "#ff0055"
      });
    }
    
    // Add best day badge if applicable
    if (bestDay && bestDay.savings > 5000) {
      badges.push({
        id: 8,
        title: "⭐ Star Day",
        desc: `Saved ₹${bestDay.savings.toLocaleString()} on ${bestDay.day}`,
        color: "#ff8c00"
      });
    }
    
    // Add low expense month badge
    if (lowExpenseMonth) {
      badges.push({
        id: 6,
        title: "💸 Frugal Spender",
        desc: `Only spent ₹${lowExpenseMonth.expense.toLocaleString()} in ${lowExpenseMonth.month}`,
        color: "#4caf50"
      });
    }
    
    // Add low expense day badge
    if (lowExpenseDay) {
      badges.push({
        id: 9,
        title: "🌱 Minimalist Day",
        desc: `Only spent ₹${lowExpenseDay.expense.toLocaleString()} on ${lowExpenseDay.day}`,
        color: "#32cd32"
      });
    }
    
    return badges;
  }

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0d0d0d, #1a1a1a, #000)",
        color: "#fff",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "Consolas, monospace"
      }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1 }}
          style={{ fontSize: "2rem" }}
        >
          ⏳
        </motion.div>
      </div>
    );
  }

  const badges = calculateBadges();
  const bestMonth = getBestSavingsMonth();
  const bestDay = getBestSavingsDay();
  const expenseMonth = getHighestExpenseMonth();
  const expenseDay = getHighestExpenseDay();
  const lowExpenseMonth = getLowestExpenseMonth();
  const lowExpenseDay = getLowestExpenseDay();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0d0d0d, #1a1a1a, #000)",
        color: "#fff",
        fontFamily: "Consolas, monospace",
        padding: "2rem",
        textAlign: "center",
        position: "relative",
      }}
    >
      {/* Go Back Button */}
      <motion.button
        onClick={handleGoBack}
        style={{
          position: "absolute",
          top: "1rem",
          left: "1rem",
          background: "rgba(0, 255, 255, 0.1)",
          border: "1px solid #0ff",
          color: "#0ff",
          padding: "0.5rem 1rem",
          borderRadius: "8px",
          cursor: "pointer",
          fontFamily: "Consolas, monospace",
          boxShadow: "0 0 10px #0ff",
        }}
        whileHover={{ scale: 1.05, background: "rgba(0, 255, 255, 0.2)" }}
        whileTap={{ scale: 0.95 }}
      >
        ← Back
      </motion.button>

      {/* Page Title */}
      <motion.h1
        style={{ fontSize: "2.5rem", marginBottom: "1.5rem", ...neonText }}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ repeat: Infinity, duration: 3 }}
      >
        🎮 Finance Gamification
      </motion.h1>

      {/* XP + Level */}
      <div style={{ marginBottom: "2rem" }}>
        <h2 style={{ ...neonText }}>Level {level} Financial Wizard</h2>
        <div
          style={{
            background: "#111",
            borderRadius: "12px",
            height: "25px",
            width: "80%",
            margin: "1rem auto",
            overflow: "hidden",
            boxShadow: "0 0 10px #0ff",
          }}
        >
          <motion.div
            style={{
              height: "100%",
              background: "linear-gradient(90deg, #0ff, #00f)",
            }}
            initial={{ width: 0 }}
            animate={{ width: `${xp % 1000 / 10}%` }}
            transition={{ duration: 1 }}
          />
        </div>
        <p>{xp % 1000} / 1000 XP</p>
        <p>Total Savings: ₹{Object.values(monthlyData).reduce((total, month) => total + month.savings, 0).toLocaleString()}</p>
      </div>

      {/* Monthly Stats */}
      <div style={{ display: "flex", justifyContent: "center", gap: "1rem", flexWrap: "wrap", marginBottom: "2rem" }}>
        <motion.div 
          style={{
            background: "#111",
            borderRadius: "12px",
            padding: "1rem",
            boxShadow: "0 0 15px #0ff",
            border: "1px solid #0ff",
            minWidth: "200px"
          }}
          whileHover={{ scale: 1.05 }}
        >
          <h3>This Month</h3>
          <p style={{ color: "#0ff", fontSize: "1.5rem" }}>
            ₹{getCurrentMonthSavings().toLocaleString()}
          </p>
          <p>Saved</p>
        </motion.div>

        <motion.div 
          style={{
            background: "#111",
            borderRadius: "12px",
            padding: "1rem",
            boxShadow: "0 0 15px #00bfff",
            border: "1px solid #00bfff",
            minWidth: "200px"
          }}
          whileHover={{ scale: 1.05 }}
        >
          <h3>Today</h3>
          <p style={{ color: "#00bfff", fontSize: "1.5rem" }}>
            ₹{getTodaySavings().toLocaleString()}
          </p>
          <p>Saved</p>
        </motion.div>

        {bestMonth && (
          <motion.div 
            style={{
              background: "#111",
              borderRadius: "12px",
              padding: "1rem",
              boxShadow: "0 0 15px #00ffcc",
              border: "1px solid #00ffcc",
              minWidth: "200px"
            }}
            whileHover={{ scale: 1.05 }}
          >
            <h3>Best Month</h3>
            <p style={{ color: "#00ffcc", fontSize: "1.5rem" }}>
              ₹{bestMonth.savings.toLocaleString()}
            </p>
            <p>{bestMonth.month}</p>
          </motion.div>
        )}

        {bestDay && (
          <motion.div 
            style={{
              background: "#111",
              borderRadius: "12px",
              padding: "1rem",
              boxShadow: "0 0 15px #ff8c00",
              border: "1px solid #ff8c00",
              minWidth: "200px"
            }}
            whileHover={{ scale: 1.05 }}
          >
            <h3>Best Day</h3>
            <p style={{ color: "#ff8c00", fontSize: "1.5rem" }}>
              ₹{bestDay.savings.toLocaleString()}
            </p>
            <p>{bestDay.day}</p>
          </motion.div>
        )}

        {expenseMonth && (
          <motion.div 
            style={{
              background: "#111",
              borderRadius: "12px",
              padding: "1rem",
              boxShadow: "0 0 15px #ff0055",
              border: "1px solid #ff0055",
              minWidth: "200px"
            }}
            whileHover={{ scale: 1.05 }}
          >
            <h3>Highest Spending Month</h3>
            <p style={{ color: "#ff0055", fontSize: "1.5rem" }}>
              ₹{expenseMonth.expense.toLocaleString()}
            </p>
            <p>{expenseMonth.month}</p>
          </motion.div>
        )}

        {expenseDay && (
          <motion.div 
            style={{
              background: "#111",
              borderRadius: "12px",
              padding: "1rem",
              boxShadow: "0 0 15px #ff0055",
              border: "1px solid #ff0055",
              minWidth: "200px"
            }}
            whileHover={{ scale: 1.05 }}
          >
            <h3>Highest Spending Day</h3>
            <p style={{ color: "#ff0055", fontSize: "1.5rem" }}>
              ₹{expenseDay.expense.toLocaleString()}
            </p>
            <p>{expenseDay.day}</p>
          </motion.div>
        )}

        {lowExpenseMonth && (
          <motion.div 
            style={{
              background: "#111",
              borderRadius: "12px",
              padding: "1rem",
              boxShadow: "0 0 15px #4caf50",
              border: "1px solid #4caf50",
              minWidth: "200px"
            }}
            whileHover={{ scale: 1.05 }}
          >
            <h3>Lowest Spending Month</h3>
            <p style={{ color: "#4caf50", fontSize: "1.5rem" }}>
              ₹{lowExpenseMonth.expense.toLocaleString()}
            </p>
            <p>{lowExpenseMonth.month}</p>
          </motion.div>
        )}

        {lowExpenseDay && (
          <motion.div 
            style={{
              background: "#111",
              borderRadius: "12px",
              padding: "1rem",
              boxShadow: "0 0 15px #32cd32",
              border: "1px solid #32cd32",
              minWidth: "200px"
            }}
            whileHover={{ scale: 1.05 }}
          >
            <h3>Lowest Spending Day</h3>
            <p style={{ color: "#32cd32", fontSize: "1.5rem" }}>
              ₹{lowExpenseDay.expense.toLocaleString()}
            </p>
            <p>{lowExpenseDay.day}</p>
          </motion.div>
        )}
      </div>

      {/* Badges */}
      <h3 style={{ marginBottom: "1rem", ...neonText }}>🏆 Achievements</h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1.5rem",
          padding: "1rem",
        }}
      >
        {badges.length > 0 ? badges.map((b) => (
          <motion.div
            key={b.id}
            style={{
              background: "#111",
              borderRadius: "16px",
              padding: "1.5rem",
              boxShadow: `0 0 15px ${b.color}`,
              border: `1px solid ${b.color}`,
            }}
            whileHover={{ scale: 1.05, rotate: 1 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h4 style={{ color: b.color, marginBottom: "0.5rem" }}>{b.title}</h4>
            <p style={{ fontSize: "0.9rem", color: "#ccc" }}>{b.desc}</p>
          </motion.div>
        )) : (
          <p>Complete financial tasks to earn badges!</p>
        )}
      </div>

      {/* Leaderboard */}
      <h3 style={{ margin: "2rem 0 1rem", ...neonText }}>🏅 Savings Leaderboard</h3>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        {leaderboard.length > 0 ? (
          leaderboard
            .sort((a, b) => b.savings - a.savings)
            .map((player, index) => (
              <motion.div
                key={player.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "#111",
                  borderRadius: "12px",
                  padding: "1rem 1.5rem",
                  marginBottom: "1rem",
                  border: `1px solid #0ff`,
                  boxShadow: "0 0 10px #0ff",
                  fontSize: "1.1rem",
                }}
                whileHover={{ scale: 1.02 }}
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <span>
                  {index + 1}. <strong>{player.name}</strong>
                </span>
                <span style={{ color: "#0ff" }}>₹{player.savings.toLocaleString()}</span>
              </motion.div>
            ))
        ) : (
          <p>No leaderboard data available</p>
        )}
      </div>

      {/* Performance Tabs */}
      <h3 style={{ margin: "2rem 0 1rem", ...neonText }}>📈 Performance Comparison</h3>
      
      {/* Tab Navigation */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "1rem" }}>
        <button
          onClick={() => setActiveTab("monthly")}
          style={{
            background: activeTab === "monthly" ? "#0ff" : "transparent",
            color: activeTab === "monthly" ? "#000" : "#0ff",
            border: "1px solid #0ff",
            padding: "0.5rem 1rem",
            borderRadius: "8px 0 0 8px",
            cursor: "pointer",
            fontFamily: "Consolas, monospace",
          }}
        >
          Monthly
        </button>
        <button
          onClick={() => setActiveTab("daily")}
          style={{
            background: activeTab === "daily" ? "#0ff" : "transparent",
            color: activeTab === "daily" ? "#000" : "#0ff",
            border: "1px solid #0ff",
            padding: "0.5rem 1rem",
            borderRadius: "0 8px 8px 0",
            cursor: "pointer",
            fontFamily: "Consolas, monospace",
          }}
        >
          Daily
        </button>
      </div>

      {/* Monthly Comparison Chart */}
      {activeTab === "monthly" && (
        <motion.div 
          style={{ maxWidth: 800, margin: "0 auto", background: "#111", borderRadius: "12px", padding: "1rem" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {Object.entries(monthlyData).map(([month, data]) => (
            <div key={month} style={{ marginBottom: "0.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                <span>{month}</span>
                <span>Savings: ₹{data.savings.toLocaleString()}</span>
              </div>
              <div style={{
                height: "20px",
                background: "linear-gradient(90deg, #ff0055, #00ffcc)",
                borderRadius: "10px",
                width: `${Math.min(100, (data.savings / (Object.values(monthlyData).reduce((max, m) => Math.max(max, m.savings), 0)) || 1) * 100)}%`
              }} />
            </div>
          ))}
        </motion.div>
      )}

      {/* Daily Comparison Chart */}
      {activeTab === "daily" && (
        <motion.div 
          style={{ maxWidth: 800, margin: "0 auto", background: "#111", borderRadius: "12px", padding: "1rem", maxHeight: "400px", overflowY: "auto" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {Object.entries(dailyData)
            .sort(([a], [b]) => new Date(b) - new Date(a)) // Sort by date descending
            .map(([day, data]) => (
              <div key={day} style={{ marginBottom: "0.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                  <span>{day}</span>
                  <span>Savings: ₹{data.savings.toLocaleString()}</span>
                </div>
                <div style={{
                  height: "15px",
                  background: data.savings >= 0 ? "linear-gradient(90deg, #00ffcc, #00bfff)" : "linear-gradient(90deg, #ff0055, #ff8c00)",
                  borderRadius: "10px",
                  width: `${Math.min(100, Math.abs(data.savings) / (Object.values(dailyData).reduce((max, d) => Math.max(max, Math.abs(d.savings)), 0) || 1) * 100)}%`
                }} />
              </div>
            ))}
        </motion.div>
      )}

      {/* Floating hacker animation */}
      <style>
        {`
        body {
          background: #0d0d0d;
        }
        .codeRain {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: -1;
          font-family: monospace;
          font-size: 14px;
          color: rgba(0, 255, 200, 0.2);
          white-space: pre;
          overflow: hidden;
          animation: rain 10s linear infinite;
        }
        @keyframes rain {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
      `}
      </style>
      <div className="codeRain">
        {`#include <finance>\nclass ExpenseTracker {\n   public: int budget;\n   void save();\n   void spend();\n};\n// Hacker mode active...\n`}
      </div>
    </div>
  );
}