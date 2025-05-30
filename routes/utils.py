from datetime import datetime, timedelta

# Смещение московского времени от UTC (UTC+3)
MOSCOW_TIMEZONE_OFFSET = 3

def get_moscow_time():
    """
    Возвращает текущее время в московском часовом поясе (UTC+3).
    """
    return datetime.utcnow() + timedelta(hours=MOSCOW_TIMEZONE_OFFSET)

def utc_to_moscow(utc_time):
    """
    Преобразует время из UTC в московское время (UTC+3).
    """
    if not utc_time:
        return None
    return utc_time + timedelta(hours=MOSCOW_TIMEZONE_OFFSET)

def moscow_to_utc(moscow_time):
    """
    Преобразует время из московского времени (UTC+3) в UTC.
    """
    if not moscow_time:
        return None
    return moscow_time - timedelta(hours=MOSCOW_TIMEZONE_OFFSET) 