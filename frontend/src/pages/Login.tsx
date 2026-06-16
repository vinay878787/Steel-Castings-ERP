import { useState, FormEvent } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const login = useAuthStore((s) => s.login);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const initialTab = searchParams.get('tab') === 'register' ? 'register' : 'login';
  const [tab, setTab] = useState<'login' | 'register'>(initialTab);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'operator' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    navigate('/');
    return null;
  }

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = tab === 'login' ? '/auth/login' : '/auth/register';
      const payload = tab === 'login' ? { email: form.email, password: form.password } : form;
      const { data } = await api.post(endpoint, payload);
      login(data.token, data.user);
      navigate('/');
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined;
      setError(msg || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">FoundryERP</h1>
          <p className="text-gray-500 text-sm mt-1">Manufacturing ERP for Steel Foundries</p>
        </div>
        <div className="text-center mb-4">
          <Link to="/home" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            ← Back to home
          </Link>
        </div>

        <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
          {(['login', 'register'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'login' ? 'Sign In' : 'Register'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === 'register' && (
            <>
              <div>
                <label className="label">Full Name</label>
                <input className="input" type="text" required value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="John Doe" />
              </div>
              <div>
                <label className="label">Role</label>
                <select className="input" value={form.role} onChange={(e) => set('role', e.target.value)}>
                  <option value="admin">Admin</option>
                  <option value="owner">Owner</option>
                  <option value="manager">Manager</option>
                  <option value="operator">Operator</option>
                </select>
              </div>
            </>
          )}
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" required value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="you@foundry.com" />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" required value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="••••••••" />
          </div>

          {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
            {loading ? 'Please wait...' : tab === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
