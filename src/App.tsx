import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { ToastProvider } from './lib/ToastContext';
import { AuthProvider, useAuth } from './AuthContext';
import { ProtectedRoute } from './ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Coaches from './pages/Coaches';
import Sessions from './pages/Sessions';
import Bookings from './pages/Bookings';
import Attendance from './pages/Attendance';
import Payments from './pages/Payments';
import Reports from './pages/Reports';
import Login from './pages/Login';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4" dir="rtl">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg animate-pulse">
          <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-slate-500 font-bold">جاري تحميل الأكاديمية...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-['Cairo']" dir="rtl">
      {user && <Sidebar />}
      <div className="flex-1 flex flex-col min-w-0">
        {user && <Navbar />}
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            <Routes>
              <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
              
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/students" element={<ProtectedRoute requiredRole="admin"><Students /></ProtectedRoute>} />
              <Route path="/coaches" element={<ProtectedRoute requiredRole="admin"><Coaches /></ProtectedRoute>} />
              <Route path="/sessions" element={<ProtectedRoute requiredRole="admin"><Sessions /></ProtectedRoute>} />
              <Route path="/bookings" element={<ProtectedRoute><Bookings /></ProtectedRoute>} />
              <Route path="/attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
              <Route path="/payments" element={<ProtectedRoute requiredRole="admin"><Payments /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute requiredRole="admin"><Reports /></ProtectedRoute>} />
              
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <ToastProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ToastProvider>
    </Router>
  );
}
