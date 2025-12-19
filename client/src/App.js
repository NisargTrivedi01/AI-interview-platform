import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Home from './components/Home';  
import LoginPage from './components/LoginPage';  
import SignupPage from './components/SignupPage';  
import Dashboard from './components/Dashboard';  
import CodingRound from './pages/CodingRound';
import AptitudeRound from './pages/AptitudeRound';
import TechnicalRound from './pages/TechnicalRound';
import HRRound from './pages/HRRound';
import InterviewPage from './pages/InterviewPage';
import SelectRound from './components/SelectRound';

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }
  
  return user ? children : <Navigate to="/login" />;
};

// Public Route component (redirect to dashboard if already logged in)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }
  
  return user ? <Navigate to="/dashboard" /> : children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            } />
            <Route path="/signup" element={
              <PublicRoute>
                <SignupPage />
              </PublicRoute>
            } />
            
            {/* Protected routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/interview" element={<InterviewPage />} />
            <Route path="/select-round" element={<SelectRound />} />
            <Route path="/coding-round" element={
              <ProtectedRoute>
                <CodingRound />
              </ProtectedRoute>
            } />
            <Route path="/aptitude-round" element={
              <ProtectedRoute>
                <AptitudeRound />
              </ProtectedRoute>
            } />
            <Route path="/technical-round" element={
              <ProtectedRoute>
                <TechnicalRound />
              </ProtectedRoute>
            } />
            <Route path="/hr-round" element={
              <ProtectedRoute>
                <HRRound />
              </ProtectedRoute>
            } />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;