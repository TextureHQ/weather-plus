import { isTimeoutError } from './providerUtils';

describe('providerUtils', () => {
  describe('isTimeoutError', () => {
    it('should return true for ECONNABORTED error code', () => {
      const error = {
        code: 'ECONNABORTED',
        message: 'timeout of 10000ms exceeded',
      };
      expect(isTimeoutError(error)).toBe(true);
    });

    it('should return true for ETIMEDOUT error code', () => {
      const error = {
        code: 'ETIMEDOUT',
        message: 'Connection timeout',
      };
      expect(isTimeoutError(error)).toBe(true);
    });

    it('should return true when message includes "timeout"', () => {
      const error = {
        message: 'Request timeout occurred',
      };
      expect(isTimeoutError(error)).toBe(true);
    });

    it('should return false for non-timeout errors', () => {
      const error = {
        code: 'ENOTFOUND',
        message: 'getaddrinfo ENOTFOUND',
      };
      expect(isTimeoutError(error)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isTimeoutError(undefined)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isTimeoutError(null)).toBe(false);
    });

    it('should return false for non-error objects', () => {
      expect(isTimeoutError({ foo: 'bar' })).toBe(false);
    });
  });
});
