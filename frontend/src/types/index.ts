export type FieldType = 'text' | 'number' | 'currency' | 'date' | 'boolean' | 'dropdown' | 'multiselect' | 'textarea';

export const CONFIGURABLE_ENTITIES = ['rawMaterial', 'product', 'supplier', 'customer'] as const;
export type ConfigurableEntity = typeof CONFIGURABLE_ENTITIES[number];

export interface ColumnConfig {
  _id: string;
  entity: ConfigurableEntity;
  fieldName: string;
  fieldLabel: string;
  fieldType: FieldType;
  isRequired: boolean;
  isVisible: boolean;
  isEditable: boolean;
  order: number;
  options?: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'owner' | 'manager' | 'operator';
}

export interface RawMaterial {
  _id: string;
  materialCode: string;
  materialName: string;
  category: string;
  unit: string;
  currentStock: number;
  minimumStock: number;
  averageCost: number;
  storageLocation: string;
  isActive: boolean;
  customFields?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  _id: string;
  productCode: string;
  productName: string;
  description: string;
  unit: string;
  standardCost: number;
  sellingPrice: number;
  isActive: boolean;
  customFields?: Record<string, unknown>;
  createdAt: string;
}

export interface BOMColumnConfig {
  _id: string;
  fieldName: string;
  fieldLabel: string;
  fieldType: 'text' | 'number' | 'currency' | 'date' | 'boolean' | 'dropdown' | 'multiselect' | 'textarea' | 'attachment';
  isRequired: boolean;
  isVisible: boolean;
  isEditable: boolean;
  order: number;
  options?: string[];
}

export interface BOMItem {
  material: RawMaterial | string;
  quantityRequired: number;
  unit: string;
  dynamicFields: Record<string, unknown>;
}

export interface BOM {
  _id: string;
  product: Product | string;
  version: number;
  outputQuantity: number;
  isActive: boolean;
  items: BOMItem[];
  createdBy: User | string;
  notes: string;
  createdAt: string;
}

export interface ProductionOrder {
  _id: string;
  productionNumber: string;
  product: Product | string;
  bom: BOM | string;
  quantityToProduce: number;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  createdBy: User | string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface FinishedGoods {
  _id: string;
  product: Product | string;
  availableQuantity: number;
  reservedQuantity: number;
  inventoryValue: number;
  updatedAt: string;
}

export interface InventoryLedger {
  _id: string;
  material: RawMaterial | string;
  transactionType: 'purchase' | 'consumption' | 'production' | 'adjustment' | 'transfer' | 'return';
  referenceNumber: string;
  quantity: number;
  beforeQuantity: number;
  afterQuantity: number;
  unitCost: number;
  user: User | string;
  notes: string;
  createdAt: string;
}

export interface Supplier {
  _id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  isActive: boolean;
  customFields?: Record<string, unknown>;
  createdAt: string;
}

export interface Customer {
  _id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  isActive: boolean;
  customFields?: Record<string, unknown>;
  createdAt: string;
}

export interface PurchaseOrderItem {
  material: RawMaterial | string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  receivedQuantity: number;
}

export interface PurchaseOrder {
  _id: string;
  poNumber: string;
  orderNumber?: string;
  supplier: Supplier | string;
  items: PurchaseOrderItem[];
  totalAmount: number;
  status: 'pending' | 'partial' | 'received' | 'cancelled';
  expectedDelivery?: string;
  notes: string;
  createdAt: string;
}

export interface SalesOrderItem {
  product: Product | string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface SalesOrder {
  _id: string;
  orderNumber: string;
  customer: Customer | string;
  items: SalesOrderItem[];
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'in_production' | 'completed' | 'cancelled';
  dueDate?: string;
  notes: string;
  createdAt: string;
}

export interface AuditLog {
  _id: string;
  action: 'create' | 'update' | 'delete';
  entity: string;
  entityId: string;
  user: User | string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  createdAt: string;
}

export interface DashboardData {
  kpis: {
    totalInventoryValue: number;
    rawMaterialValue: number;
    finishedGoodsValue: number;
    productionToday: number;
    productionMonth: number;
    pendingOrders: number;
    lowStockCount: number;
  };
  lowStockMaterials: RawMaterial[];
  topConsumedMaterials: Array<{ _id: string; materialName: string; unit: string; totalConsumed: number }>;
  monthlyConsumption: Array<{ _id: { year: number; month: number }; totalConsumed: number; totalCost: number }>;
  monthlyProduction: Array<{ _id: { year: number; month: number }; count: number; totalQuantity: number }>;
  orderStatusDistribution: Array<{ _id: string; count: number }>;
}
