import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getSummaryReport, getDailyReport, exportCsv, getDepartments } from '../services/api';
import { 
  SummaryReport, 
  DailyReport, 
  Department, 
  SummaryReportDataEmployee,
  SummaryReportDataDepartment, 
  SummaryReportDataDate
} from '../types';
import { formatMoscowDate, formatMoscowDateTime } from '../utils/dateUtils';
import { jsPDF } from 'jspdf';
// @ts-ignore
import autoTable from 'jspdf-autotable';
// Импортируем функции для работы с PDF
import { createPDFWithCyrillicSupport, transliterateText } from '../utils/pdfUtils';

// Безопасное форматирование числовых значений
const safeNumberFormat = (value: any, decimals: number = 2): string => {
  // Проверяем, что значение существует
  if (value === undefined || value === null) {
    return '0.00';
  }
  
  // Преобразуем в число, если это строка или другой тип
  let numValue = typeof value === 'number' ? value : parseFloat(String(value));
  
  // Проверяем, что получилось число
  if (isNaN(numValue)) {
    console.warn('Invalid number value:', value);
    return '0.00';
  }
  
  // Проверяем на экстремальные значения, которые могут указывать на неверный формат данных
  if (Math.abs(numValue) > 10000) {
    console.warn('Extremely large number detected, might be formatting issue:', numValue);
    // Пытаемся нормализовать значение, предполагая что это может быть неверный формат
    numValue = Math.abs(numValue) / 10000000; // Эмпирическая коррекция
  }
  
  // Всегда используем абсолютное значение для часов работы
  numValue = Math.abs(numValue);
  
  try {
    return numValue.toFixed(decimals);
  } catch (error) {
    console.error('Error formatting number:', error);
    return '0.00';
  }
};

