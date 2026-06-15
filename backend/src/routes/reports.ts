import { Router, Response } from 'express';
import RawMaterial from '../models/RawMaterial';
import FinishedGoods from '../models/FinishedGoods';
import InventoryLedger from '../models/InventoryLedger';
import ProductionOrder from '../models/ProductionOrder';
import PurchaseOrder from '../models/PurchaseOrder';
import SalesOrder from '../models/SalesOrder';
import BOM from '../models/BOM';
import { protect } from '../middleware/auth';

const router = Router();
router.use(protect);

router.get('/inventory', async (_req, res: Response): Promise<void> => {
  const materials = await RawMaterial.find({ isActive: true });
  const totalValue = materials.reduce((sum, m) => sum + m.currentStock * m.averageCost, 0);
  const lowStock = materials.filter((m) => m.currentStock <= m.minimumStock);
  res.json({ materials, totalValue, lowStockCount: lowStock.length });
});

router.get('/production', async (req, res: Response): Promise<void> => {
  const { from, to } = req.query;
  const filter: Record<string, unknown> = {};
  if (from || to) {
    const df: Record<string, Date> = {};
    if (from) df.$gte = new Date(from as string);
    if (to) df.$lte = new Date(to as string);
    filter.createdAt = df;
  }
  const orders = await ProductionOrder.find(filter)
    .populate('product', 'productName')
    .sort({ createdAt: -1 });
  const summary = {
    total: orders.length,
    completed: orders.filter((o) => o.status === 'completed').length,
    inProgress: orders.filter((o) => o.status === 'in_progress').length,
    planned: orders.filter((o) => o.status === 'planned').length,
    cancelled: orders.filter((o) => o.status === 'cancelled').length,
  };
  res.json({ orders, summary });
});

router.get('/consumption', async (req, res: Response): Promise<void> => {
  const { from, to } = req.query;
  const filter: Record<string, unknown> = { transactionType: 'consumption' };
  if (from || to) {
    const df: Record<string, Date> = {};
    if (from) df.$gte = new Date(from as string);
    if (to) df.$lte = new Date(to as string);
    filter.createdAt = df;
  }
  const records = await InventoryLedger.find(filter)
    .populate('material', 'materialName unit')
    .sort({ createdAt: -1 });

  const byMaterial: Record<string, { materialName: string; unit: string; totalConsumed: number; totalCost: number }> = {};
  for (const r of records) {
    const mat = r.material as unknown as { _id: string; materialName: string; unit: string };
    const key = mat._id.toString();
    if (!byMaterial[key]) byMaterial[key] = { materialName: mat.materialName, unit: mat.unit, totalConsumed: 0, totalCost: 0 };
    byMaterial[key].totalConsumed += Math.abs(r.quantity);
    byMaterial[key].totalCost += Math.abs(r.quantity) * r.unitCost;
  }
  res.json({ records, byMaterial: Object.values(byMaterial) });
});

router.get('/stock-valuation', async (_req, res: Response): Promise<void> => {
  const materials = await RawMaterial.find({ isActive: true });
  const finishedGoods = await FinishedGoods.find().populate('product', 'productName productCode');
  const rawValue = materials.reduce((s, m) => s + m.currentStock * m.averageCost, 0);
  const fgValue = finishedGoods.reduce((s, fg) => s + fg.inventoryValue, 0);
  res.json({ materials, finishedGoods, rawMaterialValue: rawValue, finishedGoodsValue: fgValue, totalValue: rawValue + fgValue });
});

router.get('/bom-cost', async (_req, res: Response): Promise<void> => {
  const boms = await BOM.find({ isActive: true })
    .populate('product', 'productName productCode')
    .populate('items.material', 'materialName averageCost unit');

  const result = boms.map((bom) => {
    const totalCost = bom.items.reduce((sum, item) => {
      const mat = item.material as unknown as { averageCost: number };
      return sum + item.quantityRequired * (mat?.averageCost || 0);
    }, 0);
    return { bom, totalCost, costPerUnit: bom.outputQuantity > 0 ? totalCost / bom.outputQuantity : 0 };
  });
  res.json(result);
});

router.get('/purchase', async (req, res: Response): Promise<void> => {
  const { from, to } = req.query;
  const filter: Record<string, unknown> = {};
  if (from || to) {
    const df: Record<string, Date> = {};
    if (from) df.$gte = new Date(from as string);
    if (to) df.$lte = new Date(to as string);
    filter.createdAt = df;
  }
  const orders = await PurchaseOrder.find(filter)
    .populate('supplier', 'name')
    .sort({ createdAt: -1 });
  const totalSpend = orders.reduce((s, o) => s + o.totalAmount, 0);
  res.json({ orders, totalSpend });
});

router.get('/sales', async (req, res: Response): Promise<void> => {
  const { from, to } = req.query;
  const filter: Record<string, unknown> = {};
  if (from || to) {
    const df: Record<string, Date> = {};
    if (from) df.$gte = new Date(from as string);
    if (to) df.$lte = new Date(to as string);
    filter.createdAt = df;
  }
  const orders = await SalesOrder.find(filter)
    .populate('customer', 'name')
    .sort({ createdAt: -1 });
  const totalRevenue = orders.filter((o) => o.status === 'completed').reduce((s, o) => s + o.totalAmount, 0);
  res.json({ orders, totalRevenue });
});

export default router;
