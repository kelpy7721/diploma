import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getTimeRecords } from '../services/api';
import { TimeRecord } from '../types';
import { formatMoscowTime, getCurrentMoscowDate } from '../utils/dateUtils';

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [recentRecords, setRecentRecords] = useState<TimeRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalHoursToday: 0,
    activeEmployees: 0,
    pendingCheckins: 0,
  });

  useEffect(() => {
    const loadRecords = async () => {
      try {
        const response = await getTimeRecords(1, 5);
        setRecentRecords(response.items);
        
        // Расчет статистики (демонстрационные значения)
        const today = new Date().toISOString().split('T')[0];
        let hoursToday = 0;
        let activeCheckins = 0;
        
        response.items.forEach(record => {
          if (record.check_in.startsWith(today)) {
            hoursToday += record.duration_hours;
            if (!record.check_out) activeCheckins++;
          }
        });
        
        setStats({
          totalHoursToday: hoursToday,
          activeEmployees: activeCheckins,
          pendingCheckins: Math.floor(Math.random() * 5), // Демо данные
        });
        
        setLoading(false);
      } catch (err) {
        setError('Ошибка при загрузке данных');
        setLoading(false);
      }
    };

    loadRecords();
  }, []);

  return (
    <div className="dashboard">
      <div className="welcome-section mb-4">
        <div className="row align-items-center">
          <div className="col">
            <h2>Панель управления</h2>
            <p className="text-muted">
              <i className="bi bi-calendar-event me-2"></i>
              {getCurrentMoscowDate()}
            </p>
          </div>
        </div>
      </div>

      {/* Статистика */}
      <div className="row mb-4">
        <div className="col-md-4 mb-3 mb-md-0">
          <div className="card dashboard-card h-100 border-start border-primary border-4">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="bg-light-primary rounded-circle p-3 me-3">
                  <i className="bi bi-clock text-primary" style={{ fontSize: '1.5rem' }}></i>
                </div>
                <div>
                  <h6 className="text-muted mb-1">Часов сегодня</h6>
                  <h3 className="mb-0">{stats.totalHoursToday.toFixed(1)}</h3>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4 mb-3 mb-md-0">
          <div className="card dashboard-card h-100 border-start border-success border-4">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="bg-light-success rounded-circle p-3 me-3">
                  <i className="bi bi-people text-success" style={{ fontSize: '1.5rem' }}></i>
                </div>
                <div>
                  <h6 className="text-muted mb-1">Сотрудников на рабочем месте</h6>
                  <h3 className="mb-0">{stats.activeEmployees}</h3>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card dashboard-card h-100 border-start border-warning border-4">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="bg-light-warning rounded-circle p-3 me-3">
                  <i className="bi bi-exclamation-triangle text-warning" style={{ fontSize: '1.5rem' }}></i>
                </div>
                <div>
                  <h6 className="text-muted mb-1">Ожидают регистрации</h6>
                  <h3 className="mb-0">{stats.pendingCheckins}</h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-md-8 mb-4">
          <div className="card h-100 dashboard-card shadow-sm">
            <div className="card-header bg-white d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0">
                <i className="bi bi-clock-history me-2 text-primary"></i>
                Последние записи
              </h5>
              <Link to="/time-records" className="btn btn-sm btn-outline-primary">Все записи</Link>
            </div>
            <div className="card-body">
              {loading ? (
                <div className="d-flex justify-content-center align-items-center h-100">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Загрузка...</span>
                  </div>
                </div>
              ) : error ? (
                <div className="alert alert-danger">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  {error}
                </div>
              ) : recentRecords.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th><i className="bi bi-person me-1"></i>Сотрудник</th>
                        <th><i className="bi bi-box-arrow-in-right me-1"></i>Начало</th>
                        <th><i className="bi bi-box-arrow-left me-1"></i>Конец</th>
                        <th><i className="bi bi-hourglass-split me-1"></i>Часов</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentRecords.map((record) => (
                        <tr key={record.id}>
                          <td>
                            <div className="d-flex align-items-center">
                              <div className="avatar rounded-circle bg-light text-primary me-2 d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px' }}>
                                {record.employee_name.charAt(0).toUpperCase()}
                              </div>
                              {record.employee_name}
                            </div>
                          </td>
                          <td>{formatMoscowTime(record.check_in)}</td>
                          <td>
                            {record.check_out
                              ? formatMoscowTime(record.check_out)
                              : <span className="badge bg-success">В процессе</span>}
                          </td>
                          <td>
                            <span className="hours-badge">{record.duration_hours.toFixed(1)} ч</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-5">
                  <i className="bi bi-calendar-x text-muted" style={{ fontSize: '3rem' }}></i>
                  <p className="mt-3 text-muted">Нет записей</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-md-4 mb-4">
          <div className="card h-100 dashboard-card shadow-sm">
            <div className="card-header bg-white">
              <h5 className="card-title mb-0">
                <i className="bi bi-lightning-charge me-2 text-primary"></i>
                Быстрые действия
              </h5>
            </div>
            <div className="card-body">
              <div className="d-grid gap-3">
                <Link to="/time-records/check-in" className="btn btn-action">
                  <i className="bi bi-box-arrow-in-right me-2"></i>
                  Отметить приход
                </Link>
                <Link to="/time-records/check-out" className="btn btn-action">
                  <i className="bi bi-box-arrow-left me-2"></i>
                  Отметить уход
                </Link>
                <Link to="/reports" className="btn btn-action">
                  <i className="bi bi-graph-up me-2"></i>
                  Сформировать отчет
                </Link>
                <Link to="/employees" className="btn btn-action">
                  <i className="bi bi-people me-2"></i>
                  Управление сотрудниками
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 