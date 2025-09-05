import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ReportsPage from './pages/ReportsPage';
import LoginPage from './pages/LoginPage';
import GamificationPage from './pages/GamificationPage';

export default function App(){
  return (
    <Router>
      <Routes>
        <Route path='/Dashboard' element={<Dashboard/>} />
                <Route path='/' element={<LoginPage/>} />
        <Route path='/detailreport' element={<GamificationPage/>} />

        <Route path='/reports' element={<ReportsPage/>} />
      </Routes>
    </Router>
  );
}
