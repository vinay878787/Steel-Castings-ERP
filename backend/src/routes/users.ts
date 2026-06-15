import { Router, Response } from 'express';
import User from '../models/User';
import { protect, authorize, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(protect);

router.get('/', authorize('admin'), async (_req, res: Response): Promise<void> => {
  const users = await User.find().select('-password').sort({ createdAt: -1 });
  res.json(users);
});

router.post('/', authorize('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, email, password, role } = req.body;
  const user = await User.create({ name, email, password, role });
  res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role });
});

router.put('/:id', authorize('admin'), async (req, res: Response): Promise<void> => {
  const { name, role, isActive } = req.body;
  const user = await User.findByIdAndUpdate(req.params.id, { name, role, isActive }, { new: true }).select('-password');
  if (!user) { res.status(404).json({ message: 'User not found' }); return; }
  res.json(user);
});

router.delete('/:id', authorize('admin'), async (req, res: Response): Promise<void> => {
  await User.findByIdAndUpdate(req.params.id, { isActive: false });
  res.json({ message: 'User deactivated' });
});

export default router;
