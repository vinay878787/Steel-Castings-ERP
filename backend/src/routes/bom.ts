import { Router, Response } from 'express';
import BOM from '../models/BOM';
import AuditLog from '../models/AuditLog';
import { protect, authorize, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(protect);

router.get('/', async (req, res: Response): Promise<void> => {
  const { product } = req.query;
  const filter: Record<string, unknown> = { isActive: true };
  if (product) filter.product = product;
  const boms = await BOM.find(filter)
    .populate('product', 'productName productCode unit')
    .populate('items.material', 'materialName materialCode unit')
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 });
  res.json(boms);
});

router.get('/:id', async (req, res: Response): Promise<void> => {
  const bom = await BOM.findById(req.params.id)
    .populate('product', 'productName productCode unit')
    .populate('items.material', 'materialName materialCode unit averageCost')
    .populate('createdBy', 'name');
  if (!bom) { res.status(404).json({ message: 'BOM not found' }); return; }
  res.json(bom);
});

router.post('/', authorize('admin', 'manager'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { product } = req.body;
  const latestVersion = await BOM.findOne({ product, isActive: true }).sort({ version: -1 });
  const version = latestVersion ? latestVersion.version + 1 : 1;
  const bom = await BOM.create({ ...req.body, version, createdBy: req.user!.id });
  await AuditLog.create({ action: 'create', entity: 'BOM', entityId: bom._id, user: req.user!.id, newValue: bom.toObject() });
  res.status(201).json(bom);
});

router.put('/:id', authorize('admin', 'manager'), async (req: AuthRequest, res: Response): Promise<void> => {
  const old = await BOM.findById(req.params.id);
  if (!old) { res.status(404).json({ message: 'BOM not found' }); return; }
  const updated = await BOM.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  await AuditLog.create({ action: 'update', entity: 'BOM', entityId: old._id, user: req.user!.id, oldValue: old.toObject(), newValue: updated?.toObject() });
  res.json(updated);
});

router.delete('/:id', authorize('admin', 'manager'), async (req: AuthRequest, res: Response): Promise<void> => {
  const bom = await BOM.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!bom) { res.status(404).json({ message: 'BOM not found' }); return; }
  await AuditLog.create({ action: 'delete', entity: 'BOM', entityId: bom._id, user: req.user!.id });
  res.json({ message: 'BOM deleted' });
});

router.post('/:id/clone', authorize('admin', 'manager'), async (req: AuthRequest, res: Response): Promise<void> => {
  const source = await BOM.findById(req.params.id);
  if (!source) { res.status(404).json({ message: 'BOM not found' }); return; }
  const latestVersion = await BOM.findOne({ product: source.product, isActive: true }).sort({ version: -1 });
  const version = latestVersion ? latestVersion.version + 1 : 1;
  const cloned = await BOM.create({
    product: source.product,
    version,
    outputQuantity: source.outputQuantity,
    isActive: true,
    items: source.items,
    createdBy: req.user!.id,
    notes: `Cloned from v${source.version}`,
  });
  res.status(201).json(cloned);
});

export default router;
