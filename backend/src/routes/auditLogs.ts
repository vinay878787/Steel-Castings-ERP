import { Router, Response } from 'express';
import AuditLog from '../models/AuditLog';
import { protect, authorize } from '../middleware/auth';

const router = Router();
router.use(protect, authorize('admin', 'owner'));

router.get('/', async (req, res: Response): Promise<void> => {
  const { entity, action, page = '1', limit = '50' } = req.query;
  const filter: Record<string, unknown> = {};
  if (entity) filter.entity = entity;
  if (action) filter.action = action;
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit as string)),
    AuditLog.countDocuments(filter),
  ]);
  res.json({ logs, total, page: parseInt(page as string), totalPages: Math.ceil(total / parseInt(limit as string)) });
});

export default router;
