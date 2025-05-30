/**
 * Типы API ответов и запросов
 */

// API ответ с ошибкой
export interface ApiErrorResponse {
  error?: string;
  message?: string;
  code?: number;
}

// Параметры запроса отчётов
export interface SummaryReportParams {
  start_date: string;
  end_date: string;
  group_by?: 'employee' | 'department' | 'date';
  department_id?: number;
}

export interface DailyReportParams {
  date: string;
  employee_id?: number;
  department_id?: number;
}

export interface ExportCsvParams {
  start_date: string;
  end_date: string;
  type?: 'summary' | 'detailed';
  department_id?: number;
}

export interface CsvExportResponse {
  csv_data: string;
  filename: string;
}

// Вспомогательный тип для обработки всех возможных ошибок API
export type ApiResponse<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
  code?: number;
}; 