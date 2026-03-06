import { Request, Response, NextFunction } from 'express';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { AppError } from '../utils/app-error';

/**
 * Validates request body against a DTO class using class-validator.
 * Usage: router.post('/', validateBody(CreateUserDto), controller.create)
 */
export function validateBody(DtoClass: any) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const dto = plainToInstance(DtoClass, req.body);
    const errors: ValidationError[] = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      const messages = errors.flatMap((err) =>
        Object.values(err.constraints || {})
      );
      return next(AppError.badRequest(messages.join('; ')));
    }

    req.body = dto;
    next();
  };
}
