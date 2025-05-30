import axios, { AxiosError } from 'axios';
import { 
  Department, 
  Employee, 
  TimeRecord, 
  PaginatedResponse, 
  SummaryReport,
  DailyReport
} from '../types';
import { 
  ApiErrorResponse, 
  SummaryReportParams, 
  DailyReportParams,
  ExportCsvParams,
  CsvExportResponse
} from '../types/api';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000, // Таймаут 30 секунд
});

// Обрабатываем ошибки API запросов
const handleApiError = (error: unknown, customMessage?: string) => {
  console.error('API Error:', error);

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    
    // Проверяем, есть ли ответ от сервера
    if (axiosError.response) {
      // Если сервер вернул ошибку с данными
      const data = axiosError.response.data;
      const serverMessage = data && typeof data === 'object' 
        ? (data.error || data.message || JSON.stringify(data))
        : 'Ошибка сервера';
      
      throw new Error(`${customMessage || 'Ошибка API'}: ${serverMessage}`);
    } else if (axiosError.request) {
      // Запрос был отправлен, но ответа не получено
      throw new Error('Сервер не отвечает. Проверьте соединение с интернетом');
    } else {
      // Ошибка при настройке запроса
      throw new Error(`Ошибка при выполнении запроса: ${axiosError.message}`);
    }
  }
  
  // Если ошибка не связана с Axios
  throw new Error(customMessage || 'Неизвестная ошибка при запросе к API');
};

// Отделы
export const getDepartments = async (): Promise<Department[]> => {
  console.log('Запрос отделов начат');
  const response = await api.get('/departments');
  console.log('Получен ответ по отделам:', response.data);
  const departments = response.data.items;
  console.log('Отделы (массив):', departments);
  
  // Удалим дубликаты
  const uniqueDepartments = departments.filter((dept: Department, index: number, self: Department[]) => 
    index === self.findIndex((d: Department) => d.id === dept.id)
  );
  
  console.log('Уникальные отделы после фильтрации:', uniqueDepartments);
  return uniqueDepartments;
};

// Сотрудники
export const getEmployees = async (
  page = 1, 
  per_page = 20, 
  department_id?: number, 
  is_active?: boolean,
  search?: string
): Promise<PaginatedResponse<Employee>> => {
  const params: Record<string, any> = { page, per_page };
  
  if (department_id) params.department_id = department_id;
  if (is_active !== undefined) params.is_active = is_active;
  if (search) params.search = search;

  const response = await api.get('/employees', { params });
  return response.data;
};

export const getEmployeesWithOpenRecords = async (): Promise<Employee[]> => {
  const response = await api.get('/employees/with-open-records');
  return response.data.items || [];
};

export const getEmployee = async (id: number): Promise<Employee> => {
  const response = await api.get(`/employees/${id}`);
  return response.data;
};

export const createEmployee = async (employee: Partial<Employee>): Promise<Employee> => {
  const response = await api.post('/employees', employee);
  return response.data;
};

export const updateEmployee = async (id: number, employee: Partial<Employee>): Promise<Employee> => {
  try {
    console.log('Updating employee with data:', employee);
    const response = await api.put(`/employees/${id}`, employee);
    console.log('Employee update response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error updating employee:', error);
    throw error;
  }
};

export const deleteEmployee = async (id: number): Promise<void> => {
  await api.delete(`/employees/${id}`);
};

// Записи рабочего времени
export const getTimeRecords = async (
  page = 1, 
  per_page = 20, 
  employee_id?: number, 
  start_date?: string,
  end_date?: string
): Promise<PaginatedResponse<TimeRecord>> => {
  const params: Record<string, any> = { page, per_page };
  
  if (employee_id) params.employee_id = employee_id;
  if (start_date) params.start_date = start_date;
  if (end_date) params.end_date = end_date;

  const response = await api.get('/time-records', { params });
  return response.data;
};

export const getTimeRecord = async (id: number): Promise<TimeRecord> => {
  const response = await api.get(`/time-records/${id}`);
  return response.data;
};

export const createTimeRecord = async (record: Partial<TimeRecord>): Promise<TimeRecord> => {
  const response = await api.post('/time-records', record);
  return response.data;
};

export const updateTimeRecord = async (id: number, record: Partial<TimeRecord>): Promise<TimeRecord> => {
  const response = await api.put(`/time-records/${id}`, record);
  return response.data;
};

export const checkIn = async (employee_id: number, description?: string): Promise<TimeRecord> => {
  const response = await api.post('/time-records/check-in', { employee_id, description });
  return response.data;
};

export const checkOut = async (employee_id: number, description?: string): Promise<TimeRecord> => {
  const response = await api.post('/time-records/check-out', { employee_id, description });
  return response.data;
};

// Отчеты
export const getSummaryReport = async (
  start_date: string, 
  end_date: string, 
  group_by: 'employee' | 'department' | 'date' = 'employee', 
  department_id?: number
): Promise<SummaryReport> => {
  try {
    const params: SummaryReportParams = { start_date, end_date, group_by };
    
    if (department_id) params.department_id = department_id;
    
    console.log('Request params for summary report:', params);
    
    const response = await api.get<SummaryReport>('/reports/summary', { params });
    console.log('Summary report API response:', response.data);
    
    if (!response.data || !response.data.period || !response.data.data) {
      throw new Error('Неверный формат ответа от сервера');
    }
    
    return response.data;
  } catch (error) {
    handleApiError(error, 'Ошибка при получении сводного отчета');
    throw error; // Этот код недостижим, но TypeScript требует возврата или выброса
  }
};

export const getDailyReport = async (
  date: string, 
  employee_id?: number, 
  department_id?: number
): Promise<DailyReport> => {
  try {
    const params: DailyReportParams = { date };
    
    if (employee_id) params.employee_id = employee_id;
    if (department_id) params.department_id = department_id;
    
    console.log('Request params for daily report:', params);
    
    const response = await api.get<DailyReport>('/reports/daily', { params });
    console.log('Daily report API response:', response.data);
    
    if (!response.data || !response.data.date || !response.data.records) {
      throw new Error('Неверный формат ответа от сервера');
    }
    
    return response.data;
  } catch (error) {
    handleApiError(error, 'Ошибка при получении ежедневного отчета');
    throw error; // Этот код недостижим, но TypeScript требует возврата или выброса
  }
};

export const exportCsv = async (
  start_date: string, 
  end_date: string, 
  report_type: 'summary' | 'detailed' = 'summary', 
  department_id?: number
): Promise<CsvExportResponse> => {
  try {
    const params: ExportCsvParams = { 
      start_date, 
      end_date, 
      type: report_type 
    };
    
    if (department_id) params.department_id = department_id;
    
    console.log('Request params for CSV export:', params);

    const response = await api.get<CsvExportResponse>('/reports/export/csv', { params });
    console.log('CSV export response received');
    
    if (!response.data || !response.data.csv_data || !response.data.filename) {
      throw new Error('Неверный формат ответа от сервера при экспорте CSV');
    }
    
    return response.data;
  } catch (error) {
    handleApiError(error, 'Ошибка при экспорте CSV');
    throw error;
  }
};

export default api; 