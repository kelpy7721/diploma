import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getEmployee, getTimeRecords, updateEmployee } from '../services/api';
import { Employee, TimeRecord } from '../types';

const EmployeeView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [recentRecords, setRecentRecords] = useState<TimeRecord[]>([]);
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const [updating, setUpdating] = useState<boolean>(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!id) {
          setError('ID сотрудника не указан');
          setLoading(false);
          return;
        }
        
        // Загружаем данные сотрудника
        const employeeData = await getEmployee(parseInt(id));
        setEmployee(employeeData);
        
        // Загружаем последние записи времени сотрудника
        const recordsResponse = await getTimeRecords(1, 5, parseInt(id));
        setRecentRecords(recordsResponse.items);
        
        setLoading(false);
      } catch (err) {
        setError('Ошибка при загрузке данных сотрудника');
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleStatusChange = async () => {
    if (!employee || !id) return;
    
    try {
      setUpdating(true);
      const updatedEmployee = await updateEmployee(parseInt(id), {
        is_active: !employee.is_active
      });
      
      setEmployee(updatedEmployee);
      setShowConfirmation(false);
      setMessage({
        type: 'success',
        text: `Сотрудник ${employee.is_active ? 'деактивирован' : 'активирован'} успешно`
      });
      
      // Скрываем сообщение через 3 секунды
      setTimeout(() => {
        setMessage(null);
      }, 3000);
    } catch (err) {
      setMessage({
        type: 'error',
        text: 'Ошибка при изменении статуса сотрудника'
      });
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadgeClass = (active: boolean): string => {
    return active ? 'bg-success' : 'bg-danger';
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Информация о сотруднике</h2>
        <div>
          {employee && (
            <>
              <Link to={`/employees/${employee.id}/edit`} className="btn btn-primary me-2">
                <i className="bi bi-pencil"></i> Редактировать
              </Link>
              <button
                className={`btn ${employee.is_active ? 'btn-outline-danger' : 'btn-outline-success'} me-2`}
                onClick={() => setShowConfirmation(true)}
              >
                <i className={`bi ${employee.is_active ? 'bi-person-x' : 'bi-person-check'} me-1`}></i>
                {employee.is_active ? 'Деактивировать' : 'Активировать'}
              </button>
            </>
          )}
          <Link to="/employees" className="btn btn-outline-secondary">
            <i className="bi bi-arrow-left"></i> Назад к списку
          </Link>
        </div>
      </div>

      {message && (
        <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-danger'} alert-dismissible fade show`}>
          <i className={`bi ${message.type === 'success' ? 'bi-check-circle' : 'bi-exclamation-triangle'} me-2`}></i>
          {message.text}
          <button type="button" className="btn-close" onClick={() => setMessage(null)}></button>
        </div>
      )}

      {showConfirmation && (
        <div className="alert alert-warning mb-4">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <strong>Подтверждение:</strong> Вы уверены, что хотите {employee?.is_active ? 'деактивировать' : 'активировать'} сотрудника?
            </div>
            <div>
              <button 
                className="btn btn-sm btn-warning me-2" 
                onClick={handleStatusChange}
                disabled={updating}
              >
                {updating ? (
                  <><span className="spinner-border spinner-border-sm me-1"></span> Обработка...</>
                ) : (
                  <>Да, подтверждаю</>
                )}
              </button>
              <button 
                className="btn btn-sm btn-secondary" 
                onClick={() => setShowConfirmation(false)}
                disabled={updating}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="d-flex justify-content-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Загрузка...</span>
          </div>
        </div>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : employee ? (
        <div className="card">
          <div className="card-body">
            <div className="row mb-4">
              <div className="col-md-2">
                <div className="employee-avatar bg-light rounded-circle d-flex justify-content-center align-items-center mb-3" style={{ width: '120px', height: '120px' }}>
                  <i className="bi bi-person" style={{ fontSize: '3rem' }}></i>
                </div>
                <div className={`badge ${getStatusBadgeClass(employee.is_active)} mb-2 d-inline-block px-3 py-2`}>
                  <i className={`bi ${employee.is_active ? 'bi-check-circle' : 'bi-x-circle'} me-1`}></i>
                  {employee.is_active ? 'Активен' : 'Неактивен'}
                </div>
              </div>
              <div className="col-md-10">
                <h3>{employee.first_name} {employee.last_name}</h3>
                <p className="text-muted mb-2">
                  <i className="bi bi-briefcase me-1"></i> 
                  {employee.position}
                </p>
                <p className="text-muted mb-3">
                  <i className="bi bi-building me-1"></i>
                  Отдел: {employee.department_name || 'Не указан'}
                </p>
                <hr />
                <div className="row">
                  <div className="col-md-6">
                    <p>
                      <strong><i className="bi bi-envelope me-1"></i> Email:</strong> 
                      <a href={`mailto:${employee.email}`} className="text-decoration-none ms-1">{employee.email}</a>
                    </p>
                    <p><strong><i className="bi bi-hash me-1"></i> ID:</strong> {employee.id}</p>
                  </div>
                  <div className="col-md-6">
                    <p><strong><i className="bi bi-calendar-plus me-1"></i> Дата создания:</strong> {formatDate(employee.created_at)}</p>
                    <p><strong><i className="bi bi-calendar-check me-1"></i> Дата обновления:</strong> {formatDate(employee.updated_at)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="row">
              <div className="col-12">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="mb-0"><i className="bi bi-clock-history me-2"></i>Последние записи времени</h5>
                  <Link to={`/time-records?employee_id=${employee.id}`} className="btn btn-sm btn-outline-primary">
                    <i className="bi bi-list me-1"></i> Все записи
                  </Link>
                </div>
                {recentRecords.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-sm table-bordered table-hover">
                      <thead className="table-light">
                        <tr>
                          <th>Дата</th>
                          <th>Приход</th>
                          <th>Уход</th>
                          <th>Время (ч)</th>
                          <th>Описание</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentRecords.map(record => (
                          <tr key={record.id}>
                            <td>{new Date(record.check_in).toLocaleDateString()}</td>
                            <td>{new Date(record.check_in).toLocaleTimeString()}</td>
                            <td>
                              {record.check_out
                                ? new Date(record.check_out).toLocaleTimeString()
                                : <span className="badge bg-warning text-dark">В процессе</span>}
                            </td>
                            <td>{record.duration_hours?.toFixed(2) || '-'}</td>
                            <td>{record.description || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="alert alert-info">
                    <i className="bi bi-info-circle me-2"></i>
                    Нет записей о рабочем времени
                  </div>
                )}
              </div>
            </div>

            <hr className="my-4" />

            <div className="row">
              <div className="col-12">
                <h5 className="mb-3"><i className="bi bi-ui-checks-grid me-2"></i>Действия</h5>
                <div className="row">
                  <div className="col-md-6">
                    <div className="card bg-light mb-3">
                      <div className="card-body">
                        <h6 className="card-title">
                          <i className="bi bi-graph-up me-2"></i>
                          Статистика рабочего времени
                        </h6>
                        <p className="card-text">
                          Доступ к детальной статистике рабочего времени можно получить в разделе "Отчеты".
                        </p>
                        <Link to={`/reports?employee_id=${employee.id}`} className="btn btn-sm btn-outline-primary">
                          <i className="bi bi-graph-up"></i> Просмотр статистики
                        </Link>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="card bg-light mb-3">
                      <div className="card-body">
                        <h6 className="card-title">
                          <i className="bi bi-clock me-2"></i>
                          Регистрация времени
                        </h6>
                        <p className="card-text">
                          Отметить приход или уход сотрудника.
                        </p>
                        <div className="btn-group btn-group-sm">
                          <Link to={`/time-records/check-in?employee_id=${employee.id}`} className="btn btn-outline-success">
                            <i className="bi bi-box-arrow-in-right"></i> Отметить приход
                          </Link>
                          <Link to={`/time-records/check-out?employee_id=${employee.id}`} className="btn btn-outline-danger">
                            <i className="bi bi-box-arrow-left"></i> Отметить уход
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="alert alert-info">
          <i className="bi bi-person-x me-2"></i>
          Сотрудник не найден
        </div>
      )}
    </div>
  );
};

export default EmployeeView; 