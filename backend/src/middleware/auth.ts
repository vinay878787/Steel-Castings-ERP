import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { UserRole } from '../models/User';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: UserRole;
    name: string;
    email: string;
  };
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Not authorized, no token' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
    const user = await User.findById(decoded.id).select('-password');
    if (!user || !user.isActive) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }
    req.user = { id: user.id, role: user.role, name: user.name, email: user.email };
    next();
  } catch {
    res.status(401).json({ message: 'Token invalid or expired' });
  }
};

export const authorize = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ message: 'Forbidden: insufficient permissions' });
      return;
    }
    next();
  };
};
