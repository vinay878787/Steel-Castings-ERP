import { Router, Response } from 'express';
import RawMaterial from '../models/RawMaterial';
import InventoryLedger from '../models/InventoryLedger';
import AuditLog from '../models/AuditLog';
import { protect, authorize, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(protect);

router.get('/', async (req, res: Response): Promise<void> => {
  const { search, category, lowStock } = req.query;
  const filter: Record<string, unknown> = { isActive: true };
  if (search) filter.$text = { $search: search as string };
  if (category) filter.category = category;
  if (lowStock === 'true') filter.$expr = { $lte: ['$currentStock', '$minimumStock'] };
  const materials = await RawMaterial.find(filter).sort({ materialName: 1 });
  res.json(materials);
});

router.get('/categories', async (_req, res: Response): Promise<void> => {
  const categories = await RawMaterial.distinct('category', { isActive: true });
  res.json(categories);
});

router.get('/:id', async (req, res: Response): Promise<void> => {
  const m = await RawMaterial.findById(req.params.id);
  if (!m) { res.status(404).json({ message: 'Material not found' }); return; }
  res.json(m);
});

router.post('/', authorize('admin', 'manager'), async (req: AuthRequest, res: Response): Promise<void> => {
  const m = await RawMaterial.create(req.body);
  await AuditLog.create({ action: 'create', entity: 'RawMaterial', entityId: m._id, user: req.user!.id, newValue: m.toObject() });
  res.status(201).json(m);
});

router.put('/:id', authorize('admin', 'manager'), async (req: AuthRequest, res: Response): Promise<void> => {
  const old = await RawMaterial.findById(req.params.id);
  if (!old) { res.status(404).json({ message: 'Material not found' }); return; }
  const updated = await RawMaterial.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  await AuditLog.create({ action: 'update', entity: 'RawMaterial', entityId: old._id, user: req.user!.id, oldValue: old.toObject(), newValue: updated?.toObject() });
  res.json(updated);
});

router.delete('/:id', authorize('admin', 'manager'), async (req: AuthRequest, res: Response): Promise<void> => {
  const m = await RawMaterial.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!m) { res.status(404).json({ message: 'Material not found' }); return; }
  await AuditLog.create({ action: 'delete', entity: 'RawMaterial', entityId: m._id, user: req.user!.id });
  res.json({ message: 'Material deleted' });
});

router.post('/:id/stock-in', authorize('admin', 'manager'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { quantity, unitCost, notes, referenceNumber } = req.body;
  const m = await RawMaterial.findById(req.params.id);
  if (!m) { res.status(404).json({ message: 'Material not found' }); return; }
  const before = m.currentStock;
  m.currentStock = parseFloat((before + quantity).toFixed(4));
  if (unitCost) {
    const totalValue = (m.averageCost * before) + (unitCost * quantity);
    m.averageCost = parseFloat((totalValue / m.currentStock).toFixed(4));
  }
  await m.save();
  await InventoryLedger.create({ material: m._id, transactionType: 'purchase', referenceNumber: referenceNumber || `SI-${Date.now()}`, quantity, beforeQuantity: before, afterQuantity: m.currentStock, unitCost: unitCost || m.averageCost, user: req.user!.id, notes });
  res.json(m);
});

router.post('/:id/stock-out', authorize('admin', 'manager'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { quantity, notes, referenceNumber } = req.body;
  const m = await RawMaterial.findById(req.params.id);
  if (!m) { res.status(404).json({ message: 'Material not found' }); return; }
  if (m.currentStock < quantity) { res.status(400).json({ message: 'Insufficient stock' }); return; }
  const before = m.currentStock;
  m.currentStock = parseFloat((before - quantity).toFixed(4));
  await m.save();
  await InventoryLedger.create({ material: m._id, transactionType: 'adjustment', referenceNumber: referenceNumber || `SO-${Date.now()}`, quantity: -quantity, beforeQuantity: before, afterQuantity: m.currentStock, unitCost: m.averageCost, user: req.user!.id, notes });
  res.json(m);
});

router.get('/:id/ledger', async (req, res: Response): Promise<void> => {
  const ledger = await InventoryLedger.find({ material: req.params.id })
    .populate('user', 'name')
    .sort({ createdAt: -1 })
    .limit(100);
  res.json(ledger);
});

export default router;
