from flask import Blueprint, request, jsonify
from models import db, Employee, Department, TimeRecord
from sqlalchemy import desc

employees_bp = Blueprint('employees', __name__)

@employees_bp.route('/', methods=['GET'])
def get_employees():
    """Получение списка сотрудников с возможностью фильтрации"""
    department_id = request.args.get('department_id', type=int)
    is_active = request.args.get('is_active')
    search = request.args.get('search', '')
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    query = Employee.query
    
    if department_id:
        query = query.filter(Employee.department_id == department_id)
    
    if is_active is not None:
        is_active = is_active.lower() == 'true'
        query = query.filter(Employee.is_active == is_active)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Employee.first_name.ilike(search_term)) | 
            (Employee.last_name.ilike(search_term)) | 
            (Employee.email.ilike(search_term)) |
            (Employee.position.ilike(search_term))
        )
    
    query = query.order_by(Employee.last_name, Employee.first_name)
    
    employees = query.paginate(page=page, per_page=per_page)
    
    return jsonify({
        'items': [employee.to_dict() for employee in employees.items],
        'total': employees.total,
        'pages': employees.pages,
        'page': page
    })

@employees_bp.route('/<int:employee_id>', methods=['GET'])
def get_employee(employee_id):
    """Получение информации о сотруднике по ID"""
    employee = Employee.query.get_or_404(employee_id)
    return jsonify(employee.to_dict())

@employees_bp.route('/', methods=['POST'])
def create_employee():
    """Создание нового сотрудника"""
    data = request.get_json()
    
    required_fields = ['first_name', 'last_name', 'email', 'position']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Field {field} is required'}), 400
    
    # Проверка на уникальность email
    if Employee.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already exists'}), 400
    
    # Проверка на существование отдела, если указан
    department_id = data.get('department_id')
    if department_id and not Department.query.get(department_id):
        return jsonify({'error': 'Department not found'}), 400
    
    new_employee = Employee(
        first_name=data['first_name'],
        last_name=data['last_name'],
        email=data['email'],
        position=data['position'],
        department_id=department_id,
        is_active=data.get('is_active', True)
    )
    
    db.session.add(new_employee)
    db.session.commit()
    
    return jsonify(new_employee.to_dict()), 201

@employees_bp.route('/<int:employee_id>', methods=['PUT'])
def update_employee(employee_id):
    """Обновление информации о сотруднике"""
    employee = Employee.query.get_or_404(employee_id)
    data = request.get_json()
    
    print(f"Updating employee {employee_id}. Received data: {data}")
    
    # Проверка на уникальность email
    if 'email' in data and data['email'] != employee.email:
        if Employee.query.filter_by(email=data['email']).first():
            print(f"Email already exists: {data['email']}")
            return jsonify({'error': 'Email already exists'}), 400
    
    # Проверка на существование отдела, если указан
    if 'department_id' in data and data['department_id'] is not None:
        department = Department.query.get(data['department_id'])
        if not department:
            print(f"Department not found: {data['department_id']}")
            return jsonify({'error': 'Department not found'}), 400
        print(f"Department found: {department.name} (ID: {department.id})")
    
    # Обновление полей
    for field in ['first_name', 'last_name', 'email', 'position', 'department_id', 'is_active']:
        if field in data:
            old_value = getattr(employee, field)
            setattr(employee, field, data[field])
            print(f"Updated {field}: {old_value} -> {data[field]}")
    
    try:
        db.session.commit()
        print(f"Successfully updated employee {employee_id}")
        return jsonify(employee.to_dict())
    except Exception as e:
        db.session.rollback()
        print(f"Error updating employee: {str(e)}")
        return jsonify({'error': str(e)}), 500

@employees_bp.route('/<int:employee_id>', methods=['DELETE'])
def delete_employee(employee_id):
    """Удаление сотрудника (мягкое удаление - установка is_active=False)"""
    employee = Employee.query.get_or_404(employee_id)
    employee.is_active = False
    db.session.commit()
    
    return jsonify({'message': 'Employee deactivated successfully'})

@employees_bp.route('/<int:employee_id>/time-records', methods=['GET'])
def get_employee_time_records(employee_id):
    """Получение записей о времени для конкретного сотрудника"""
    employee = Employee.query.get_or_404(employee_id)
    
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    query = employee.time_records
    
    if start_date:
        from datetime import datetime
        start_date = datetime.fromisoformat(start_date)
        query = query.filter(Employee.TimeRecord.check_in >= start_date)
    
    if end_date:
        from datetime import datetime
        end_date = datetime.fromisoformat(end_date)
        query = query.filter(Employee.TimeRecord.check_in <= end_date)
    
    query = query.order_by(desc('check_in'))
    
    records = query.paginate(page=page, per_page=per_page)
    
    return jsonify({
        'employee': employee.to_dict(),
        'time_records': {
            'items': [record.to_dict() for record in records.items],
            'total': records.total,
            'pages': records.pages,
            'page': page
        }
    })

@employees_bp.route('/with-open-records', methods=['GET'])
def get_employees_with_open_records():
    """Получение списка сотрудников с открытыми записями времени"""
    # Подзапрос для получения ID сотрудников с открытыми записями
    employees_with_open_records = db.session.query(TimeRecord.employee_id)\
        .filter(TimeRecord.check_out == None)\
        .distinct()
    
    # Запрос для получения данных сотрудников с открытыми записями
    employees = Employee.query\
        .filter(Employee.id.in_(employees_with_open_records))\
        .order_by(Employee.last_name, Employee.first_name)\
        .all()
    
    return jsonify({
        'items': [employee.to_dict() for employee in employees],
        'total': len(employees)
    }) 