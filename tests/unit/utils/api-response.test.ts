import { Response } from 'express';
import { ApiResponse } from '../../../src/utils/api-response';

const mockRes = (): jest.Mocked<Pick<Response, 'status' | 'json'>> & { status: jest.Mock; json: jest.Mock } => {
  const res = {} as any;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('ApiResponse', () => {
  describe('success', () => {
    it('responds with status 200', () => {
      const res = mockRes();
      ApiResponse.success(res as unknown as Response, { id: 1 });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('responds with success: true', () => {
      const res = mockRes();
      ApiResponse.success(res as unknown as Response, { id: 1 });
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('responds with default message "Success"', () => {
      const res = mockRes();
      ApiResponse.success(res as unknown as Response, {});
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Success' }));
    });

    it('includes the data in the response body', () => {
      const res = mockRes();
      const data = { id: 42, name: 'test' };
      ApiResponse.success(res as unknown as Response, data);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data }));
    });

    it('accepts a custom message', () => {
      const res = mockRes();
      ApiResponse.success(res as unknown as Response, {}, 'Custom message');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Custom message' }));
    });

    it('accepts a custom statusCode', () => {
      const res = mockRes();
      ApiResponse.success(res as unknown as Response, {}, 'OK', 202);
      expect(res.status).toHaveBeenCalledWith(202);
    });
  });

  describe('created', () => {
    it('responds with status 201', () => {
      const res = mockRes();
      ApiResponse.created(res as unknown as Response, { id: 1 });
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('responds with success: true', () => {
      const res = mockRes();
      ApiResponse.created(res as unknown as Response, {});
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('defaults message to "Created"', () => {
      const res = mockRes();
      ApiResponse.created(res as unknown as Response, {});
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Created' }));
    });

    it('accepts a custom message', () => {
      const res = mockRes();
      ApiResponse.created(res as unknown as Response, {}, 'User created');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'User created' }));
    });

    it('includes data in the response body', () => {
      const res = mockRes();
      const data = { id: 99 };
      ApiResponse.created(res as unknown as Response, data);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data }));
    });
  });

  describe('paginated', () => {
    it('responds with status 200', () => {
      const res = mockRes();
      ApiResponse.paginated(res as unknown as Response, [], 0, 1, 20);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('responds with success: true', () => {
      const res = mockRes();
      ApiResponse.paginated(res as unknown as Response, [], 0, 1, 20);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('includes data array in the response', () => {
      const res = mockRes();
      const data = [{ id: 1 }, { id: 2 }];
      ApiResponse.paginated(res as unknown as Response, data, 2, 1, 20);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data }));
    });

    it('includes correct pagination object', () => {
      const res = mockRes();
      ApiResponse.paginated(res as unknown as Response, [], 45, 2, 10);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          pagination: {
            total: 45,
            page: 2,
            limit: 10,
            totalPages: 5,
          },
        }),
      );
    });

    it('calculates totalPages correctly', () => {
      const res = mockRes();
      ApiResponse.paginated(res as unknown as Response, [], 101, 1, 20);
      const call = res.json.mock.calls[0][0];
      expect(call.pagination.totalPages).toBe(6); // ceil(101/20)
    });

    it('calculates totalPages correctly for exact division', () => {
      const res = mockRes();
      ApiResponse.paginated(res as unknown as Response, [], 100, 1, 20);
      const call = res.json.mock.calls[0][0];
      expect(call.pagination.totalPages).toBe(5);
    });

    it('defaults message to "Success"', () => {
      const res = mockRes();
      ApiResponse.paginated(res as unknown as Response, [], 0, 1, 20);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Success' }));
    });

    it('accepts a custom message', () => {
      const res = mockRes();
      ApiResponse.paginated(res as unknown as Response, [], 0, 1, 20, 'Items fetched');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Items fetched' }));
    });
  });

  describe('error', () => {
    it('responds with default status 400', () => {
      const res = mockRes();
      ApiResponse.error(res as unknown as Response, 'Bad request');
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('responds with success: false', () => {
      const res = mockRes();
      ApiResponse.error(res as unknown as Response, 'Something went wrong');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    it('includes message in response body', () => {
      const res = mockRes();
      ApiResponse.error(res as unknown as Response, 'Validation failed');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Validation failed' }));
    });

    it('accepts custom statusCode', () => {
      const res = mockRes();
      ApiResponse.error(res as unknown as Response, 'Not found', 404);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('does not include errors field when not provided', () => {
      const res = mockRes();
      ApiResponse.error(res as unknown as Response, 'Error');
      const body = res.json.mock.calls[0][0];
      expect(body).not.toHaveProperty('errors');
    });

    it('includes errors field when provided', () => {
      const res = mockRes();
      const errors = { email: 'Invalid email', name: 'Required' };
      ApiResponse.error(res as unknown as Response, 'Validation error', 422, errors);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Validation error',
          errors,
        }),
      );
    });

    it('uses custom statusCode with errors field', () => {
      const res = mockRes();
      ApiResponse.error(res as unknown as Response, 'Unprocessable', 422, { field: 'issue' });
      expect(res.status).toHaveBeenCalledWith(422);
    });
  });
});
