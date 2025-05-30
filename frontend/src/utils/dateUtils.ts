/**
 * Утилиты для работы с датами и временем
 */

/**
 * Форматирует время в Московском часовом поясе (UTC+3)
 * @param isoString - ISO строка даты
 * @returns строка с отформатированным временем
 */
export const formatMoscowTime = (isoString: string | undefined): string => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Europe/Moscow'
  }).format(date);
};

/**
 * Форматирует дату в Московском часовом поясе (UTC+3)
 * @param isoString - ISO строка даты
 * @returns строка с отформатированной датой
 */
export const formatMoscowDate = (isoString: string | undefined): string => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Europe/Moscow'
  }).format(date);
};

/**
 * Возвращает текущую дату в формате локализованной строки по московскому времени
 * @returns строка с текущей датой
 */
export const getCurrentMoscowDate = (): string => {
  const options: Intl.DateTimeFormatOptions = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    timeZone: 'Europe/Moscow'
  };
  return new Date().toLocaleDateString('ru-RU', options);
};

/**
 * Форматирует дату и время в Московском часовом поясе (UTC+3)
 * @param isoString - ISO строка даты
 * @returns строка с отформатированной датой и временем
 */
export const formatMoscowDateTime = (isoString: string | undefined): string => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Europe/Moscow'
  }).format(date);
}; 