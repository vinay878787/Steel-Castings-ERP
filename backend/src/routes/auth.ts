import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { protect, AuthRequest } from '../middleware/auth';

const router = Router();

const signToken = (id: string): string =>
  jwt.sign({ id }, process.env.JWT_SECRET!, { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as `${number}${'s'|'m'|'h'|'d'}` });

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { name, email, password, role } = req.body;
  const exists = await User.findOne({ email });
  if (exists) { res.status(409).json({ message: 'Email already in use' }); return; }
  const user = await User.create({ name, email, password, role: role || 'operator' });
  const token = signToken(user.id);
  res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) { res.status(400).json({ message: 'Email and password required' }); return; }
  const user = await User.findOne({ email });
  if (!user || !user.isActive || !(await user.comparePassword(password))) {
    res.status(401).json({ message: 'Invalid credentials' }); return;
  }
  const token = signToken(user.id);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

router.get('/me', protect, (req: AuthRequest, res: Response): void => {
  res.json({ user: req.user });
});

export default router;
