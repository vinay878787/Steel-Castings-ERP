import { Router, Response } from 'express';
import BOMColumnConfig from '../models/BOMColumnConfig';
import { protect, authorize } from '../middleware/auth';

const router = Router();
router.use(protect);

router.get('/', async (_req, res: Response): Promise<void> => {
  const configs = await BOMColumnConfig.find().sort({ order: 1 });
  res.json(configs);
});

router.post('/', authorize('admin'), async (req, res: Response): Promise<void> => {
  const count = await BOMColumnConfig.countDocuments();
  const config = await BOMColumnConfig.create({ ...req.body, order: count });
  res.status(201).json(config);
});

router.put('/:id', authorize('admin'), async (req, res: Response): Promise<void> => {
  const config = await BOMColumnConfig.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!config) { res.status(404).json({ message: 'Config not found' }); return; }
  res.json(config);
});

router.delete('/:id', authorize('admin'), async (req, res: Response): Promise<void> => {
  await BOMColumnConfig.findByIdAndDelete(req.params.id);
  res.json({ message: 'Column config deleted' });
});

router.put('/reorder/batch', authorize('admin'), async (req, res: Response): Promise<void> => {
  const { orders }: { orders: Array<{ id: string; order: number }> } = req.body;
  await Promise.all(orders.map(({ id, order }) => BOMColumnConfig.findByIdAndUpdate(id, { order })));
  res.json({ message: 'Reordered' });
});

export default router;
