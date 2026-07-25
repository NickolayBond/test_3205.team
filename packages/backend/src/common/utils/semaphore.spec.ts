import { Semaphore } from './semaphore';

describe('Semaphore', () => {
  it('should limit concurrent operations', async () => {
    const semaphore = new Semaphore(2);
    let concurrent = 0;
    let maxConcurrent = 0;

    const tasks = Array.from({ length: 10 }, async () => {
      await semaphore.acquire();
      concurrent++;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      await new Promise(resolve => setTimeout(resolve, 10));
      concurrent--;
      semaphore.release();
    });

    await Promise.all(tasks);
    expect(maxConcurrent).toBe(2);
  });

  it('should handle release correctly', async () => {
    const semaphore = new Semaphore(1);
    
    await semaphore.acquire();
    expect(semaphore.getCurrentCount()).toBe(1);
    
    semaphore.release();
    expect(semaphore.getCurrentCount()).toBe(0);
  });
});