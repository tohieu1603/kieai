import { AppDataSource } from '../config/database.config';
import { Invoice } from '../entities/invoice.entity';
import { AppError } from '../utils/app-error';

export class InvoiceService {
  private get invoiceRepo() {
    return AppDataSource.getRepository(Invoice);
  }

  /**
   * Get paginated invoices for a user (IDOR safe — userId scoped).
   */
  async getUserInvoices(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [data, total] = await this.invoiceRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });
    return { data, total, page, limit };
  }

  /**
   * Get a single invoice by ID, verifying ownership (IDOR safe).
   */
  async getInvoiceById(invoiceId: string, userId: string): Promise<Invoice> {
    const invoice = await this.invoiceRepo.findOne({
      where: { id: invoiceId, userId },
    });
    if (!invoice) throw AppError.notFound('Invoice not found');
    return invoice;
  }

  /**
   * Get a single invoice by invoice number, verifying ownership (IDOR safe).
   */
  async getInvoiceByNumber(invoiceNumber: string, userId: string): Promise<Invoice> {
    const invoice = await this.invoiceRepo.findOne({
      where: { invoiceNumber, userId },
    });
    if (!invoice) throw AppError.notFound('Invoice not found');
    return invoice;
  }
}

export const invoiceService = new InvoiceService();
