import { Router, Response } from 'express';
import RawMaterial from '../models/RawMaterial';
import FinishedGoods from '../models/FinishedGoods';
import ProductionOrder from '../models/ProductionOrder';
import SalesOrder from '../models/SalesOrder';
import InventoryLedger from '../models/InventoryLedger';
import { protect } from '../middleware/auth';

const router = Router();
router.use(protect);

router.get('/', async (_req, res: Response): Promise<void> => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    rawMaterials,
    finishedGoods,
    productionToday,
    productionMonth,
    pendingOrders,
    lowStockMaterials,
    monthlyConsumption,
    monthlyProduction,
    orderStatusDist,
  ] = await Promise.all([
    RawMaterial.find({ isActive: true }),
    FinishedGoods.find(),
    ProductionOrder.countDocuments({ status: { $in: ['planned', 'in_progress', 'completed'] }, updatedAt: { $gte: startOfDay } }),
    ProductionOrder.countDocuments({ status: 'completed', completedAt: { $gte: startOfMonth } }),
    SalesOrder.countDocuments({ status: 'pending' }),
    RawMaterial.find({ isActive: true, $expr: { $lte: ['$currentStock', '$minimumStock'] } }).limit(10),
    InventoryLedger.aggregate([
      { $match: { transactionType: 'consumption', createdAt: { $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) } } },
      { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, totalConsumed: { $sum: { $abs: '$quantity' } }, totalCost: { $sum: { $multiply: [{ $abs: '$quantity' }, '$unitCost'] } } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
    ProductionOrder.aggregate([
      { $match: { status: 'completed', completedAt: { $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) } } },
      { $group: { _id: { year: { $year: '$completedAt' }, month: { $month: '$completedAt' } }, count: { $sum: 1 }, totalQuantity: { $sum: '$quantityToProduce' } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
    ProductionOrder.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);

  const rawMaterialValue = rawMaterials.reduce((s, m) => s + m.currentStock * m.averageCost, 0);
  const finishedGoodsValue = finishedGoods.reduce((s, fg) => s + fg.inventoryValue, 0);

  const topConsumedRaw = await InventoryLedger.aggregate([
    { $match: { transactionType: 'consumption' } },
    { $group: { _id: '$material', totalConsumed: { $sum: { $abs: '$quantity' } } } },
    { $sort: { totalConsumed: -1 } },
    { $limit: 5 },
    { $lookup: { from: 'rawmaterials', localField: '_id', foreignField: '_id', as: 'material' } },
    { $unwind: '$material' },
    { $project: { materialName: '$material.materialName', unit: '$material.unit', totalConsumed: 1 } },
  ]);

  res.json({
    kpis: {
      totalInventoryValue: rawMaterialValue + finishedGoodsValue,
      rawMaterialValue,
      finishedGoodsValue,
      productionToday,
      productionMonth,
      pendingOrders,
      lowStockCount: lowStockMaterials.length,
    },
    lowStockMaterials,
    topConsumedMaterials: topConsumedRaw,
    monthlyConsumption,
    monthlyProduction,
    orderStatusDistribution: orderStatusDist,
  });
});

export default router;
