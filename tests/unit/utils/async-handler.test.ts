import { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../../../src/utils/async-handler';

const mockReq = (): Request => ({} as Request);

const mockRes = (): any => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = (): jest.MockedFunction<NextFunction> => jest.fn() as jest.MockedFunction<NextFunction>;

describe('asyncHandler', () => {
  it('calls the wrapped handler with req, res, and next', async () => {
    const handler = jest.fn().mockResolvedValue(undefined);
    const wrapped = asyncHandler(handler);
    const req = mockReq();
    const res = mockRes();
    const next = mockNext();

    wrapped(req, res, next);
    await Promise.resolve(); // flush microtask queue

    expect(handler).toHaveBeenCalledWith(req, res, next);
  });

  it('does not call next when handler resolves successfully', async () => {
    const handler = jest.fn().mockResolvedValue('done');
    const wrapped = asyncHandler(handler);
    const next = mockNext();

    wrapped(mockReq(), mockRes(), next);
    await Promise.resolve();

    expect(next).not.toHaveBeenCalled();
  });

  it('calls next with error when handler rejects', async () => {
    const error = new Error('async failure');
    const handler = jest.fn().mockRejectedValue(error);
    const wrapped = asyncHandler(handler);
    const next = mockNext();

    wrapped(mockReq(), mockRes(), next);
    await Promise.resolve(); // flush microtask queue

    expect(next).toHaveBeenCalledWith(error);
  });

  it('calls next with error when handler throws synchronously (via rejected promise)', async () => {
    const error = new Error('sync throw wrapped in promise');
    const handler = jest.fn().mockRejectedValue(error);
    const wrapped = asyncHandler(handler);
    const next = mockNext();

    wrapped(mockReq(), mockRes(), next);
    await new Promise(setImmediate);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('returns a function (middleware)', () => {
    const handler = jest.fn().mockResolvedValue(undefined);
    const wrapped = asyncHandler(handler);
    expect(typeof wrapped).toBe('function');
  });

  it('passes the resolved value through without interfering', async () => {
    const responseData = { id: 1 };
    const res = mockRes();
    const handler = jest.fn().mockImplementation(async (_req, r) => {
      r.status(200).json(responseData);
    });
    const wrapped = asyncHandler(handler);

    wrapped(mockReq(), res, mockNext());
    await new Promise(setImmediate);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(responseData);
  });

  it('forwards non-Error rejection values to next', async () => {
    const rejection = 'string error';
    const handler = jest.fn().mockRejectedValue(rejection);
    const wrapped = asyncHandler(handler);
    const next = mockNext();

    wrapped(mockReq(), mockRes(), next);
    await new Promise(setImmediate);

    expect(next).toHaveBeenCalledWith(rejection);
  });
});
