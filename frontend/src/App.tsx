import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/layout/Navbar';

// Lazy load components
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Employees = lazy(() => import('./pages/Employees'));
const EmployeeView = lazy(() => import('./pages/EmployeeView'));
const EmployeeEdit = lazy(() => import('./pages/EmployeeEdit'));
const TimeRecords = lazy(() => import('./pages/TimeRecords'));
const Reports = lazy(() => import('./pages/Reports'));
const CheckIn = lazy(() => import('./pages/CheckIn'));
const CheckOut = lazy(() => import('./pages/CheckOut'));

// Loading component for suspense fallback
const LoadingComponent = () => (
  <div className="d-flex justify-content-center p-5">
    <div className="spinner-border text-primary" role="status">
      <span className="visually-hidden">Загрузка...</span>
    </div>
  </div>
);

const App: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Имитация загрузки приложения
    const timer = setTimeout(() => {
      setLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  // Загрузочный экран
  if (loading) {
    return (
      <div className="loading-screen d-flex align-items-center justify-content-center" style={{ height: '100vh', backgroundColor: '#f8f9fa' }}>
        <div className="text-center">
          <div className="spinner-grow text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Загрузка...</span>
          </div>
          <h5 className="text-muted">Загрузка системы учета времени...</h5>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Navbar />
      <div className="main-content">
        <div className="container">
          <Suspense fallback={<LoadingComponent />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/employees" element={<Employees />} />
              <Route path="/employees/new" element={<EmployeeEdit />} />
              <Route path="/employees/:id" element={<EmployeeView />} />
              <Route path="/employees/:id/edit" element={<EmployeeEdit />} />
              <Route path="/time-records" element={<TimeRecords />} />
              <Route path="/time-records/check-in" element={<CheckIn />} />
              <Route path="/time-records/check-out" element={<CheckOut />} />
              <Route path="/reports" element={<Reports />} />
            </Routes>
          </Suspense>
        </div>
      </div>
      <footer className="footer bg-white py-3 border-top mt-auto">
        <div className="container">
          <div className="row">
            <div className="col-md-6">
              <p className="text-muted mb-0">&copy; {new Date().getFullYear()} Система учета рабочего времени</p>
            </div>
            <div className="col-md-6 text-md-end">
              <p className="text-muted mb-0">
                <i className="bi bi-clock me-1"></i> Версия 1.0
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App; 