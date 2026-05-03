import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/layout/Header';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import './styles/global.css';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="*"
          element={
            <div className="app">
              <Header />
              <main className="app-main">
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </main>
            </div>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
