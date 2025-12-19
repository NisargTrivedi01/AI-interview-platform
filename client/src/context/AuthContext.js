import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const API = "http://localhost:5000/api/auth";

  // Check if user is logged in on app start
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('userId');
      
      if (token && userId) {
        try {
          // Verify token with backend
          const response = await axios.get(`${API}/verify`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (response.data.success) {
            setUser({
              id: userId,
              name: response.data.user.name,
              email: response.data.user.email
            });
          } else {
            // Token is invalid
            localStorage.removeItem('token');
            localStorage.removeItem('userId');
          }
        } catch (error) {
          console.error('Auth verification failed:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('userId');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  // 🆕 FIXED: Login function with proper redirect handling
  const login = async (email, password) => {
    try {
      setError('');
      setLoading(true);
      
      console.log('🔐 Attempting login for:', email);
      
      const response = await axios.post(`${API}/login`, {
        email,
        password
      }, {
        timeout: 10000 // 10 second timeout
      });

      console.log('✅ Login response:', response.data);

      if (response.data.success) {
        const { token, user } = response.data;
        
        // Store auth data
        localStorage.setItem('token', token);
        localStorage.setItem('userId', user.id);
        
        // Set user state
        setUser({
          id: user.id,
          name: user.name,
          email: user.email
        });
        
        console.log('🚀 Login successful, user set:', user);
        return { success: true };
      } else {
        throw new Error(response.data.message || 'Login failed');
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      
      let errorMessage = 'Login failed. Please try again.';
      
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Server is taking too long to respond. Please check your connection.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message.includes('Network Error')) {
        errorMessage = 'Cannot connect to server. Please make sure the backend is running on port 5000.';
      }
      
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const signup = async (name, email, password) => {
    try {
      setError('');
      setLoading(true);
      
      const response = await axios.post(`${API}/signup`, {
        name,
        email,
        password
      });

      if (response.data.success) {
        const { token, user } = response.data;
        
        localStorage.setItem('token', token);
        localStorage.setItem('userId', user.id);
        
        setUser({
          id: user.id,
          name: user.name,
          email: user.email
        });
        
        return { success: true };
      } else {
        throw new Error(response.data.message || 'Signup failed');
      }
    } catch (error) {
      console.error('Signup error:', error);
      const errorMessage = error.response?.data?.message || 'Signup failed. Please try again.';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('interviewId');
    localStorage.removeItem('role');
    localStorage.removeItem('selectedRounds');
    setUser(null);
    setError('');
  };

  const value = {
    user,
    login,
    signup,
    logout,
    loading,
    error,
    setError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};