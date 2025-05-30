from app import app
from models import db, Department

def fix_duplicate_departments():
    """
    Удаляет дублирующиеся отделы из базы данных, оставляя только уникальные.
    """
    with app.app_context():
        # Получаем все отделы
        all_departments = Department.query.all()
        
        print(f"Всего найдено отделов: {len(all_departments)}")
        print("Список отделов в БД:")
        for dept in all_departments:
            print(f"ID: {dept.id}, Name: {dept.name}")
        
        # Находим дубликаты по имени
        unique_names = {}
        duplicates = []
        
        for dept in all_departments:
            if dept.name in unique_names:
                # Это дубликат - добавляем в список на удаление
                duplicates.append(dept)
            else:
                # Это первое вхождение - сохраняем как уникальное
                unique_names[dept.name] = dept
        
        # Выводим информацию о дубликатах
        print(f"Найдено уникальных отделов: {len(unique_names)}")
        print(f"Найдено дубликатов для удаления: {len(duplicates)}")
        
        # Удаляем дубликаты
        if duplicates:
            print("Удаляем дубликаты...")
            for dept in duplicates:
                print(f"Удаление дубликата: ID: {dept.id}, Name: {dept.name}")
                db.session.delete(dept)
            
            # Сохраняем изменения
            db.session.commit()
            print("Дубликаты успешно удалены")
        else:
            print("Дубликатов не обнаружено, база данных не изменена")

if __name__ == "__main__":
    fix_duplicate_departments() 