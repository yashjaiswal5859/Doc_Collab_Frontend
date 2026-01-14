import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import DocumentsList from './pages/DocumentsList';
import DocumentEditor from './pages/DocumentEditor';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/documents" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/documents"
            element={
              <PrivateRoute>
                <DocumentsList />
              </PrivateRoute>
            }
          />
          <Route
            path="/editor/:id"
            element={
              <PrivateRoute>
                <DocumentEditor />
              </PrivateRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
