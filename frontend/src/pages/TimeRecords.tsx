import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getTimeRecords, checkIn, checkOut } from '../services/api';
import { TimeRecord } from '../types';
import { formatMoscowTime, formatMoscowDate } from '../utils/dateUtils';

const TimeRecords: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const currentPage = parseInt(queryParams.get('page') || '1');
  
  const [loading, setLoading] = useState<boolean>(true);
  const [timeRecords, setTimeRecords] = useState<TimeRecord[]>([]);
  const [pagination, setPagination] = useState<{
    total: number;
    pages: number;
    page: number;
  }>({ total: 0, pages: 0, page: currentPage });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTimeRecords = async () => {
      try {
        setLoading(true);
        const response = await getTimeRecords(pagination.page, 10);
        setTimeRecords(response.items);
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

    loadTimeRecords();
  }, [pagination.page]);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > pagination.pages) return;
    
    // Обновляем URL и состояние пагинации
    navigate(`/time-records?page=${page}`);
    setPagination(prev => ({
      ...prev,
      page: page
    }));
  };

  // Генерирует массив номеров страниц для пагинации
  const getPageNumbers = () => {
    const pageNumbers = [];
    const totalPages = pagination.pages;
    const currentPage = pagination.page;
    
    // Всегда показываем первую и последнюю страницу,
    // а также несколько страниц до и после текущей
    const delta = 2; // Сколько страниц показывать до и после текущей
    
    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 || // Первая страница
        i === totalPages || // Последняя страница
        (i >= currentPage - delta && i <= currentPage + delta) // Страницы рядом с текущей
      ) {
        pageNumbers.push(i);
      } else if (
        (i === currentPage - delta - 1 && i > 1) || // Добавляем многоточие перед
        (i === currentPage + delta + 1 && i < totalPages) // Добавляем многоточие после
      ) {
        pageNumbers.push(-1); // -1 используем как маркер для многоточия
      }
    }
    
    return pageNumbers;
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Учёт рабочего времени</h2>
        <div>
          <Link to="/time-records/check-in" className="btn btn-success me-2">
            Отметить приход
          </Link>
          <Link to="/time-records/check-out" className="btn btn-warning me-2">
            Отметить уход
          </Link>
          <Link to="/time-records/new" className="btn btn-primary">
            Новая запись
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="d-flex justify-content-center my-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Загрузка...</span>
          </div>
        </div>
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
                      <th>Сотрудник</th>
                      <th>Дата</th>
                      <th>Начало</th>
                      <th>Окончание</th>
                      <th>Часов</th>
                      <th>Описание</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timeRecords.map((record) => (
                      <tr key={record.id}>
                        <td>{record.id}</td>
                        <td>{record.employee_name}</td>
                        <td>{formatMoscowDate(record.check_in)}</td>
                        <td>{formatMoscowTime(record.check_in)}</td>
                        <td>
                          {record.check_out
                            ? formatMoscowTime(record.check_out)
                            : <span className="badge bg-warning text-dark">В процессе</span>}
                        </td>
                        <td>{record.duration_hours.toFixed(2)}</td>
                        <td>{record.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="d-flex justify-content-between align-items-center mt-3">
            <div>
              <p className="mb-0">
                Всего записей: {pagination.total}, Страница: {pagination.page} из{' '}
                {pagination.pages}
              </p>
            </div>
            
            {pagination.pages > 1 && (
              <nav aria-label="Page navigation">
                <ul className="pagination">
                  <li className={`page-item ${pagination.page === 1 ? 'disabled' : ''}`}>
                    <button 
                      className="page-link" 
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                    >
                      <i className="bi bi-chevron-left"></i>
                    </button>
                  </li>
                  
                  {getPageNumbers().map((pageNumber, index) => 
                    pageNumber === -1 ? (
                      <li key={`ellipsis-${index}`} className="page-item disabled">
                        <span className="page-link">...</span>
                      </li>
                    ) : (
                      <li key={pageNumber} className={`page-item ${pageNumber === pagination.page ? 'active' : ''}`}>
                        <button 
                          className="page-link" 
                          onClick={() => handlePageChange(pageNumber)}
                        >
                          {pageNumber}
                        </button>
                      </li>
                    )
                  )}
                  
                  <li className={`page-item ${pagination.page === pagination.pages ? 'disabled' : ''}`}>
                    <button 
                      className="page-link" 
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.pages}
                    >
                      <i className="bi bi-chevron-right"></i>
                    </button>
                  </li>
                </ul>
              </nav>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default TimeRecords; 