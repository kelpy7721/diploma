import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getEmployee, updateEmployee, createEmployee, getDepartments } from '../services/api';
import { Employee, Department } from '../types';

const EmployeeEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [originalData, setOriginalData] = useState<Partial<Employee>>({});
  const [formData, setFormData] = useState<Partial<Employee>>({
    first_name: '',
    last_name: '',
    email: '',
    position: '',
    department_id: null,
    is_active: true
  });
  const [departments, setDepartments] = useState<Department[]>([]);
  const [validation, setValidation] = useState<{
    first_name: string | null,
    last_name: string | null,
    email: string | null,
    position: string | null
  }>({
    first_name: null,
    last_name: null,
    email: null,
    position: null
  });
  
  // Determine if we're creating a new employee
  const isNewEmployee = id === 'new' || id === undefined;

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Clear existing data first
        setFormData({
          first_name: '',
          last_name: '',
          email: '',
          position: '',
          department_id: null,
          is_active: true
        });
        setOriginalData({});
        setDepartments([]); // Важно очистить массив отделов перед новой загрузкой
        
        // Загружаем отделы сначала
        try {
          console.log('Fetching departments...');
          const departmentsData = await getDepartments();
          console.log('Departments data:', departmentsData);
          setDepartments(departmentsData);
          
          // Если это режим создания нового сотрудника, завершаем загрузку
          if (isNewEmployee) {
            setLoading(false);
            return;
          }
          
          // Для существующего сотрудника загружаем его данные
          const employeeId = Number(id);
          if (isNaN(employeeId)) {
            setError('Некорректный ID сотрудника');
            setLoading(false);
            return;
          }
          
          console.log('Fetching employee data...');
          console.log('Employee ID for fetch:', employeeId);
          
          const employeeData = await getEmployee(employeeId);
          console.log('Employee data:', employeeData);
          
          setFormData(employeeData);
          setOriginalData(employeeData);
          setLoading(false);
        } catch (fetchErr) {
          console.error('Error fetching data:', fetchErr);
          setError('Ошибка при загрузке данных. Проверьте консоль для деталей.');
          setLoading(false);
        }
      } catch (err) {
        console.error('General error:', err);
        setError('Ошибка при загрузке данных');
        setLoading(false);
      }
    };

    setLoading(true);
    fetchData();
  }, [id, isNewEmployee]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    console.log(`Input change - name: ${name}, value: ${value}, type: ${type}`);
    
    // Валидация при изменении
    if (name === 'first_name' || name === 'last_name') {
      if (value.trim().length < 2) {
        setValidation(prev => ({ ...prev, [name]: 'Минимум 2 символа' }));
      } else {
        setValidation(prev => ({ ...prev, [name]: null }));
      }
    }
    
    if (name === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        setValidation(prev => ({ ...prev, email: 'Некорректный email' }));
      } else {
        setValidation(prev => ({ ...prev, email: null }));
      }
    }
    
    if (name === 'position' && value.trim().length < 2) {
      setValidation(prev => ({ ...prev, position: 'Минимум 2 символа' }));
    } else if (name === 'position') {
      setValidation(prev => ({ ...prev, position: null }));
    }
    
    if (name === 'department_id') {
      setFormData(prev => ({
        ...prev,
        // Если значение пустое, устанавливаем null, иначе преобразуем к числу
        [name]: value === '' ? null : Number(value)
      }));
    } else if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const resetForm = () => {
    setFormData(originalData);
    setValidation({
      first_name: null,
      last_name: null,
      email: null,
      position: null
    });
  };

  const hasChanges = (): boolean => {
    if (isNewEmployee) {
      // For new employee, consider having any data as "changes"
      return formData.first_name !== '' || 
             formData.last_name !== '' || 
             formData.email !== '' || 
             formData.position !== '';
    }
    return JSON.stringify(formData) !== JSON.stringify(originalData);
  };

  const isValid = (): boolean => {
    return !Object.values(validation).some(val => val !== null) && 
      formData.first_name?.trim() !== '' && 
      formData.last_name?.trim() !== '' && 
      formData.email?.trim() !== '' && 
      formData.position?.trim() !== '';
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!isValid()) {
      setError('Пожалуйста, исправьте ошибки в форме');
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      
      // Подготовка данных для отправки
      const dataToSend = { 
        ...formData,
        // Убедимся, что department_id корректен (null или число)
        department_id: formData.department_id === undefined || formData.department_id === null ? null : Number(formData.department_id)
      };
      
      let savedEmployee;
      
      if (isNewEmployee) {
        // Creating new employee
        console.log('Creating new employee with data:', dataToSend);
        savedEmployee = await createEmployee(dataToSend);
        setSuccess('Сотрудник успешно создан');
      } else {
        // Updating existing employee
        const employeeId = Number(id);
        if (isNaN(employeeId)) {
          setError('Некорректный ID сотрудника');
          setSaving(false);
          return;
        }
        
        console.log('Updating employee data:', dataToSend);
        console.log('Employee ID for update:', employeeId);
        savedEmployee = await updateEmployee(employeeId, dataToSend);
        setSuccess('Данные успешно сохранены');
      }
      
      setSaving(false);
      setOriginalData(savedEmployee);
      
      // Переход к странице просмотра через 1.5 секунды
      setTimeout(() => {
        navigate(`/employees/${savedEmployee.id}`);
      }, 1500);
    } catch (err: any) {
      setSaving(false);
      console.error('Ошибка при сохранении:', err);
      // Более детальное сообщение об ошибке
      if (err.response && err.response.data && err.response.data.error) {
        setError(`Ошибка при сохранении: ${err.response.data.error}`);
      } else {
        setError('Ошибка при сохранении данных сотрудника. Проверьте правильность заполнения полей.');
      }
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>{isNewEmployee ? 'Добавление сотрудника' : 'Редактирование сотрудника'}</h2>
        <Link to={isNewEmployee ? '/employees' : `/employees/${id}`} className="btn btn-outline-secondary">
          <i className="bi bi-arrow-left"></i> Назад
        </Link>
      </div>

      {loading ? (
        <div className="d-flex justify-content-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Загрузка...</span>
          </div>
        </div>
      ) : error ? (
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {error}
        </div>
      ) : success ? (
        <div className="alert alert-success">
          <i className="bi bi-check-circle-fill me-2"></i>
          {success}
        </div>
      ) : (
        <div className="card">
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="row mb-3">
                <div className="col-md-6">
                  <label htmlFor="first_name" className="form-label">Имя</label>
                  <input
                    type="text"
                    className={`form-control ${validation.first_name ? 'is-invalid' : ''}`}
                    id="first_name"
                    name="first_name"
                    value={formData.first_name || ''}
                    onChange={handleInputChange}
                    required
                  />
                  {validation.first_name && (
                    <div className="invalid-feedback">{validation.first_name}</div>
                  )}
                </div>
                <div className="col-md-6">
                  <label htmlFor="last_name" className="form-label">Фамилия</label>
                  <input
                    type="text"
                    className={`form-control ${validation.last_name ? 'is-invalid' : ''}`}
                    id="last_name"
                    name="last_name"
                    value={formData.last_name || ''}
                    onChange={handleInputChange}
                    required
                  />
                  {validation.last_name && (
                    <div className="invalid-feedback">{validation.last_name}</div>
                  )}
                </div>
              </div>

              <div className="row mb-3">
                <div className="col-md-6">
                  <label htmlFor="email" className="form-label">Email</label>
                  <input
                    type="email"
                    className={`form-control ${validation.email ? 'is-invalid' : ''}`}
                    id="email"
                    name="email"
                    value={formData.email || ''}
                    onChange={handleInputChange}
                    required
                  />
                  {validation.email && (
                    <div className="invalid-feedback">{validation.email}</div>
                  )}
                </div>
                <div className="col-md-6">
                  <label htmlFor="position" className="form-label">Должность</label>
                  <input
                    type="text"
                    className={`form-control ${validation.position ? 'is-invalid' : ''}`}
                    id="position"
                    name="position"
                    value={formData.position || ''}
                    onChange={handleInputChange}
                    required
                  />
                  {validation.position && (
                    <div className="invalid-feedback">{validation.position}</div>
                  )}
                </div>
              </div>

              <div className="row mb-3">
                <div className="col-md-6">
                  <label htmlFor="department_id" className="form-label">Отдел</label>
                  <select
                    className="form-select"
                    id="department_id"
                    name="department_id"
                    value={formData.department_id === null ? '' : String(formData.department_id)}
                    onChange={handleInputChange}
                  >
                    <option value="">Выберите отдел</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={String(dept.id)}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-6">
                  <div className="form-check mt-4">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="is_active"
                      name="is_active"
                      checked={formData.is_active || false}
                      onChange={handleInputChange}
                    />
                    <label className="form-check-label" htmlFor="is_active">
                      Активен
                    </label>
                  </div>
                </div>
              </div>

              <div className="mt-4 d-flex">
                <button 
                  type="submit" 
                  className="btn btn-primary me-2" 
                  disabled={saving || !hasChanges() || !isValid()}
                >
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Сохранение...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-save me-1"></i> {isNewEmployee ? 'Создать сотрудника' : 'Сохранить изменения'}
                    </>
                  )}
                </button>
                <button 
                  type="button" 
                  className="btn btn-outline-secondary me-2" 
                  onClick={resetForm}
                  disabled={!hasChanges()}
                >
                  <i className="bi bi-arrow-counterclockwise me-1"></i> Сбросить
                </button>
                <Link to={isNewEmployee ? '/employees' : `/employees/${id}`} className="btn btn-outline-danger">
                  <i className="bi bi-x-circle me-1"></i> Отмена
                </Link>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeEdit; 