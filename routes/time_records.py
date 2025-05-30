from flask import Blueprint, request, jsonify, current_app
from models import db, TimeRecord, Employee
from datetime import datetime
from sqlalchemy import desc
from routes.utils import get_moscow_time, utc_to_moscow, moscow_to_utc

time_records_bp = Blueprint('time_records', __name__)

@time_records_bp.route('/', methods=['GET'])
def get_time_records():
    """Получение списка записей рабочего времени с возможностью фильтрации"""
    employee_id = request.args.get('employee_id', type=int)
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    query = TimeRecord.query
    
    if employee_id:
        query = query.filter(TimeRecord.employee_id == employee_id)
    
    if start_date:
        start_date = datetime.fromisoformat(start_date)
        query = query.filter(TimeRecord.check_in >= start_date)
    
    if end_date:
        end_date = datetime.fromisoformat(end_date)
        query = query.filter(TimeRecord.check_in <= end_date)
    
    query = query.order_by(desc(TimeRecord.check_in))
    
    records = query.paginate(page=page, per_page=per_page)
    
    return jsonify({
        'items': [record.to_dict() for record in records.items],
        'total': records.total,
        'pages': records.pages,
        'page': page
    })

@time_records_bp.route('/<int:record_id>', methods=['GET'])
def get_time_record(record_id):
    """Получение детальной информации о записи по ID"""
    record = TimeRecord.query.get_or_404(record_id)
    return jsonify(record.to_dict())

@time_records_bp.route('/', methods=['POST'])
def create_time_record():
    """Создание новой записи о рабочем времени (регистрация прихода)"""
    data = request.get_json()
    
    employee_id = data.get('employee_id')
    
    if not employee_id:
        return jsonify({'error': 'Employee ID is required'}), 400
    
    employee = Employee.query.get(employee_id)
    if not employee:
        return jsonify({'error': 'Employee not found'}), 404
    
    # Проверка на открытую запись для сотрудника
    open_record = TimeRecord.query.filter_by(
        employee_id=employee_id, 
        check_out=None
    ).first()
    
    if open_record:
        return jsonify({
            'error': 'Employee already has an open time record',
            'record': open_record.to_dict()
        }), 400
    
    # Используем московское время, если не указано конкретное время прихода
    if 'check_in' in data and data['check_in']:
        check_in = datetime.fromisoformat(data['check_in'])
    else:
        # Используем текущее московское время
        check_in = get_moscow_time()
    
    new_record = TimeRecord(
        employee_id=employee_id,
        check_in=check_in,
        description=data.get('description', '')
    )
    
    db.session.add(new_record)
    db.session.commit()
    
    return jsonify(new_record.to_dict()), 201

@time_records_bp.route('/<int:record_id>', methods=['PUT'])
def update_time_record(record_id):
    """Обновление записи (включая регистрацию ухода)"""
    record = TimeRecord.query.get_or_404(record_id)
    data = request.get_json()
    
    if 'check_out' in data and data['check_out']:
        if data['check_out'] == 'now':
            # Если указано 'now', используем текущее московское время
            check_out = get_moscow_time()
        else:
            # Иначе парсим указанное время
            check_out = datetime.fromisoformat(data['check_out'])
            
        if check_out < record.check_in:
            return jsonify({'error': 'Check-out time cannot be before check-in time'}), 400
        record.check_out = check_out
    
    if 'description' in data:
        record.description = data['description']
    
    db.session.commit()
    
    return jsonify(record.to_dict())

@time_records_bp.route('/check-in', methods=['POST'])
def check_in():
    """Отметка о приходе сотрудника"""
    data = request.get_json()
    employee_id = data.get('employee_id')
    
    if not employee_id:
        return jsonify({'error': 'Employee ID is required'}), 400
    
    # Проверка на открытую запись
    open_record = TimeRecord.query.filter_by(
        employee_id=employee_id, 
        check_out=None
    ).first()
    
    if open_record:
        return jsonify({
            'error': 'Employee already checked in',
            'record': open_record.to_dict()
        }), 400
    
    # Используем московское время
    moscow_time = get_moscow_time()
    
    new_record = TimeRecord(
        employee_id=employee_id,
        check_in=moscow_time,  # Используем московское время
        description=data.get('description', '')
    )
    
    db.session.add(new_record)
    db.session.commit()
    
    return jsonify(new_record.to_dict()), 201

@time_records_bp.route('/check-out', methods=['POST'])
def check_out():
    """Отметка об уходе сотрудника"""
    data = request.get_json()
    employee_id = data.get('employee_id')
    
    if not employee_id:
        return jsonify({'error': 'ID сотрудника не указан'}), 400
    
    # Находим открытую запись
    record = TimeRecord.query.filter_by(
        employee_id=employee_id, 
        check_out=None
    ).first()
    
    if not record:
        return jsonify({'error': 'Открытая запись не найдена для этого сотрудника'}), 404
    
    # Используем московское время
    record.check_out = get_moscow_time()
    
    if 'description' in data:
        record.description = data['description']
    
    db.session.commit()
    
    return jsonify(record.to_dict()) 