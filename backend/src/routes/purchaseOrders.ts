import { Router, Response } from 'express';
import PurchaseOrder from '../models/PurchaseOrder';
import RawMaterial from '../models/RawMaterial';
import InventoryLedger from '../models/InventoryLedger';
import { protect, authorize, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(protect);

const generatePONumber = async (): Promise<string> => {
  const count = await PurchaseOrder.countDocuments();
  return `PUR-${String(count + 1).padStart(5, '0')}`;
};

router.get('/', async (req, res: Response): Promise<void> => {
  const { status } = req.query;
  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  const orders = await PurchaseOrder.find(filter)
    .populate('supplier', 'name')
    .populate('items.material', 'materialName unit')
    .sort({ createdAt: -1 });
  res.json(orders);
});

router.get('/:id', async (req, res: Response): Promise<void> => {
  const order = await PurchaseOrder.findById(req.params.id)
    .populate('supplier', 'name contactPerson email phone')
    .populate('items.material', 'materialName materialCode unit')
    .populate('createdBy', 'name');
  if (!order) { res.status(404).json({ message: 'Order not found' }); return; }
  res.json(order);
});

router.post('/', authorize('admin', 'manager'), async (req: AuthRequest, res: Response): Promise<void> => {
  const poNumber = await generatePONumber();
  const totalAmount = req.body.items?.reduce((s: number, i: { totalPrice: number }) => s + i.totalPrice, 0) ?? 0;
  const order = await PurchaseOrder.create({ ...req.body, poNumber, totalAmount, createdBy: req.user!.id });
  res.status(201).json(order);
});

router.patch('/:id/receive', authorize('admin', 'manager'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { receivedItems }: { receivedItems: Array<{ materialId: string; receivedQuantity: number; unitCost: number }> } = req.body;
  const order = await PurchaseOrder.findById(req.params.id);
  if (!order) { res.status(404).json({ message: 'Order not found' }); return; }
  if (order.status === 'received') { res.status(400).json({ message: 'Order already received' }); return; }

  for (const received of receivedItems) {
    const item = order.items.find((i) => i.material.toString() === received.materialId);
    if (!item) continue;
    item.receivedQuantity = (item.receivedQuantity || 0) + received.receivedQuantity;

    const material = await RawMaterial.findById(received.materialId);
    if (!material) continue;
    const before = material.currentStock;
    material.currentStock = parseFloat((before + received.receivedQuantity).toFixed(4));
    const totalValue = (material.averageCost * before) + (received.unitCost * received.receivedQuantity);
    material.averageCost = parseFloat((totalValue / material.currentStock).toFixed(4));
    await material.save();

    await InventoryLedger.create({
      material: material._id, transactionType: 'purchase', referenceNumber: order.poNumber,
      quantity: received.receivedQuantity, beforeQuantity: before, afterQuantity: material.currentStock,
      unitCost: received.unitCost, user: req.user!.id, notes: `Received against ${order.poNumber}`, purchaseOrder: order._id,
    });
  }

  const allReceived = order.items.every((i) => i.receivedQuantity >= i.quantity);
  order.status = allReceived ? 'received' : 'partial';
  if (allReceived) order.receivedDate = new Date();
  await order.save();
  res.json(order);
});

router.patch('/:id/cancel', authorize('admin', 'manager'), async (req, res: Response): Promise<void> => {
  const order = await PurchaseOrder.findByIdAndUpdate(req.params.id, { status: 'cancelled' }, { new: true });
  if (!order) { res.status(404).json({ message: 'Order not found' }); return; }
  res.json(order);
});

export default router;
