import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getEmployees } from '../services/api';
import { Employee, PaginatedResponse } from '../types';

const Employees: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [pagination, setPagination] = useState<{
    total: number;
    pages: number;
    page: number;
  }>({ total: 0, pages: 0, page: 1 });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const response = await getEmployees(1, 10);
        setEmployees(response.items);
        setPagination({
          total: response.total,
          pages: response.pages,
          page: response.page
        });
        setLoading(false);
      } catch (err) {
        setError('Ошибка при загрузке данных');
        setLoading(false);
      }
    };

    loadEmployees();
  }, []);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Управление сотрудниками</h2>
        <Link to="/employees/new" className="btn btn-success">
          Добавить сотрудника
        </Link>
      </div>

      {loading ? (
        <p>Загрузка...</p>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : (
        <>
          <div className="card">
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Имя</th>
                      <th>Фамилия</th>
                      <th>Email</th>
                      <th>Должность</th>
                      <th>Отдел</th>
                      <th>Статус</th>
                      <th>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((employee) => (
                      <tr key={employee.id}>
                        <td>{employee.id}</td>
                        <td>{employee.first_name}</td>
                        <td>{employee.last_name}</td>
                        <td>{employee.email}</td>
                        <td>{employee.position}</td>
                        <td>{employee.department_name || 'Не указан'}</td>
                        <td>
                          <span
                            className={`badge ${
                              employee.is_active ? 'bg-success' : 'bg-danger'
                            }`}
                          >
                            {employee.is_active ? 'Активен' : 'Неактивен'}
                          </span>
                        </td>
                        <td>
                          <div className="btn-group btn-group-sm">
                            <Link
                              to={`/employees/${employee.id}`}
                              className="btn btn-info"
                            >
                              Просмотр
                            </Link>
                            <Link
                              to={`/employees/${employee.id}/edit`}
                              className="btn btn-primary"
                            >
                              Изменить
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="mt-3">
            <p>
              Всего записей: {pagination.total}, Страница: {pagination.page} из{' '}
              {pagination.pages}
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default Employees; 