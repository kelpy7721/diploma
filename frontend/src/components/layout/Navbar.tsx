import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar: React.FC = () => {
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState<boolean>(false);

  // Обработка скролла для изменения вида навбара
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`navbar navbar-expand-lg navbar-dark ${isScrolled ? 'bg-dark' : 'bg-primary'} mb-4`} 
         style={{ 
           transition: 'all 0.3s ease',
           boxShadow: isScrolled ? '0 5px 15px rgba(0,0,0,0.1)' : 'none',
         }}>
      <div className="container">
        <Link className="navbar-brand d-flex align-items-center" to="/">
          <i className="bi bi-clock-history me-2" style={{ fontSize: '1.2rem' }}></i>
          <span>Система учёта рабочего времени</span>
        </Link>
        <button 
          className="navbar-toggler" 
          type="button" 
          data-bs-toggle="collapse" 
          data-bs-target="#navbarNav"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto">
            <li className="nav-item">
              <Link className={`nav-link ${location.pathname === '/' ? 'active' : ''}`} to="/">
                <i className="bi bi-house-door me-1"></i>
                Главная
              </Link>
            </li>
            <li className="nav-item">
              <Link className={`nav-link ${location.pathname.startsWith('/employees') ? 'active' : ''}`} to="/employees">
                <i className="bi bi-people me-1"></i>
                Сотрудники
              </Link>
            </li>
            <li className="nav-item">
              <Link className={`nav-link ${location.pathname.startsWith('/time-records') ? 'active' : ''}`} to="/time-records">
                <i className="bi bi-clipboard-check me-1"></i>
                Учёт времени
              </Link>
            </li>
            <li className="nav-item">
              <Link className={`nav-link ${location.pathname.startsWith('/reports') ? 'active' : ''}`} to="/reports">
                <i className="bi bi-graph-up me-1"></i>
                Отчёты
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 