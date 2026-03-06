import { Request, Response } from 'express';
import { invoiceService } from '../services/invoice.service';
import { ApiResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { AppError } from '../utils/app-error';
import { parsePagination } from '../utils/pagination';

export class InvoiceController {
  /** GET /api/invoices — List user's invoices (auth required, paginated) */
  list = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const { page, limit } = parsePagination(req);
    const result = await invoiceService.getUserInvoices(req.user.id, page, limit);
    return ApiResponse.paginated(res, result.data, result.total, result.page, result.limit);
  });

  /** GET /api/invoices/:id — Get invoice by ID (auth required) */
  getById = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const invoice = await invoiceService.getInvoiceById(id, req.user.id);
    return ApiResponse.success(res, invoice);
  });
}

export const invoiceController = new InvoiceController();
