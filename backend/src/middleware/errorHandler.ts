import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: Error & { status?: number; code?: number }, _req: Request, res: Response, _next: NextFunction): void => {
  console.error(err.stack);

  if (err.code === 11000) {
    res.status(409).json({ message: 'Duplicate key: record already exists' });
    return;
  }

  const status = err.status ?? 500;
  res.status(status).json({ message: err.message || 'Internal server error' });
};

export const notFound = (_req: Request, res: Response): void => {
  res.status(404).json({ message: 'Route not found' });
};
