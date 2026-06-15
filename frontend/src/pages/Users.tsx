import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import api from '../lib/api';
import { User } from '../types';
import Modal from '../components/Modal';

interface UserRecord {
  _id: string;
  id: string;
  name: string;
  email: string;
  role: User['role'];
  isActive: boolean;
  createdAt: string;
}

const ROLE_BADGE: Record<string, string> = {
  admin: 'badge-red',
  owner: 'badge-blue',
  manager: 'badge-yellow',
  operator: 'badge-gray',
};

const empty = { name: '', email: '', password: '', role: 'operator' as User['role'] };

export default function Users() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');

  const { data: users = [], isLoading } = useQuery<UserRecord[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then((r) => r.data),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['users'] });
  const getMsg = (e: unknown) =>
    (e && typeof e === 'object' && 'response' in e) ? (e as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Error' : 'Error';

  const createMutation = useMutation({
    mutationFn: (d: typeof empty) => api.post('/auth/register', d),
    onSuccess: () => { invalidate(); setModal(false); setForm(empty); },
    onError: (e: unknown) => setError(getMsg(e)),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => api.put(`/users/${id}`, { isActive }),
    onSuccess: invalidate,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <button onClick={() => { setForm(empty); setError(''); setModal(true); }} className="btn-primary">
          <Plus size={16} className="mr-1.5" />Add User
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="table-th">Name</th>
              <th className="table-th">Email</th>
              <th className="table-th">Role</th>
              <th className="table-th">Status</th>
              <th className="table-th">Joined</th>
              <th className="table-th">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && <tr><td colSpan={6} className="table-td text-center text-gray-400">Loading…</td></tr>}
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="table-td font-medium">{u.name}</td>
                <td className="table-td text-gray-600">{u.email}</td>
                <td className="table-td"><span className={ROLE_BADGE[u.role] ?? 'badge-gray'}>{u.role}</span></td>
                <td className="table-td">
                  <span className={u.isActive ? 'badge-green' : 'badge-red'}>{u.isActive ? 'Active' : 'Inactive'}</span>
                </td>
                <td className="table-td text-xs text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="table-td">
                  <button
                    onClick={() => toggleActiveMutation.mutate({ id: u._id || u.id, isActive: !u.isActive })}
                    className={`btn btn-sm ${u.isActive ? 'btn-danger' : 'btn-success'}`}
                  >
                    {u.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modal} onClose={() => setModal(false)} title="Add User">
        <div className="space-y-3">
          <div>
            <label className="label">Full Name</label>
            <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as User['role'] }))}>
              <option value="admin">Admin</option>
              <option value="owner">Owner</option>
              <option value="manager">Manager</option>
              <option value="operator">Operator</option>
            </select>
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
        </div>
        <div className="flex gap-2 mt-4 justify-end">
          <button onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
          <button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending} className="btn-primary">
            {createMutation.isPending ? 'Creating…' : 'Create User'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
