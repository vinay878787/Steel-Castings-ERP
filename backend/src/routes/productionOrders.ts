import { Router, Response } from 'express';
import ProductionOrder from '../models/ProductionOrder';
import BOM from '../models/BOM';
import AuditLog from '../models/AuditLog';
import { protect, authorize, AuthRequest } from '../middleware/auth';
import { runConsumptionEngine } from '../services/consumptionEngine';

const router = Router();
router.use(protect);

const generateProductionNumber = async (): Promise<string> => {
  const count = await ProductionOrder.countDocuments();
  return `PO-${String(count + 1).padStart(5, '0')}`;
};

router.get('/', async (req, res: Response): Promise<void> => {
  const { status } = req.query;
  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  const orders = await ProductionOrder.find(filter)
    .populate('product', 'productName productCode')
    .populate('bom', 'version outputQuantity')
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 });
  res.json(orders);
});

router.get('/:id', async (req, res: Response): Promise<void> => {
  const order = await ProductionOrder.findById(req.params.id)
    .populate('product', 'productName productCode unit')
    .populate({ path: 'bom', populate: { path: 'items.material', select: 'materialName unit' } })
    .populate('createdBy', 'name');
  if (!order) { res.status(404).json({ message: 'Production order not found' }); return; }
  res.json(order);
});

router.post('/', authorize('admin', 'manager'), async (req: AuthRequest, res: Response): Promise<void> => {
  const bom = await BOM.findById(req.body.bom);
  if (!bom) { res.status(404).json({ message: 'BOM not found' }); return; }
  const productionNumber = await generateProductionNumber();
  const order = await ProductionOrder.create({
    ...req.body,
    bomVersion: bom.version,
    productionNumber,
    createdBy: req.user!.id,
  });
  await AuditLog.create({ action: 'create', entity: 'ProductionOrder', entityId: order._id, user: req.user!.id, newValue: order.toObject() });
  res.status(201).json(order);
});

router.patch('/:id/start', authorize('admin', 'manager', 'operator'), async (req: AuthRequest, res: Response): Promise<void> => {
  const order = await ProductionOrder.findById(req.params.id);
  if (!order) { res.status(404).json({ message: 'Order not found' }); return; }
  if (order.status !== 'planned') { res.status(400).json({ message: 'Only planned orders can be started' }); return; }
  order.status = 'in_progress';
  order.startedAt = new Date();
  await order.save();
  res.json(order);
});

router.patch('/:id/pause', authorize('admin', 'manager', 'operator'), async (req: AuthRequest, res: Response): Promise<void> => {
  const order = await ProductionOrder.findById(req.params.id);
  if (!order) { res.status(404).json({ message: 'Order not found' }); return; }
  if (order.status !== 'in_progress') { res.status(400).json({ message: 'Only in-progress orders can be paused' }); return; }
  order.status = 'planned';
  await order.save();
  res.json(order);
});

router.patch('/:id/complete', authorize('admin', 'manager', 'operator'), async (req: AuthRequest, res: Response): Promise<void> => {
  const order = await ProductionOrder.findById(req.params.id);
  if (!order) { res.status(404).json({ message: 'Order not found' }); return; }
  if (!['planned', 'in_progress'].includes(order.status)) {
    res.status(400).json({ message: 'Order cannot be completed in its current state' }); return;
  }

  const result = await runConsumptionEngine(order, req.user!.id);
  if (!result.success) {
    res.status(422).json({ message: 'Insufficient raw materials', insufficientMaterials: result.insufficientMaterials });
    return;
  }

  order.status = 'completed';
  order.completedAt = new Date();
  if (!order.startedAt) order.startedAt = new Date();
  await order.save();
  res.json({ order, consumed: result.consumed });
});

router.patch('/:id/cancel', authorize('admin', 'manager'), async (req: AuthRequest, res: Response): Promise<void> => {
  const order = await ProductionOrder.findById(req.params.id);
  if (!order) { res.status(404).json({ message: 'Order not found' }); return; }
  if (order.status === 'completed') { res.status(400).json({ message: 'Completed orders cannot be cancelled' }); return; }
  order.status = 'cancelled';
  await order.save();
  res.json(order);
});

export default router;
