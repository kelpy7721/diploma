from app import app, db
from models import Department, Employee, TimeRecord
from datetime import datetime, timedelta
import random
from routes.utils import get_moscow_time, utc_to_moscow

def init_db():
    """Инициализация базы данных и заполнение тестовыми данными"""
    with app.app_context():
        # Создаем таблицы
        db.create_all()
        
        # Создаем отделы
        departments = [
            Department(name="Разработка"),
            Department(name="Маркетинг"),
            Department(name="Продажи"),
            Department(name="Администрация")
        ]
        
        for dept in departments:
            db.session.add(dept)
        
        db.session.commit()
        
        # Создаем сотрудников
        employees = [
            Employee(first_name="Иван", last_name="Иванов", email="ivan@example.com", 
                    position="Разработчик", department_id=1),
            Employee(first_name="Петр", last_name="Петров", email="petr@example.com", 
                    position="Разработчик", department_id=1),
            Employee(first_name="Мария", last_name="Сидорова", email="maria@example.com", 
                    position="Маркетолог", department_id=2),
            Employee(first_name="Анна", last_name="Кузнецова", email="anna@example.com", 
                    position="Менеджер по продажам", department_id=3),
            Employee(first_name="Алексей", last_name="Смирнов", email="alexey@example.com", 
                    position="Директор", department_id=4)
        ]
        
        for emp in employees:
            db.session.add(emp)
        
        db.session.commit()
        
        # Создаем записи о рабочем времени за последние 7 дней
        moscow_now = get_moscow_time()
        start_date = moscow_now - timedelta(days=7)
        
        records = []
        for day in range(7):
            current_date = start_date + timedelta(days=day)
            
            for employee_id in range(1, 6):
                # Рабочее время примерно с 9 до 18 (московское время)
                base_check_in = datetime.combine(current_date.date(), datetime.min.time()) + timedelta(hours=9)
                # Случайное отклонение до 30 минут
                check_in = base_check_in + timedelta(minutes=random.randint(0, 30))
                
                # Рабочий день примерно 8-9 часов
                work_hours = random.randint(8, 9)
                check_out = check_in + timedelta(hours=work_hours)
                
                # Добавляем обеденный перерыв (не учитываем в записи)
                check_out = check_out + timedelta(hours=1)
                
                # Случайное отклонение до 30 минут при уходе
                check_out = check_out + timedelta(minutes=random.randint(0, 30))
                
                # Не создаем записи для выходных (суббота, воскресенье)
                if current_date.weekday() < 5:
                    record = TimeRecord(
                        employee_id=employee_id,
                        check_in=check_in,
                        check_out=check_out,
                        description=f"Рабочий день {current_date.strftime('%Y-%m-%d')}"
                    )
                    records.append(record)
        
        for record in records:
            db.session.add(record)
        
        db.session.commit()
        
        print(f"База данных инициализирована. Создано {len(departments)} отделов, {len(employees)} сотрудников и {len(records)} записей.")
    
if __name__ == "__main__":
    init_db()