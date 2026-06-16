import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const features = [
  {
    icon: '🏗️',
    title: 'Production Orders',
    desc: 'Track and manage casting production from melt to dispatch with full lifecycle visibility.',
  },
  {
    icon: '📦',
    title: 'Inventory Control',
    desc: 'Real-time raw material and finished goods ledger with automatic consumption tracking.',
  },
  {
    icon: '🔩',
    title: 'Bill of Materials',
    desc: 'Configure dynamic BOM templates per product with configurable columns and alloy specs.',
  },
  {
    icon: '📊',
    title: 'Reports & Audit',
    desc: 'Sales, purchase, and production reports with complete audit trail for every action.',
  },
  {
    icon: '🛒',
    title: 'Purchase & Sales',
    desc: 'End-to-end order management for suppliers and customers with status tracking.',
  },
  {
    icon: '👥',
    title: 'Role-Based Access',
    desc: 'Admin, Owner, Manager, and Operator roles with granular permission control.',
  },
];

export default function Home() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true });
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold tracking-tight">Foundry<span className="text-blue-400">ERP</span></span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/login?tab=login"
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            Sign In
          </Link>
          <Link
            to="/login?tab=register"
            className="px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-900/40 border border-blue-700/40 rounded-full px-4 py-1.5 text-sm text-blue-300 mb-6">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          Built for Steel Foundries
        </div>

        <h1 className="text-5xl sm:text-6xl font-extrabold leading-tight mb-6 tracking-tight">
          Manufacturing ERP<br />
          <span className="text-blue-400">Built for Steel Castings</span>
        </h1>

        <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10">
          Manage your entire foundry operation — from raw material procurement and BOM configuration
          to production scheduling, finished goods dispatch, and financial reporting — all in one place.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/login?tab=register"
            className="px-8 py-3.5 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold text-base transition-colors shadow-lg shadow-blue-900/40"
          >
            Get Started Free
          </Link>
          <Link
            to="/login?tab=login"
            className="px-8 py-3.5 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl font-semibold text-base transition-colors"
          >
            Sign In to Dashboard
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        <h2 className="text-center text-2xl font-bold text-slate-200 mb-10">
          Everything your foundry needs
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-white/5 border border-white/8 rounded-2xl p-6 hover:bg-white/8 transition-colors"
            >
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="text-base font-semibold text-white mb-1">{f.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="bg-blue-700/30 border border-blue-600/30 rounded-2xl px-8 py-10 text-center">
          <h2 className="text-2xl font-bold mb-3">Ready to streamline your operations?</h2>
          <p className="text-slate-300 text-sm mb-6 max-w-md mx-auto">
            Create your account and start managing production, inventory, and orders today.
          </p>
          <Link
            to="/login?tab=register"
            className="inline-block px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold transition-colors"
          >
            Create Free Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/8 py-6 text-center text-sm text-slate-500">
        FoundryERP &copy; {new Date().getFullYear()} — Steel Castings Manufacturing ERP
      </footer>
    </div>
  );
}
