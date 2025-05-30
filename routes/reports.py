from flask import Blueprint, request, jsonify
from models import db, TimeRecord, Employee, Department
from sqlalchemy import func, desc, cast, Date
from datetime import datetime, timedelta
import csv
import io

reports_bp = Blueprint('reports', __name__)

@reports_bp.route('/summary', methods=['GET'])
def get_summary_report():
    """Получение общего отчета по рабочему времени"""
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    department_id = request.args.get('department_id', type=int)
    group_by = request.args.get('group_by', 'employee')  # employee, department, date
    
    if not start_date or not end_date:
        return jsonify({'error': 'Start date and end date are required'}), 400
    
    try:
        start_date = datetime.fromisoformat(start_date)
        end_date = datetime.fromisoformat(end_date)
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use ISO format (YYYY-MM-DDTHH:MM:SS)'}), 400
    
    query = db.session.query(
        TimeRecord.employee_id,
        Employee.first_name,
        Employee.last_name,
        Employee.department_id,
        Department.name.label('department_name'),
        func.sum(
            func.coalesce(
                func.extract('epoch', TimeRecord.check_out - TimeRecord.check_in),
                0
            ) / 3600
        ).label('total_hours'),
        func.count(TimeRecord.id).label('record_count')
    ).join(
        Employee, TimeRecord.employee_id == Employee.id
    ).outerjoin(
        Department, Employee.department_id == Department.id
    ).filter(
        TimeRecord.check_in >= start_date,
        TimeRecord.check_in <= end_date,
        TimeRecord.check_out != None
    )
    
    if department_id:
        query = query.filter(Employee.department_id == department_id)
    
    if group_by == 'employee':
        query = query.group_by(
            TimeRecord.employee_id,
            Employee.first_name,
            Employee.last_name,
            Employee.department_id,
            Department.name
        )
    elif group_by == 'department':
        query = query.group_by(
            Employee.department_id,
            Department.name
        )
    elif group_by == 'date':
        query = query.group_by(
            cast(TimeRecord.check_in, Date),
            TimeRecord.employee_id,
            Employee.first_name,
            Employee.last_name,
            Employee.department_id,
            Department.name
        )
    
    results = query.all()
    
    response_data = []
    for row in results:
        item = {
            'employee_id': row.employee_id,
            'employee_name': f"{row.first_name} {row.last_name}",
            'department_id': row.department_id,
            'department_name': row.department_name,
            'total_hours': round(row.total_hours, 2),
            'record_count': row.record_count
        }
        response_data.append(item)
    
    return jsonify({
        'period': {
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat()
        },
        'group_by': group_by,
        'data': response_data
    })

@reports_bp.route('/daily', methods=['GET'])
def get_daily_report():
    """Получение ежедневного отчета по рабочему времени"""
    employee_id = request.args.get('employee_id', type=int)
    department_id = request.args.get('department_id', type=int)
    date = request.args.get('date')
    
    if not date:
        date = datetime.now().date().isoformat()
    
    try:
        report_date = datetime.fromisoformat(date).date()
        start_date = datetime.combine(report_date, datetime.min.time())
        end_date = datetime.combine(report_date, datetime.max.time())
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use ISO format (YYYY-MM-DD)'}), 400
    
    query = db.session.query(
        TimeRecord
    ).join(
        Employee, TimeRecord.employee_id == Employee.id
    ).filter(
        TimeRecord.check_in >= start_date,
        TimeRecord.check_in <= end_date
    )
    
    if employee_id:
        query = query.filter(TimeRecord.employee_id == employee_id)
    
    if department_id:
        query = query.filter(Employee.department_id == department_id)
    
    records = query.order_by(TimeRecord.check_in).all()
    
    return jsonify({
        'date': date,
        'records': [record.to_dict() for record in records]
    })

@reports_bp.route('/export/csv', methods=['GET'])
def export_csv():
    """Экспорт данных в формате CSV"""
    report_type = request.args.get('type', 'summary')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    department_id = request.args.get('department_id', type=int)
    
    if not start_date or not end_date:
        return jsonify({'error': 'Start date and end date are required'}), 400
    
    try:
        start_date = datetime.fromisoformat(start_date)
        end_date = datetime.fromisoformat(end_date)
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use ISO format (YYYY-MM-DDTHH:MM:SS)'}), 400
    
    # Создаем CSV в памяти
    csv_buffer = io.StringIO()
    csv_writer = csv.writer(csv_buffer)
    
    if report_type == 'summary':
        # Заголовки CSV
        csv_writer.writerow([
            'ID сотрудника', 'Имя', 'Фамилия', 'Отдел', 
            'Всего часов', 'Количество записей'
        ])
        
        # Получаем данные
        query = db.session.query(
            TimeRecord.employee_id,
            Employee.first_name,
            Employee.last_name,
            Department.name.label('department_name'),
            func.sum(
                func.coalesce(
                    func.extract('epoch', TimeRecord.check_out - TimeRecord.check_in),
                    0
                ) / 3600
            ).label('total_hours'),
            func.count(TimeRecord.id).label('record_count')
        ).join(
            Employee, TimeRecord.employee_id == Employee.id
        ).outerjoin(
            Department, Employee.department_id == Department.id
        ).filter(
            TimeRecord.check_in >= start_date,
            TimeRecord.check_in <= end_date,
            TimeRecord.check_out != None
        )
        
        if department_id:
            query = query.filter(Employee.department_id == department_id)
        
        query = query.group_by(
            TimeRecord.employee_id,
            Employee.first_name,
            Employee.last_name,
            Department.name
        )
        
        results = query.all()
        
        # Записываем данные
        for row in results:
            csv_writer.writerow([
                row.employee_id,
                row.first_name,
                row.last_name,
                row.department_name or 'Не указан',
                round(row.total_hours, 2),
                row.record_count
            ])
    
    elif report_type == 'detailed':
        # Заголовки CSV
        csv_writer.writerow([
            'ID записи', 'Сотрудник', 'Отдел', 
            'Время начала', 'Время окончания', 'Часов', 'Описание'
        ])
        
        # Получаем данные
        query = db.session.query(
            TimeRecord.id,
            Employee.first_name,
            Employee.last_name,
            Department.name.label('department_name'),
            TimeRecord.check_in,
            TimeRecord.check_out,
            (func.extract('epoch', TimeRecord.check_out - TimeRecord.check_in) / 3600).label('hours'),
            TimeRecord.description
        ).join(
            Employee, TimeRecord.employee_id == Employee.id
        ).outerjoin(
            Department, Employee.department_id == Department.id
        ).filter(
            TimeRecord.check_in >= start_date,
            TimeRecord.check_in <= end_date,
            TimeRecord.check_out != None
        )
        
        if department_id:
            query = query.filter(Employee.department_id == department_id)
        
        results = query.order_by(TimeRecord.check_in).all()
        
        # Записываем данные
        for row in results:
            csv_writer.writerow([
                row.id,
                f"{row.first_name} {row.last_name}",
                row.department_name or 'Не указан',
                row.check_in.strftime('%Y-%m-%d %H:%M:%S'),
                row.check_out.strftime('%Y-%m-%d %H:%M:%S') if row.check_out else '',
                round(row.hours, 2) if row.hours else 0,
                row.description or ''
            ])
    
    # Подготавливаем ответ
    csv_content = csv_buffer.getvalue()
    csv_buffer.close()
    
    response = jsonify({
        'csv_data': csv_content,
        'filename': f"time_tracking_{report_type}_{start_date.strftime('%Y%m%d')}-{end_date.strftime('%Y%m%d')}.csv"
    })
    
    return response 