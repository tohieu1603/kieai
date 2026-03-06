import { Request } from 'express';

/**
 * Safely extract a single string param from Express v5 params.
 * Express v5 types params as string | string[].
 */
export function getParam(req: Request, name: string): string {
  const val = req.params[name];
  return Array.isArray(val) ? val[0] : val;
}
