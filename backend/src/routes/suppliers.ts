import { Router, Response } from 'express';
import Supplier from '../models/Supplier';
import { protect, authorize } from '../middleware/auth';

const router = Router();
router.use(protect);

router.get('/', async (_req, res: Response): Promise<void> => {
  const suppliers = await Supplier.find({ isActive: true }).sort({ name: 1 });
  res.json(suppliers);
});

router.post('/', authorize('admin', 'manager'), async (req, res: Response): Promise<void> => {
  const s = await Supplier.create(req.body);
  res.status(201).json(s);
});

router.put('/:id', authorize('admin', 'manager'), async (req, res: Response): Promise<void> => {
  const s = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!s) { res.status(404).json({ message: 'Supplier not found' }); return; }
  res.json(s);
});

router.delete('/:id', authorize('admin', 'manager'), async (req, res: Response): Promise<void> => {
  await Supplier.findByIdAndUpdate(req.params.id, { isActive: false });
  res.json({ message: 'Supplier deleted' });
});

export default router;
