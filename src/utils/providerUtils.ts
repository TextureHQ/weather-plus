import { AxiosError } from 'axios';

/**
 * Checks if an error is a timeout error (either axios timeout or network timeout)
 * @param error - The error to check
 * @returns true if the error is a timeout error
 */
export function isTimeoutError(error: unknown): boolean {
  const axiosError = error as AxiosError | undefined;
  return (
    axiosError?.code === 'ECONNABORTED' ||
    axiosError?.code === 'ETIMEDOUT' ||
    axiosError?.message?.includes('timeout') ||
    false
  );
}
