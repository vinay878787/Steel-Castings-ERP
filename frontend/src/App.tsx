import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import RawMaterials from './pages/RawMaterials';
import Products from './pages/Products';
import BOMPage from './pages/BOM';
import BOMConfig from './pages/BOMConfig';
import FieldConfig from './pages/FieldConfig';
import ProductionOrders from './pages/ProductionOrders';
import FinishedGoods from './pages/FinishedGoods';
import InventoryLedger from './pages/InventoryLedger';
import PurchaseOrders from './pages/PurchaseOrders';
import SalesOrders from './pages/SalesOrders';
import Suppliers from './pages/Suppliers';
import Customers from './pages/Customers';
import Reports from './pages/Reports';
import AuditLogs from './pages/AuditLogs';
import Users from './pages/Users';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="raw-materials" element={<RawMaterials />} />
          <Route path="products" element={<Products />} />
          <Route path="bom" element={<BOMPage />} />
          <Route path="bom-config" element={<ProtectedRoute roles={['admin']}><BOMConfig /></ProtectedRoute>} />
          <Route path="field-config" element={<ProtectedRoute roles={['admin']}><FieldConfig /></ProtectedRoute>} />
          <Route path="production-orders" element={<ProductionOrders />} />
          <Route path="finished-goods" element={<FinishedGoods />} />
          <Route path="inventory-ledger" element={<InventoryLedger />} />
          <Route path="purchase-orders" element={<PurchaseOrders />} />
          <Route path="sales-orders" element={<SalesOrders />} />
          <Route path="suppliers" element={<Suppliers />} />
          <Route path="customers" element={<Customers />} />
          <Route path="reports" element={<Reports />} />
          <Route path="audit-logs" element={<ProtectedRoute roles={['admin']}><AuditLogs /></ProtectedRoute>} />
          <Route path="users" element={<ProtectedRoute roles={['admin']}><Users /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
