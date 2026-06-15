import { Router, Response } from 'express';
import Product from '../models/Product';
import AuditLog from '../models/AuditLog';
import { protect, authorize, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(protect);

router.get('/', async (req, res: Response): Promise<void> => {
  const { search } = req.query;
  const filter: Record<string, unknown> = { isActive: true };
  if (search) filter.$text = { $search: search as string };
  const products = await Product.find(filter).sort({ productName: 1 });
  res.json(products);
});

router.get('/:id', async (req, res: Response): Promise<void> => {
  const p = await Product.findById(req.params.id);
  if (!p) { res.status(404).json({ message: 'Product not found' }); return; }
  res.json(p);
});

router.post('/', authorize('admin', 'manager'), async (req: AuthRequest, res: Response): Promise<void> => {
  const p = await Product.create(req.body);
  await AuditLog.create({ action: 'create', entity: 'Product', entityId: p._id, user: req.user!.id, newValue: p.toObject() });
  res.status(201).json(p);
});

router.put('/:id', authorize('admin', 'manager'), async (req: AuthRequest, res: Response): Promise<void> => {
  const old = await Product.findById(req.params.id);
  if (!old) { res.status(404).json({ message: 'Product not found' }); return; }
  const updated = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  await AuditLog.create({ action: 'update', entity: 'Product', entityId: old._id, user: req.user!.id, oldValue: old.toObject(), newValue: updated?.toObject() });
  res.json(updated);
});

router.delete('/:id', authorize('admin', 'manager'), async (req: AuthRequest, res: Response): Promise<void> => {
  const p = await Product.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!p) { res.status(404).json({ message: 'Product not found' }); return; }
  await AuditLog.create({ action: 'delete', entity: 'Product', entityId: p._id, user: req.user!.id });
  res.json({ message: 'Product deleted' });
});

export default router;
