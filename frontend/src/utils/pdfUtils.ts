import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Создаем карту соответствия кириллических символов
const cyrillicMap: { [key: string]: string } = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh',
  'з': 'z', 'и': 'i', 'й': 'j', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
  'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts',
  'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu',
  'я': 'ya',
  'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo', 'Ж': 'Zh',
  'З': 'Z', 'И': 'I', 'Й': 'J', 'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N', 'О': 'O',
  'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U', 'Ф': 'F', 'Х': 'H', 'Ц': 'Ts',
  'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Sch', 'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu',
  'Я': 'Ya'
};

/**
 * Транслитерирует русский текст для корректного отображения в PDF
 * @param text Строка для транслитерации
 * @returns Транслитерированная строка
 */
export function transliterateText(text: string): string {
  if (!text) return '';
  
  return text.split('').map(char => {
    return cyrillicMap[char] || char;
  }).join('');
}

/**
 * Создает PDF документ с поддержкой кириллицы через транслитерацию
 * @returns Объект jsPDF с поддержкой кириллицы
 */
export const createPDFWithCyrillicSupport = (): jsPDF => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    putOnlyUsedFonts: true,
    compress: true
  });
  
  // Сохраняем оригинальный метод text
  const originalText = doc.text.bind(doc);
  
  // Переопределяем метод text для автоматической транслитерации
  doc.text = function(text: string | string[], x: number, y: number, options?: any): jsPDF {
    if (typeof text === 'string') {
      // Транслитерируем текст для корректного отображения
      return originalText(transliterateText(text), x, y, options);
    } else if (Array.isArray(text)) {
      // Транслитерируем массив строк
      const translitTexts = text.map(t => transliterateText(t));
      return originalText(translitTexts, x, y, options);
    }
    return this;
  };
  
  return doc;
};

/**
 * Добавляет поддержку кириллицы для PDF документа через подключение шрифтов
 * @param doc Объект jsPDF
 */
export const addCyrillicSupport = async (doc: jsPDF): Promise<void> => {
  // Используем шрифт, который точно поддерживает кириллицу
  const fontUrl = 'https://raw.githubusercontent.com/bmeshoulam/font/master/PTSans.ttf';
  
  try {
    // Загрузка шрифта
    const fontResponse = await fetch(fontUrl);
    const fontArrayBuffer = await fontResponse.arrayBuffer();
    
    // Добавление шрифта в PDF документ
    doc.addFileToVFS('PTSans.ttf', arrayBufferToBase64(fontArrayBuffer));
    doc.addFont('PTSans.ttf', 'PTSans', 'normal');
    doc.addFont('PTSans.ttf', 'PTSans', 'bold');
    
    // Установка шрифта для документа
    doc.setFont('PTSans');
    
    console.log('Шрифт с поддержкой кириллицы успешно загружен');
    
    // Модификация jspdf для поддержки русского текста
    // @ts-ignore
    const oldHasOwnProperty = Object.prototype.hasOwnProperty;
    // @ts-ignore
    if (!doc.internal.acroformPlugin.hasOwnProperty) {
      // @ts-ignore
      doc.internal.acroformPlugin.hasOwnProperty = function(obj, key) {
        return oldHasOwnProperty.call(obj, key);
      };
    }
  } catch (error) {
    console.error('Ошибка при загрузке шрифта:', error);
    // В случае ошибки загрузки используем стандартный шрифт
    doc.setFont('helvetica');
  }
};

/**
 * Конвертирует ArrayBuffer в Base64
 * @param buffer ArrayBuffer для конвертации
 * @returns строка в формате Base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  
  return btoa(binary);
} 