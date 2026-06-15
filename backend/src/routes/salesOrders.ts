import { Router, Response } from 'express';
import SalesOrder from '../models/SalesOrder';
import { protect, authorize, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(protect);

const generateSONumber = async (): Promise<string> => {
  const count = await SalesOrder.countDocuments();
  return `SO-${String(count + 1).padStart(5, '0')}`;
};

router.get('/', async (req, res: Response): Promise<void> => {
  const { status } = req.query;
  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  const orders = await SalesOrder.find(filter)
    .populate('customer', 'name')
    .populate('items.product', 'productName')
    .sort({ createdAt: -1 });
  res.json(orders);
});

router.get('/:id', async (req, res: Response): Promise<void> => {
  const order = await SalesOrder.findById(req.params.id)
    .populate('customer', 'name contactPerson email phone')
    .populate('items.product', 'productName productCode unit')
    .populate('createdBy', 'name');
  if (!order) { res.status(404).json({ message: 'Order not found' }); return; }
  res.json(order);
});

router.post('/', authorize('admin', 'manager'), async (req: AuthRequest, res: Response): Promise<void> => {
  const soNumber = await generateSONumber();
  const totalAmount = req.body.items?.reduce((s: number, i: { totalPrice: number }) => s + i.totalPrice, 0) ?? 0;
  const order = await SalesOrder.create({ ...req.body, soNumber, totalAmount, createdBy: req.user!.id });
  res.status(201).json(order);
});

router.put('/:id', authorize('admin', 'manager'), async (req, res: Response): Promise<void> => {
  const order = await SalesOrder.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!order) { res.status(404).json({ message: 'Order not found' }); return; }
  res.json(order);
});

router.patch('/:id/status', authorize('admin', 'manager'), async (req, res: Response): Promise<void> => {
  const { status } = req.body;
  const order = await SalesOrder.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!order) { res.status(404).json({ message: 'Order not found' }); return; }
  res.json(order);
});

export default router;
