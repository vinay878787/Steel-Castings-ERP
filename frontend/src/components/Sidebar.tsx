import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Package, FlaskConical, ListOrdered, Factory,
  ShoppingCart, Users, BarChart3, ClipboardList, Settings, SlidersHorizontal,
  Boxes, FileText, Truck, UserCheck, ScrollText,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'owner', 'manager', 'operator'] },
  { to: '/raw-materials', label: 'Raw Materials', icon: FlaskConical, roles: ['admin', 'owner', 'manager'] },
  { to: '/products', label: 'Products', icon: Package, roles: ['admin', 'owner', 'manager'] },
  { to: '/bom', label: 'Bill of Materials', icon: ListOrdered, roles: ['admin', 'owner', 'manager'] },
  { to: '/production-orders', label: 'Production Orders', icon: Factory, roles: ['admin', 'owner', 'manager', 'operator'] },
  { to: '/finished-goods', label: 'Finished Goods', icon: Boxes, roles: ['admin', 'owner', 'manager'] },
  { to: '/inventory-ledger', label: 'Inventory Ledger', icon: ScrollText, roles: ['admin', 'owner', 'manager'] },
  { to: '/purchase-orders', label: 'Purchases', icon: ShoppingCart, roles: ['admin', 'manager'] },
  { to: '/sales-orders', label: 'Sales Orders', icon: FileText, roles: ['admin', 'owner', 'manager'] },
  { to: '/suppliers', label: 'Suppliers', icon: Truck, roles: ['admin', 'manager'] },
  { to: '/customers', label: 'Customers', icon: UserCheck, roles: ['admin', 'manager'] },
  { to: '/reports', label: 'Reports', icon: BarChart3, roles: ['admin', 'owner', 'manager'] },
  { to: '/audit-logs', label: 'Audit Logs', icon: ClipboardList, roles: ['admin'] },
  { to: '/users', label: 'Users', icon: Users, roles: ['admin'] },
  { to: '/bom-config', label: 'BOM Config', icon: Settings, roles: ['admin'] },
  { to: '/field-config', label: 'Field Config', icon: SlidersHorizontal, roles: ['admin'] },
];

export default function Sidebar() {
  const { user } = useAuthStore();
  const role = user?.role ?? 'operator';

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col h-screen sticky top-0">
      <div className="px-6 py-5 border-b border-gray-700">
        <h1 className="text-xl font-bold text-white">FoundryERP</h1>
        <p className="text-xs text-gray-400 mt-0.5">Manufacturing ERP</p>
      </div>
      <nav className="flex-1 overflow-y-auto py-3">
        {navItems
          .filter((item) => item.roles.includes(role))
          .map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
      </nav>
      <div className="px-5 py-4 border-t border-gray-700 text-xs text-gray-400">
        <p className="font-medium text-gray-300">{user?.name}</p>
        <p className="capitalize">{user?.role}</p>
      </div>
    </aside>
  );
}
