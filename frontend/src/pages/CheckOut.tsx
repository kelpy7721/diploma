import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getEmployeesWithOpenRecords, checkOut } from '../services/api';
import { Employee } from '../types';

const CheckOut: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<number | ''>('');
  const [description, setDescription] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const employeesData = await getEmployeesWithOpenRecords();
        setEmployees(employeesData);
        
        // Получаем ID сотрудника из URL, если он передан
        const searchParams = new URLSearchParams(location.search);
        const employeeId = searchParams.get('employee_id');
        
        if (employeeId) {
          setSelectedEmployee(parseInt(employeeId));
        }
        
        setLoading(false);
      } catch (err) {
        setError('Ошибка при загрузке списка сотрудников');
        setLoading(false);
      }
    };

    loadEmployees();
  }, [location.search]);

  const handleCheckOut = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedEmployee) {
      setError('Необходимо выбрать сотрудника');
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      await checkOut(Number(selectedEmployee), description);
      setSuccess('Уход успешно отмечен!');
      
      // Очищаем форму
      setSelectedEmployee('');
      setDescription('');
      
      // Редирект на главную через 2 секунды
      setTimeout(() => {
        // Если было указано employee_id в URL, вернемся к странице сотрудника
        const searchParams = new URLSearchParams(location.search);
        const employeeId = searchParams.get('employee_id');
        
        if (employeeId) {
          navigate(`/employees/${employeeId}`);
        } else {
          navigate('/');
        }
      }, 2000);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Произошла ошибка при отметке ухода';
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Отметка ухода</h2>
        <Link to={location.search.includes('employee_id') ? `/employees/${selectedEmployee}` : '/'} className="btn btn-outline-primary">
          <i className="bi bi-arrow-left me-1"></i>
          Назад
        </Link>
      </div>

      <div className="row">
        <div className="col-md-6 offset-md-3">
          <div className="card">
            <div className="card-body">
              {success && (
                <div className="alert alert-success">
                  <i className="bi bi-check-circle me-2"></i>
                  {success}
                </div>
              )}
              
              {error && (
                <div className="alert alert-danger">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  {error}
                </div>
              )}
              
              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Загрузка...</span>
                  </div>
                  <p className="mt-2 text-muted">Загрузка списка сотрудников...</p>
                </div>
              ) : (
                <form onSubmit={handleCheckOut}>
                  {employees.length === 0 ? (
                    <div className="alert alert-warning">
                      <i className="bi bi-exclamation-triangle me-2"></i>
                      Открытая запись не найдена для этого сотрудника
                    </div>
                  ) : (
                    <div className="mb-3">
                      <label htmlFor="employee" className="form-label">Выберите сотрудника</label>
                      <select
                        id="employee"
                        className="form-select"
                        value={selectedEmployee}
                        onChange={(e) => setSelectedEmployee(e.target.value ? Number(e.target.value) : '')}
                        disabled={submitting || (location.search.includes('employee_id'))}
                        required
                      >
                        <option value="">-- Выберите сотрудника --</option>
                        {employees.map((employee) => (
                          <option key={employee.id} value={employee.id}>
                            {employee.last_name} {employee.first_name} ({employee.position})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  {employees.length > 0 && (
                    <>
                      <div className="mb-3">
                        <label htmlFor="description" className="form-label">Комментарий (опционально)</label>
                        <textarea
                          id="description"
                          className="form-control"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          disabled={submitting}
                          placeholder="Например: Выполнено задач: 5"
                          rows={3}
                        />
                      </div>
                      
                      <div className="d-grid">
                        <button 
                          type="submit" 
                          className="btn btn-primary" 
                          disabled={submitting}
                        >
                          {submitting ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                              Обработка...
                            </>
                          ) : (
                            <>
                              <i className="bi bi-box-arrow-left me-2"></i>
                              Отметить уход
                            </>
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckOut; 