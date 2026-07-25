/**
 * Задержка выполнения на указанное количество миллисекунд
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Случайная задержка в диапазоне от min до max секунд
 */
export function randomDelay(minSeconds: number = 0, maxSeconds: number = 10): Promise<void> {
  const ms = Math.floor(Math.random() * (maxSeconds - minSeconds + 1) + minSeconds) * 1000;
  return delay(ms);
}