/**
 * Проверка, является ли строка валидным URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Нормализация URL (добавление протокола если отсутствует)
 */
export function normalizeUrl(url: string): string {
  url = url.trim();
  
  if (!/^https?:\/\//i.test(url)) {
    return `https://${url}`;
  }
  
  return url;
}