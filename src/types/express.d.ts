import { UserRole } from '../enums';

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      role: UserRole;
    }
    interface Request {
      apiKeyId?: string;
    }
  }
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: Express.User;
    apiKeyId?: string;
  }
}
