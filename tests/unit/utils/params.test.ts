import { Request } from 'express';
import { getParam } from '../../../src/utils/params';

function mockReq(params: Record<string, string | string[]>): Request {
  return { params } as unknown as Request;
}

describe('getParam', () => {
  it('returns the param value directly when it is a string', () => {
    const req = mockReq({ id: 'abc123' });
    expect(getParam(req, 'id')).toBe('abc123');
  });

  it('returns the first element when param is an array', () => {
    const req = mockReq({ id: ['first', 'second', 'third'] });
    expect(getParam(req, 'id')).toBe('first');
  });

  it('returns a single-element array as the first element', () => {
    const req = mockReq({ slug: ['only-value'] });
    expect(getParam(req, 'slug')).toBe('only-value');
  });

  it('handles different param names', () => {
    const req = mockReq({ userId: 'user-99', orgId: 'org-42' });
    expect(getParam(req, 'userId')).toBe('user-99');
    expect(getParam(req, 'orgId')).toBe('org-42');
  });
});
