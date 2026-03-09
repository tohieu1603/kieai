import { Request } from 'express';
import { parsePagination } from '../../../src/utils/pagination';

function mockReq(query: Record<string, string> = {}): Request {
  return { query } as unknown as Request;
}

describe('parsePagination', () => {
  describe('default values', () => {
    it('defaults page to 1 when not provided', () => {
      const result = parsePagination(mockReq());
      expect(result.page).toBe(1);
    });

    it('defaults limit to 20 when not provided', () => {
      const result = parsePagination(mockReq());
      expect(result.limit).toBe(20);
    });

    it('defaults skip to 0 when page=1 and limit=20', () => {
      const result = parsePagination(mockReq());
      expect(result.skip).toBe(0);
    });
  });

  describe('custom values', () => {
    it('parses custom page', () => {
      const result = parsePagination(mockReq({ page: '3' }));
      expect(result.page).toBe(3);
    });

    it('parses custom limit', () => {
      const result = parsePagination(mockReq({ limit: '50' }));
      expect(result.limit).toBe(50);
    });

    it('calculates skip correctly for page 2 limit 10', () => {
      const result = parsePagination(mockReq({ page: '2', limit: '10' }));
      expect(result.skip).toBe(10);
    });

    it('calculates skip correctly for page 5 limit 20', () => {
      const result = parsePagination(mockReq({ page: '5', limit: '20' }));
      expect(result.skip).toBe(80);
    });
  });

  describe('boundary clamping', () => {
    it('clamps page < 1 to 1', () => {
      const result = parsePagination(mockReq({ page: '0' }));
      expect(result.page).toBe(1);
    });

    it('clamps negative page to 1', () => {
      const result = parsePagination(mockReq({ page: '-5' }));
      expect(result.page).toBe(1);
    });

    it('clamps limit > maxLimit to maxLimit', () => {
      const result = parsePagination(mockReq({ limit: '200' }));
      expect(result.limit).toBe(100);
    });

    it('respects custom maxLimit', () => {
      const result = parsePagination(mockReq({ limit: '60' }), 50);
      expect(result.limit).toBe(50);
    });

    it('treats limit=0 as falsy and defaults to 20', () => {
      // parseInt('0') = 0, 0 || 20 = 20 (0 is falsy), so limit defaults to 20
      const result = parsePagination(mockReq({ limit: '0' }));
      expect(result.limit).toBe(20);
    });

    it('clamps negative limit to 1', () => {
      // parseInt('-10') = -10, -10 || 20 = -10 (non-zero is truthy), Math.max(1, -10) = 1
      const result = parsePagination(mockReq({ limit: '-10' }));
      expect(result.limit).toBe(1);
    });
  });

  describe('NaN handling', () => {
    it('defaults page to 1 when NaN', () => {
      const result = parsePagination(mockReq({ page: 'abc' }));
      expect(result.page).toBe(1);
    });

    it('defaults limit to 20 when NaN', () => {
      const result = parsePagination(mockReq({ limit: 'xyz' }));
      expect(result.limit).toBe(20);
    });

    it('defaults both to page=1 limit=20 for empty strings', () => {
      const result = parsePagination(mockReq({ page: '', limit: '' }));
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });
  });

  describe('skip calculation', () => {
    it('skip is always (page - 1) * limit', () => {
      const cases = [
        { page: '1', limit: '10', expectedSkip: 0 },
        { page: '2', limit: '10', expectedSkip: 10 },
        { page: '3', limit: '25', expectedSkip: 50 },
        { page: '10', limit: '5', expectedSkip: 45 },
      ];

      for (const { page, limit, expectedSkip } of cases) {
        const result = parsePagination(mockReq({ page, limit }));
        expect(result.skip).toBe(expectedSkip);
      }
    });
  });
});
