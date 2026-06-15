import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/database';
import { errorHandler, notFound } from './middleware/errorHandler';

import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import rawMaterialRoutes from './routes/rawMaterials';
import productRoutes from './routes/products';
import columnConfigRoutes from './routes/columnConfig';
import bomConfigRoutes from './routes/bomConfig';
import bomRoutes from './routes/bom';
import productionOrderRoutes from './routes/productionOrders';
import finishedGoodsRoutes from './routes/finishedGoods';
import inventoryLedgerRoutes from './routes/inventoryLedger';
import supplierRoutes from './routes/suppliers';
import purchaseOrderRoutes from './routes/purchaseOrders';
import customerRoutes from './routes/customers';
import salesOrderRoutes from './routes/salesOrders';
import auditLogRoutes from './routes/auditLogs';
import reportRoutes from './routes/reports';
import dashboardRoutes from './routes/dashboard';

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/raw-materials', rawMaterialRoutes);
app.use('/api/products', productRoutes);
app.use('/api/column-config', columnConfigRoutes);
app.use('/api/bom-config', bomConfigRoutes);
app.use('/api/bom', bomRoutes);
app.use('/api/production-orders', productionOrderRoutes);
app.use('/api/finished-goods', finishedGoodsRoutes);
app.use('/api/inventory-ledger', inventoryLedgerRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/sales-orders', salesOrderRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = parseInt(process.env.PORT || '5000');

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection (request kept open — fix the route):', err);
});

const start = async (): Promise<void> => {
  await connectDB();
  app.listen(PORT, () => console.log(`FoundryERP server running on port ${PORT}`));
};

start().catch(console.error);
