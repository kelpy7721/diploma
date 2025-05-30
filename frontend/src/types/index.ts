export interface Department {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  position: string;
  department_id: number | null;
  department_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TimeRecord {
  id: number;
  employee_id: number;
  employee_name: string;
  check_in: string;
  check_out: string | null;
  duration_hours: number;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  pages: number;
  page: number;
}

// Типизация отчетов
export type ReportGroupBy = 'employee' | 'department' | 'date';

export interface SummaryReportDataEmployee {
  employee_id: number;
  employee_name: string;
  department_id: number | null;
  department_name: string | null;
  total_hours: number;
  record_count: number;
}

export interface SummaryReportDataDepartment {
  department_id: number | null;
  department_name: string | null;
  total_hours: number;
  record_count: number;
}

export interface SummaryReportDataDate {
  date: string;
  employee_id?: number;
  employee_name?: string;
  total_hours: number;
  record_count: number;
}

export type SummaryReportData = 
  | SummaryReportDataEmployee 
  | SummaryReportDataDepartment 
  | SummaryReportDataDate;

export interface SummaryReport {
  period: {
    start_date: string;
    end_date: string;
  };
  group_by: ReportGroupBy;
  data: SummaryReportData[];
}

export interface DailyReport {
  date: string;
  records: TimeRecord[];
} 