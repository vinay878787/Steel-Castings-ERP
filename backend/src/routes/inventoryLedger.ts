import { Router, Response } from 'express';
import InventoryLedger from '../models/InventoryLedger';
import { protect } from '../middleware/auth';

const router = Router();
router.use(protect);

router.get('/', async (req, res: Response): Promise<void> => {
  const { transactionType, material, from, to, page = '1', limit = '50' } = req.query;
  const filter: Record<string, unknown> = {};
  if (transactionType) filter.transactionType = transactionType;
  if (material) filter.material = material;
  if (from || to) {
    const dateFilter: Record<string, Date> = {};
    if (from) dateFilter.$gte = new Date(from as string);
    if (to) dateFilter.$lte = new Date(to as string);
    filter.createdAt = dateFilter;
  }
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  const [records, total] = await Promise.all([
    InventoryLedger.find(filter)
      .populate('material', 'materialName materialCode unit')
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit as string)),
    InventoryLedger.countDocuments(filter),
  ]);
  res.json({ records, total, page: parseInt(page as string), totalPages: Math.ceil(total / parseInt(limit as string)) });
});

export default router;
