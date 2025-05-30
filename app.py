import os
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from models import db, TimeRecord, Employee, Department
from routes.time_records import time_records_bp
from routes.employees import employees_bp
from routes.reports import reports_bp

app = Flask(__name__, static_folder='frontend/dist')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///time_tracking.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev_key')

# Инициализация расширений
CORS(app)
db.init_app(app)

# Регистрация маршрутов
app.register_blueprint(time_records_bp, url_prefix='/api/time-records')
app.register_blueprint(employees_bp, url_prefix='/api/employees')
app.register_blueprint(reports_bp, url_prefix='/api/reports')

# Добавляем маршрут для получения отделов
@app.route('/api/departments', methods=['GET'])
def get_departments():
    try:
        departments = Department.query.all()
        print(f"Returning {len(departments)} departments")
        # Добавим вывод списка отделов для отладки
        for dept in departments:
            print(f"Department ID: {dept.id}, Name: {dept.name}")
            
        response_data = {
            'items': [dept.to_dict() for dept in departments],
            'total': len(departments)
        }
        print(f"Full response data: {response_data}")
        return jsonify(response_data)
    except Exception as e:
        print(f"Error getting departments: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/')
def index():
    try:
        return app.send_static_file('index.html')
    except Exception as e:
        print(f"Ошибка при отправке index.html: {str(e)}")
        # Запасной вариант - попробовать использовать файл из src
        try:
            return send_from_directory('frontend/src', 'index.html')
        except Exception as e2:
            print(f"Ошибка при отправке из src: {str(e2)}")
            return jsonify({"error": "Frontend not built"}), 500

@app.errorhandler(404)
def not_found(e):
    try:
        return app.send_static_file('index.html')
    except Exception as ex:
        print(f"Ошибка 404 при отправке index.html: {str(ex)}")
        try:
            return send_from_directory('frontend/src', 'index.html')
        except Exception as e2:
            print(f"Ошибка 404 при отправке из src: {str(e2)}")
            return jsonify({"error": "Page not found", "message": str(e)}), 404

@app.route('/api/status')
def status():
    return jsonify({"status": "ok"})

# Добавляем маршрут для всех файлов в дистрибутиве
@app.route('/<path:path>')
def serve_static(path):
    try:
        return app.send_static_file(path)
    except Exception as e:
        print(f"Ошибка при отправке статического файла {path}: {str(e)}")
        return app.send_static_file('index.html')

if __name__ == '__main__':
    # Печатаем информацию о путях для отладки
    print(f"Текущая директория: {os.getcwd()}")
    print(f"Статические файлы: {app.static_folder}")
    print(f"Существует ли папка dist: {os.path.exists('frontend/dist')}")
    print(f"Содержимое папки dist: {os.listdir('frontend/dist') if os.path.exists('frontend/dist') else 'папка не существует'}")
    
    with app.app_context():
        db.create_all()
    app.run(debug=True) 