const Reports: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [reportType, setReportType] = useState<'summary' | 'daily'>('summary');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [groupBy, setGroupBy] = useState<'employee' | 'department' | 'date'>('employee');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [summaryReport, setSummaryReport] = useState<SummaryReport | null>(null);
  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [exportLoading, setExportLoading] = useState<boolean>(false);
  const [pdfLoading, setPdfLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<string | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  // Загрузка списка отделов при монтировании компонента
  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const departmentsData = await getDepartments();
        setDepartments(departmentsData);
      } catch (err) {
        console.error('Ошибка при загрузке отделов:', err);
      }
    };

    loadDepartments();

    // Устанавливаем начальные даты
    const today = new Date();
    const lastMonth = new Date(today);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    setEndDate(formatDateForInput(today));
    setStartDate(formatDateForInput(lastMonth));
    setDate(formatDateForInput(today));
    
  }, []);

  // Форматирование даты для input[type="date"]
  const formatDateForInput = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const validateReportInputs = (): boolean => {
    if (reportType === 'summary') {
      if (!startDate || !endDate) {
        setError('Необходимо указать начальную и конечную даты');
        return false;
      }
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (start > end) {
        setError('Начальная дата не может быть позже конечной даты');
        return false;
      }
      
      const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 366) {
        setError('Период отчета не может превышать 366 дней');
        return false;
      }
    } else {
      if (!date) {
        setError('Необходимо указать дату для ежедневного отчета');
        return false;
      }
    }
    
    return true;
  };

  // Безопасная обработка данных отчета - дополнительная проверка форматов данных
  const safelyProcessReport = (report: any, type: 'summary' | 'daily'): boolean => {
    try {
      if (type === 'summary') {
        // Проверка основной структуры отчета
        if (!report || typeof report !== 'object') {
          console.error('Report is not an object:', report);
          return false;
        }
        
        // Проверка наличия периода и его корректности
        if (!report.period || !report.period.start_date || !report.period.end_date) {
          console.error('Report period is invalid:', report.period);
          return false;
        }
        
        // Проверка наличия данных и их типа
        if (!report.data || !Array.isArray(report.data)) {
          console.error('Report data is not an array:', report.data);
          return false;
        }
        
        // Проверка наличия group_by и его корректности
        if (!report.group_by || !['employee', 'department', 'date'].includes(report.group_by)) {
          console.error('Report group_by is invalid:', report.group_by);
          return false;
        }
        
        // Для пустых отчетов проверки достаточны
        if (report.data.length === 0) {
          return true;
        }
        
        // Проверка просто наличия базовых полей
        console.log('Checking report item structure:', report.data[0]);
        
        // Обработка данных отчета и коррекция неправильных значений часов
        report.data.forEach((item: any, index: number) => {
          if (item.total_hours !== undefined) {
            // Если total_hours не число, преобразуем его
            if (typeof item.total_hours !== 'number') {
              try {
                const numValue = parseFloat(String(item.total_hours));
                if (!isNaN(numValue)) {
                  // Нормализуем очень большие значения, вероятно это ошибка формата
                  if (Math.abs(numValue) > 10000) {
                    report.data[index].total_hours = Math.abs(numValue) / 10000000; // Коррекция формата
                    console.log(`Normalized large total_hours value at index ${index} from ${numValue} to ${report.data[index].total_hours}`);
                  } else {
                    report.data[index].total_hours = Math.abs(numValue); // Всегда используем положительные значения
                  }
                } else {
                  console.warn(`Invalid total_hours value at index ${index}:`, item.total_hours);
                  report.data[index].total_hours = 0;
                }
              } catch (error) {
                console.error(`Error converting total_hours at index ${index}:`, error);
                report.data[index].total_hours = 0;
              }
            } else {
              // Также корректируем существующие числовые значения
              if (Math.abs(item.total_hours) > 10000) {
                report.data[index].total_hours = Math.abs(item.total_hours) / 10000000;
                console.log(`Normalized existing large total_hours value at index ${index} from ${item.total_hours} to ${report.data[index].total_hours}`);
              } else {
                report.data[index].total_hours = Math.abs(item.total_hours);
              }
            }
          } else {
            console.warn(`Missing total_hours at index ${index}`);
            report.data[index].total_hours = 0;
          }
          
          // Проверяем запись количества (record_count)
          if (item.record_count !== undefined) {
            if (typeof item.record_count !== 'number') {
              try {
                const countValue = parseInt(String(item.record_count), 10);
                if (!isNaN(countValue)) {
                  report.data[index].record_count = Math.abs(countValue); // Используем положительные значения
                } else {
                  console.warn(`Invalid record_count value at index ${index}:`, item.record_count);
                  report.data[index].record_count = 0;
                }
              } catch (error) {
                console.error(`Error converting record_count at index ${index}:`, error);
                report.data[index].record_count = 0;
              }
            } else {
              // Убедимся, что значение положительное
              report.data[index].record_count = Math.abs(item.record_count);
            }
          } else {
            console.warn(`Missing record_count at index ${index}`);
            report.data[index].record_count = 0;
          }
        });
        
        // Теперь проверяем только наличие необходимых полей для группировки
        const firstItem = report.data[0];
        
        switch(report.group_by) {
          case 'employee':
            if (!('employee_name' in firstItem)) {
              console.error('Missing employee_name in employee grouped data:', firstItem);
              return false;
            }
            break;
            
          case 'department':
            if (!('department_name' in firstItem)) {
              console.error('Missing department_name in department grouped data:', firstItem);
              return false;
            }
            break;
            
          case 'date':
            if (!('date' in firstItem)) {
              console.error('Missing date in date grouped data:', firstItem);
              // Добавляем поле date для каждого элемента, используя текущую дату
              console.warn('Trying to fix missing date field by adding current date to each record');
              const today = new Date().toISOString().split('T')[0];
              
              report.data.forEach((item: any, index: number) => {
                report.data[index].date = today;
              });
              
              console.log('Added date field to all records:', today);
            }
            break;
        }
        
        // Если дошли до сюда, данные валидны и преобразованы
        console.log('Validated and converted report data:', report.data);
        return true;
      } else if (type === 'daily') {
        // Проверка основной структуры отчета
        if (!report || typeof report !== 'object') {
          console.error('Daily report is not an object:', report);
          return false;
        }
        
        // Проверка наличия даты
        if (!report.date) {
          console.error('Daily report has no date:', report);
          return false;
        }
        
        // Проверка наличия записей и их типа
        if (!report.records || !Array.isArray(report.records)) {
          console.error('Daily report records is not an array:', report.records);
          return false;
        }
        
        // Проверка структуры данных записей, если они есть
        if (report.records.length > 0) {
          const firstRecord = report.records[0];
          if (!firstRecord.id || !firstRecord.employee_name || 
              !firstRecord.check_in || typeof firstRecord.duration_hours !== 'number') {
            console.error('Invalid daily report record:', firstRecord);
            return false;
          }
        }
        
        // Аналогично преобразуем duration_hours для ежедневных отчетов
        if (report.records && Array.isArray(report.records)) {
          report.records.forEach((record: any, index: number) => {
            if (record.duration_hours !== undefined) {
              if (typeof record.duration_hours !== 'number') {
                try {
                  const numValue = parseFloat(String(record.duration_hours));
                  if (!isNaN(numValue)) {
                    // Нормализуем очень большие значения, вероятно это ошибка формата
                    if (Math.abs(numValue) > 10000) {
                      report.records[index].duration_hours = Math.abs(numValue) / 10000000; // Коррекция формата
                      console.log(`Normalized large duration_hours value at index ${index} from ${numValue} to ${report.records[index].duration_hours}`);
                    } else {
                      report.records[index].duration_hours = Math.abs(numValue); // Всегда положительные значения
                    }
                  } else {
                    console.warn(`Invalid duration_hours value at index ${index}:`, record.duration_hours);
                    report.records[index].duration_hours = 0;
                  }
                } catch (error) {
                  console.error(`Error converting duration_hours at index ${index}:`, error);
                  report.records[index].duration_hours = 0;
                }
              } else {
                // Также корректируем существующие числовые значения
                if (Math.abs(record.duration_hours) > 10000) {
                  report.records[index].duration_hours = Math.abs(record.duration_hours) / 10000000;
                  console.log(`Normalized existing large duration_hours value at index ${index} from ${record.duration_hours} to ${report.records[index].duration_hours}`);
                } else {
                  report.records[index].duration_hours = Math.abs(record.duration_hours);
                }
              }
            } else {
              console.warn(`Missing duration_hours at index ${index}`);
              report.records[index].duration_hours = 0;
            }
          });
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error processing report', error);
      return false;
    }
  };

  const handleGenerateReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      if (!validateReportInputs()) {
        setLoading(false);
        return;
      }
      
      if (reportType === 'summary') {
        console.log('Fetching summary report with params:', {
          startDate, 
          endDate, 
          groupBy, 
          departmentId: departmentId ? parseInt(departmentId) : undefined 
        });
        
        const report = await getSummaryReport(
          startDate, 
          endDate, 
          groupBy, 
          departmentId ? parseInt(departmentId) : undefined
        );
        
        if (!safelyProcessReport(report, 'summary')) {
          throw new Error('Получены некорректные данные от сервера. Проверьте консоль для деталей.');
        }
        
        console.log('Summary report received:', report);
        
        if (report.data.length === 0) {
          setSuccess('Отчет успешно сформирован, но данных за выбранный период нет');
        } else {
          setSuccess(`Отчет успешно сформирован. Найдено ${report.data.length} ${
            report.data.length === 1 ? 'запись' : 
            report.data.length < 5 ? 'записи' : 'записей'
          }`);
        }
        
        setSummaryReport(report);
        setDailyReport(null);
      } else {
        console.log('Fetching daily report with params:', {
          date,
          departmentId: departmentId ? parseInt(departmentId) : undefined
        });
        
        const report = await getDailyReport(
          date, 
          undefined, 
          departmentId ? parseInt(departmentId) : undefined
        );
        
        if (!safelyProcessReport(report, 'daily')) {
          throw new Error('Получены некорректные данные от сервера. Проверьте консоль для деталей.');
        }
        
        console.log('Daily report received:', report);
        
        if (report.records.length === 0) {
          setSuccess('Отчет успешно сформирован, но данных за выбранную дату нет');
        } else {
          setSuccess(`Отчет успешно сформирован. Найдено ${report.records.length} ${
            report.records.length === 1 ? 'запись' : 
            report.records.length < 5 ? 'записи' : 'записей'
          }`);
        }
        
        setDailyReport(report);
        setSummaryReport(null);
      }
    } catch (err) {
      console.error('Error generating report:', err);
      
      if (err instanceof Error) {
        setError(err.message);
      } else if (typeof err === 'string') {
        setError(err);
      } else {
        setError('Ошибка при формировании отчета. Проверьте подключение к серверу.');
      }
      
      // Сбрасываем отчеты при ошибке, чтобы избежать отображения старых данных
      setSummaryReport(null);
      setDailyReport(null);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, date, groupBy, departmentId, reportType, validateReportInputs]);

  const handleExportCsv = async () => {
    if (!startDate || !endDate) {
      setError('Необходимо указать начальную и конечную даты для экспорта');
      return;
    }
    
    try {
      setExportLoading(true);
      setError(null);
      const result = await exportCsv(
        startDate, 
        endDate, 
        reportType === 'summary' ? 'summary' : 'detailed', 
        departmentId ? parseInt(departmentId) : undefined
      );
      
      // Создаем ссылку для скачивания CSV
      const blob = new Blob([result.csv_data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', result.filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setSuccess('CSV-файл успешно сформирован и скачивается');
    } catch (err) {
      setError('Ошибка при экспорте CSV');
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportPdf = async () => {
    if ((!summaryReport && !dailyReport) || (reportType === 'summary' && !summaryReport) || (reportType === 'daily' && !dailyReport)) {
      setError('Сначала необходимо сформировать отчет');
      return;
    }
    
    try {
      setPdfLoading(true);
      setError(null);
      
      // Создаем PDF с поддержкой кириллицы (через транслитерацию)
      const doc = createPDFWithCyrillicSupport();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Добавляем заголовок
      doc.setFontSize(18);
      
      if (summaryReport) {
        doc.text('Сводный отчет по рабочему времени', pageWidth / 2, 20, { align: 'center' });
        doc.setFontSize(12);
        doc.text(`Период: ${formatMoscowDate(summaryReport.period.start_date)} - ${formatMoscowDate(summaryReport.period.end_date)}`, pageWidth / 2, 30, { align: 'center' });
        
        // Добавляем информацию о группировке
        let groupByText = '';
        switch (summaryReport.group_by) {
          case 'employee': groupByText = 'По сотрудникам'; break;
          case 'department': groupByText = 'По отделам'; break;
          case 'date': groupByText = 'По датам'; break;
        }
        doc.text(`Группировка: ${groupByText}`, pageWidth / 2, 40, { align: 'center' });
        
        // Формируем таблицу для отчета с транслитерацией заголовков
        const headers = [];
        if (summaryReport.group_by === 'employee') {
          headers.push(['Sotrudnik', 'Otdel', 'Vsego chasov', 'Zapisej']);
        } else if (summaryReport.group_by === 'department') {
          headers.push(['Otdel', 'Vsego chasov', 'Zapisej']);
        } else {
          headers.push(['Data', 'Sotrudnik', 'Vsego chasov', 'Zapisej']);
        }
        
        const data = summaryReport.data.map(item => {
          if (summaryReport.group_by === 'employee') {
            return [
              transliterateText((item as SummaryReportDataEmployee).employee_name || ''),
              transliterateText((item as SummaryReportDataEmployee).department_name || 'Ne ukazan'),
              safeNumberFormat(item.total_hours),
              item.record_count.toString()
            ];
          } else if (summaryReport.group_by === 'department') {
            return [
              transliterateText((item as SummaryReportDataDepartment).department_name || 'Ne ukazan'),
              safeNumberFormat(item.total_hours),
              item.record_count.toString()
            ];
          } else {
            return [
              formatMoscowDate((item as SummaryReportDataDate).date || ''),
              transliterateText((item as SummaryReportDataDate).employee_name || ''),
              safeNumberFormat(item.total_hours),
              item.record_count.toString()
            ];
          }
        });
        
        // Добавляем итоговую строку
        const totalHours = safeNumberFormat(summaryReport.data.reduce(
          (acc, item) => {
            // Извлекаем числовое значение и добавляем к накопителю
            const hours = typeof item.total_hours === 'number' ? 
              item.total_hours : parseFloat(String(item.total_hours)) || 0;
            
            // Нормализуем значения если они слишком большие
            const normalizedHours = Math.abs(hours) > 10000 ? Math.abs(hours) / 10000000 : Math.abs(hours);
            
            return acc + normalizedHours;
          }, 0
        ));
        const totalRecords = summaryReport.data.reduce((acc, item) => acc + item.record_count, 0);
        
        if (summaryReport.group_by === 'employee' || summaryReport.group_by === 'date') {
          data.push(['ITOGO', '', totalHours, totalRecords.toString()]);
        } else {
          data.push(['ITOGO', totalHours, totalRecords.toString()]);
        }
        
        // Используем autoTable с базовыми настройками
        autoTable(doc, {
          head: headers,
          body: data,
          startY: 50,
          theme: 'grid',
          headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
          footStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
        });
      } else if (dailyReport) {
        doc.text('Ежедневный отчет по рабочему времени', pageWidth / 2, 20, { align: 'center' });
        doc.setFontSize(12);
        doc.text(`Дата: ${formatMoscowDate(dailyReport.date)}`, pageWidth / 2, 30, { align: 'center' });
        
        // Формируем таблицу для отчета с транслитерированными заголовками
        const headers = [['Sotrudnik', 'Nachalo', 'Okonchanie', 'Chasov', 'Opisanie']];
        
        const data = dailyReport.records.map(record => {
          return [
            transliterateText(record.employee_name || ''),
            formatMoscowDateTime(record.check_in),
            record.check_out ? formatMoscowDateTime(record.check_out) : transliterateText('В процессе'),
            safeNumberFormat(record.duration_hours),
            transliterateText(record.description || '')
          ];
        });
        
        // Добавляем итоговую строку
        const totalHours = safeNumberFormat(dailyReport.records.reduce(
          (acc, record) => {
            // Извлекаем числовое значение и добавляем к накопителю
            const hours = typeof record.duration_hours === 'number' ? 
              record.duration_hours : parseFloat(String(record.duration_hours)) || 0;
            
            // Нормализуем значения если они слишком большие
            const normalizedHours = Math.abs(hours) > 10000 ? Math.abs(hours) / 10000000 : Math.abs(hours);
            
            return acc + normalizedHours;
          }, 0
        ));
        data.push(['ITOGO ZA DEN', '', '', totalHours, '']);
        
        // Используем autoTable с базовыми настройками
        autoTable(doc, {
          head: headers,
          body: data,
          startY: 50,
          theme: 'grid',
          headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
          footStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
        });
      }
      
      // Добавляем дату и время формирования отчета
      const now = new Date();
      doc.setFontSize(10);
      doc.text(`Дата формирования: ${formatMoscowDateTime(now.toISOString())}`, 14, doc.internal.pageSize.getHeight() - 10);
      
      // Сохраняем PDF
      const pdfName = summaryReport 
        ? `time_report_summary_${formatDateForFilename(new Date())}.pdf`
        : `time_report_daily_${formatDateForFilename(new Date())}.pdf`;
        
      doc.save(pdfName);
      
      setSuccess(`PDF-отчет успешно сформирован и скачивается`);
    } catch (err) {
      console.error('PDF export error:', err);
      setError('Ошибка при создании PDF-отчета');
    } finally {
      setPdfLoading(false);
    }
  };
  
  // Форматирование даты для имени файла
  const formatDateForFilename = (date: Date): string => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');
    return `${yyyy}${mm}${dd}_${hh}${mi}`;
  };

  // Вычисляем, сколько дней в выбранном периоде
  const getDaysInPeriod = (): number => {
    if (!startDate || !endDate) return 0;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  // Выбор предопределенных периодов
  const handlePresetPeriod = (preset: 'week' | 'month' | 'quarter' | 'year') => {
    const today = new Date();
    let startDateVal = new Date(today);
    
    switch (preset) {
      case 'week':
        startDateVal.setDate(today.getDate() - 7);
        break;
      case 'month':
        startDateVal.setMonth(today.getMonth() - 1);
        break;
      case 'quarter':
        startDateVal.setMonth(today.getMonth() - 3);
        break;
      case 'year':
        startDateVal.setFullYear(today.getFullYear() - 1);
        break;
    }
    
    setStartDate(formatDateForInput(startDateVal));
    setEndDate(formatDateForInput(today));
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Отчеты</h2>
        <div>
          <button 
            className="btn btn-outline-primary me-2"
            onClick={() => {
              setSummaryReport(null);
              setDailyReport(null);
              setError(null);
              setSuccess(null);
            }}
            disabled={!summaryReport && !dailyReport}
          >
            <i className="bi bi-arrow-clockwise me-1"></i> Новый отчет
          </button>
        </div>
      </div>
      
      {success && (
        <div className="alert alert-success alert-dismissible fade show mb-4">
          <i className="bi bi-check-circle-fill me-2"></i>
          {success}
          <button 
            type="button" 
            className="btn-close" 
            onClick={() => setSuccess(null)}
          ></button>
        </div>
      )}
      
      <div className="card mb-4 shadow-sm">
        <div className="card-header bg-primary bg-opacity-10">
          <h5 className="mb-0">
            <i className="bi bi-sliders me-2"></i> 
            Параметры отчета
          </h5>
        </div>
        <div className="card-body">
          <div className="mb-4">
            <label className="form-label fw-bold">Тип отчета</label>
            <div className="btn-group w-100" role="group">
              <input 
                type="radio" 
                className="btn-check" 
                name="report-type" 
                id="summary-report" 
                autoComplete="off" 
                checked={reportType === 'summary'} 
                onChange={() => setReportType('summary')}
              />
              <label className="btn btn-outline-primary" htmlFor="summary-report">
                <i className="bi bi-graph-up me-1"></i> Сводный отчет
              </label>

              <input 
                type="radio" 
                className="btn-check" 
                name="report-type" 
                id="daily-report" 
                autoComplete="off" 
                checked={reportType === 'daily'} 
                onChange={() => setReportType('daily')}
              />
              <label className="btn btn-outline-primary" htmlFor="daily-report">
                <i className="bi bi-calendar-day me-1"></i> Ежедневный отчет
              </label>
            </div>
          </div>
          
          {reportType === 'summary' ? (
            <>
              <div className="mb-4">
                <label className="form-label fw-bold">Период</label>
                <div className="mb-2">
                  <div className="btn-toolbar mb-3">
                    <div className="btn-group me-2">
                      <button 
                        type="button" 
                        className="btn btn-sm btn-outline-secondary" 
                        onClick={() => handlePresetPeriod('week')}
                      >
                        Неделя
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-sm btn-outline-secondary" 
                        onClick={() => handlePresetPeriod('month')}
                      >
                        Месяц
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-sm btn-outline-secondary" 
                        onClick={() => handlePresetPeriod('quarter')}
                      >
                        Квартал
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-sm btn-outline-secondary" 
                        onClick={() => handlePresetPeriod('year')}
                      >
                        Год
                      </button>
                    </div>
                  </div>
                </div>
                <div className="row g-3">
                  <div className="col-md-5">
                    <div className="input-group">
                      <span className="input-group-text">
                        <i className="bi bi-calendar-date"></i>
                      </span>
                      <input 
                        type="date" 
                        className="form-control"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="col-md-2 text-center d-flex align-items-center justify-content-center">
                    <i className="bi bi-arrow-right"></i>
                  </div>
                  <div className="col-md-5">
                    <div className="input-group">
                      <span className="input-group-text">
                        <i className="bi bi-calendar-date"></i>
                      </span>
                      <input 
                        type="date" 
                        className="form-control"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        min={startDate}
                      />
                    </div>
                  </div>
                </div>
                
                {startDate && endDate && (
                  <div className="form-text text-muted mt-2">
                    <i className="bi bi-info-circle me-1"></i>
                    Выбран период в {getDaysInPeriod()} {getDaysInPeriod() === 1 ? 'день' : 
                                                       getDaysInPeriod() < 5 ? 'дня' : 'дней'}
                  </div>
                )}
              </div>
              
              <div className="mb-4">
                <label className="form-label fw-bold">Группировка</label>
                <div className="btn-group w-100">
                  <input 
                    type="radio" 
                    className="btn-check" 
                    name="groupBy" 
                    id="group-employee" 
                    checked={groupBy === 'employee'} 
                    onChange={() => setGroupBy('employee')}
                  />
                  <label className="btn btn-outline-secondary" htmlFor="group-employee">
                    <i className="bi bi-people me-1"></i> По сотрудникам
                  </label>

                  <input 
                    type="radio" 
                    className="btn-check" 
                    name="groupBy" 
                    id="group-department" 
                    checked={groupBy === 'department'} 
                    onChange={() => setGroupBy('department')}
                  />
                  <label className="btn btn-outline-secondary" htmlFor="group-department">
                    <i className="bi bi-building me-1"></i> По отделам
                  </label>

                  <input 
                    type="radio" 
                    className="btn-check" 
                    name="groupBy" 
                    id="group-date" 
                    checked={groupBy === 'date'} 
                    onChange={() => setGroupBy('date')}
                  />
                  <label className="btn btn-outline-secondary" htmlFor="group-date">
                    <i className="bi bi-calendar me-1"></i> По датам
                  </label>
                </div>
              </div>
            </>
          ) : (
            <div className="mb-4">
              <label className="form-label fw-bold">Дата</label>
              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-calendar-date"></i>
                </span>
                <input 
                  type="date" 
                  className="form-control"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>
          )}
          
          <div className="mb-4">
            <label className="form-label fw-bold">Отдел (необязательно)</label>
            <select 
              className="form-select"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
            >
              <option value="">Все отделы</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>
          
          {error && (
            <div className="alert alert-danger">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              {error}
            </div>
          )}
          
          <div className="d-flex flex-wrap gap-2">
            <button 
              className="btn btn-primary btn-action d-flex align-items-center gap-2"
              onClick={handleGenerateReport}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  <span>Формирование...</span>
                </>
              ) : (
                <>
                  <i className="bi bi-file-earmark-bar-graph"></i> 
                  <span>Сформировать отчет</span>
                </>
              )}
            </button>
            
            <button 
              className="btn btn-success btn-action d-flex align-items-center gap-2"
              onClick={handleExportCsv}
              disabled={exportLoading || (!startDate || !endDate)}
            >
              {exportLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  <span>Экспорт CSV...</span>
                </>
              ) : (
                <>
                  <i className="bi bi-file-earmark-excel"></i> 
                  <span>Экспорт в CSV</span>
                </>
              )}
            </button>
            
            <button 
              className="btn btn-info btn-action d-flex align-items-center gap-2" 
              onClick={handleExportPdf}
              disabled={pdfLoading || (!summaryReport && !dailyReport)}
            >
              {pdfLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  <span>Создание PDF...</span>
                </>
              ) : (
                <>
                  <i className="bi bi-file-earmark-pdf"></i> 
                  <span>Экспорт в PDF</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Отображение результатов отчета */}
      {summaryReport && (
        <div className="card shadow-sm">
          <div className="card-header bg-success bg-opacity-10 d-flex justify-content-between align-items-center">
            <h5 className="mb-0">
              <i className="bi bi-graph-up me-2"></i>
              Сводный отчет: {formatMoscowDate(summaryReport.period.start_date)} - {formatMoscowDate(summaryReport.period.end_date)}
            </h5>
            <span className="badge bg-success">
              {summaryReport.data.length} {summaryReport.data.length === 1 ? 'запись' : 
                                         summaryReport.data.length < 5 ? 'записи' : 'записей'}
            </span>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-striped table-hover">
                <thead className="table-light">
                  <tr>
                    {summaryReport.group_by === 'employee' && (
                      <>
                        <th>Сотрудник</th>
                        <th>Отдел</th>
                      </>
                    )}
                    {summaryReport.group_by === 'department' && (
                      <th>Отдел</th>
                    )}
                    {summaryReport.group_by === 'date' && (
                      <>
                        <th>Дата</th>
                        <th>Сотрудник</th>
                      </>
                    )}
                    <th className="text-end">Всего часов</th>
                    <th className="text-end">Записей</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryReport.data.map((item, index) => (
                    <tr key={index}>
                      {summaryReport.group_by === 'employee' && (
                        <>
                          <td className="fw-medium">{(item as SummaryReportDataEmployee).employee_name}</td>
                          <td>{(item as SummaryReportDataEmployee).department_name || 'Не указан'}</td>
                        </>
                      )}
                      {summaryReport.group_by === 'department' && (
                        <td className="fw-medium">{(item as SummaryReportDataDepartment).department_name || 'Не указан'}</td>
                      )}
                      {summaryReport.group_by === 'date' && (
                        <>
                          <td className="fw-medium">{formatMoscowDate((item as SummaryReportDataDate).date)}</td>
                          <td>{(item as SummaryReportDataDate).employee_name}</td>
                        </>
                      )}
                      <td className="text-end fw-bold">{safeNumberFormat(item.total_hours)}</td>
                      <td className="text-end">{item.record_count}</td>
                    </tr>
                  ))}

                  {/* Итоговая строка */}
                  <tr className="table-primary">
                    {summaryReport.group_by === 'employee' && (
                      <td colSpan={2} className="fw-bold">ИТОГО</td>
                    )}
                    {summaryReport.group_by === 'department' && (
                      <td className="fw-bold">ИТОГО</td>
                    )}
                    {summaryReport.group_by === 'date' && (
                      <td colSpan={2} className="fw-bold">ИТОГО</td>
                    )}
                    <td className="text-end fw-bold">
                      {safeNumberFormat(summaryReport.data.reduce(
                        (acc, item) => {
                          // Извлекаем числовое значение и добавляем к накопителю
                          const hours = typeof item.total_hours === 'number' ? 
                            item.total_hours : parseFloat(String(item.total_hours)) || 0;
                          
                          // Нормализуем значения если они слишком большие
                          const normalizedHours = Math.abs(hours) > 10000 ? Math.abs(hours) / 10000000 : Math.abs(hours);
                          
                          return acc + normalizedHours;
                        }, 0
                      ))}
                    </td>
                    <td className="text-end fw-bold">
                      {summaryReport.data.reduce((acc, item) => acc + item.record_count, 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      
      {dailyReport && (
        <div className="card shadow-sm">
          <div className="card-header bg-info bg-opacity-10 d-flex justify-content-between align-items-center">
            <h5 className="mb-0">
              <i className="bi bi-calendar-day me-2"></i>
              Ежедневный отчет: {formatMoscowDate(dailyReport.date)}
            </h5>
            <span className="badge bg-info">
              {dailyReport.records.length} {dailyReport.records.length === 1 ? 'запись' : 
                                           dailyReport.records.length < 5 ? 'записи' : 'записей'}
            </span>
          </div>
          <div className="card-body">
            {dailyReport.records.length === 0 ? (
              <div className="alert alert-warning">
                <i className="bi bi-exclamation-circle me-2"></i>
                Нет записей за выбранную дату
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-striped table-hover">
                  <thead className="table-light">
                    <tr>
                      <th>Сотрудник</th>
                      <th>Начало</th>
                      <th>Окончание</th>
                      <th className="text-end">Часов</th>
                      <th>Описание</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyReport.records.map((record) => (
                      <tr key={record.id}>
                        <td className="fw-medium">{record.employee_name}</td>
                        <td>{formatMoscowDateTime(record.check_in)}</td>
                        <td>
                          {record.check_out
                            ? formatMoscowDateTime(record.check_out)
                            : <span className="badge bg-warning text-dark">В процессе</span>}
                        </td>
                        <td className="text-end fw-bold">{safeNumberFormat(record.duration_hours)}</td>
                        <td>{record.description || <span className="text-muted">—</span>}</td>
                      </tr>
                    ))}

                    {/* Итоговая строка */}
                    <tr className="table-primary">
                      <td colSpan={3} className="fw-bold">ИТОГО ЗА ДЕНЬ</td>
                      <td className="text-end fw-bold">
                        {safeNumberFormat(dailyReport.records.reduce(
                          (acc, record) => {
                            // Извлекаем числовое значение и добавляем к накопителю
                            const hours = typeof record.duration_hours === 'number' ? 
                              record.duration_hours : parseFloat(String(record.duration_hours)) || 0;
                            
                            // Нормализуем значения если они слишком большие
                            const normalizedHours = Math.abs(hours) > 10000 ? Math.abs(hours) / 10000000 : Math.abs(hours);
                            
                            return acc + normalizedHours;
                          }, 0
                        ))}
                      </td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
      
    </div>
  );
};

export default Reports; 