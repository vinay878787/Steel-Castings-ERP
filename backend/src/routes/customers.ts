import { Router, Response } from 'express';
import Customer from '../models/Customer';
import { protect, authorize } from '../middleware/auth';

const router = Router();
router.use(protect);

router.get('/', async (_req, res: Response): Promise<void> => {
  const customers = await Customer.find({ isActive: true }).sort({ name: 1 });
  res.json(customers);
});

router.post('/', authorize('admin', 'manager'), async (req, res: Response): Promise<void> => {
  const c = await Customer.create(req.body);
  res.status(201).json(c);
});

router.put('/:id', authorize('admin', 'manager'), async (req, res: Response): Promise<void> => {
  const c = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!c) { res.status(404).json({ message: 'Customer not found' }); return; }
  res.json(c);
});

router.delete('/:id', authorize('admin', 'manager'), async (req, res: Response): Promise<void> => {
  await Customer.findByIdAndUpdate(req.params.id, { isActive: false });
  res.json({ message: 'Customer deleted' });
});

export default router;
