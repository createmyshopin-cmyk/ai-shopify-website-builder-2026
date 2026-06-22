export const PRD_RETRY_DELAYS_MS = [5_000, 10_000, 20_000] as const;

export interface RetryOptions {
  maxAttempts?: number;
  delaysMs?: readonly number[];
  onRetry?: (attempt: number, error: unknown) => void;
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 3;
  const delays = options.delaysMs ?? PRD_RETRY_DELAYS_MS;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts) {
        break;
      }
      options.onRetry?.(attempt, error);
      const delay = delays[attempt - 1] ?? delays[delays.length - 1] ?? 5_000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
