import mongoose from 'mongoose';
import BOM from '../models/BOM';
import RawMaterial from '../models/RawMaterial';
import InventoryLedger from '../models/InventoryLedger';
import FinishedGoods from '../models/FinishedGoods';
import AuditLog from '../models/AuditLog';
import Product from '../models/Product';
import { IProductionOrder } from '../models/ProductionOrder';

export interface ConsumptionResult {
  success: boolean;
  consumed: Array<{ materialName: string; quantity: number; unit: string }>;
  insufficientMaterials: Array<{ materialName: string; required: number; available: number }>;
}

export const runConsumptionEngine = async (
  productionOrder: IProductionOrder,
  userId: string
): Promise<ConsumptionResult> => {
  const bom = await BOM.findById(productionOrder.bom).populate('items.material');
  if (!bom) throw new Error('BOM not found for production order');

  const multiplier = productionOrder.quantityToProduce / bom.outputQuantity;

  const insufficientMaterials: ConsumptionResult['insufficientMaterials'] = [];
  const consumed: ConsumptionResult['consumed'] = [];

  for (const item of bom.items) {
    const material = await RawMaterial.findById(item.material);
    if (!material) continue;
    const required = item.quantityRequired * multiplier;
    if (material.currentStock < required) {
      insufficientMaterials.push({
        materialName: material.materialName,
        required,
        available: material.currentStock,
      });
    }
  }

  if (insufficientMaterials.length > 0) {
    return { success: false, consumed: [], insufficientMaterials };
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    for (const item of bom.items) {
      const material = await RawMaterial.findById(item.material).session(session);
      if (!material) continue;
      const required = item.quantityRequired * multiplier;
      const before = material.currentStock;
      material.currentStock = parseFloat((before - required).toFixed(4));
      await material.save({ session });

      await InventoryLedger.create(
        [
          {
            material: material._id,
            transactionType: 'consumption',
            referenceNumber: productionOrder.productionNumber,
            quantity: -required,
            beforeQuantity: before,
            afterQuantity: material.currentStock,
            unitCost: material.averageCost,
            user: userId,
            notes: `Auto-consumed for production order ${productionOrder.productionNumber}`,
            productionOrder: productionOrder._id,
          },
        ],
        { session }
      );

      consumed.push({ materialName: material.materialName, quantity: required, unit: item.unit });
    }

    const product = await Product.findById(productionOrder.product);
    const unitCost = product?.standardCost ?? 0;
    const totalValue = unitCost * productionOrder.quantityToProduce;

    const existing = await FinishedGoods.findOne({ product: productionOrder.product }).session(session);
    if (existing) {
      existing.availableQuantity += productionOrder.quantityToProduce;
      existing.inventoryValue += totalValue;
      existing.lastProductionOrder = productionOrder._id as mongoose.Types.ObjectId;
      await existing.save({ session });
    } else {
      await FinishedGoods.create(
        [
          {
            product: productionOrder.product,
            availableQuantity: productionOrder.quantityToProduce,
            reservedQuantity: 0,
            inventoryValue: totalValue,
            lastProductionOrder: productionOrder._id,
          },
        ],
        { session }
      );
    }

    await AuditLog.create(
      [
        {
          action: 'update',
          entity: 'ProductionOrder',
          entityId: productionOrder._id,
          user: userId,
          newValue: { status: 'completed', quantityProduced: productionOrder.quantityToProduce },
        },
      ],
      { session }
    );

    await session.commitTransaction();
    return { success: true, consumed, insufficientMaterials: [] };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};
