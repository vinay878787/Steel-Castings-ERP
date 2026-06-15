import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import api from '../lib/api';
import { AuditLog, User } from '../types';

const ACTION_BADGE: Record<string, string> = {
  create: 'badge-green',
  update: 'badge-blue',
  delete: 'badge-red',
};

export default function AuditLogs() {
  const [entity, setEntity] = useState('');
  const [action, setAction] = useState('');

  const params: Record<string, string> = {};
  if (entity) params.entity = entity;
  if (action) params.action = action;

  const { data, isLoading } = useQuery<{ logs: AuditLog[]; total: number }>({
    queryKey: ['audit-logs', params],
    queryFn: () => api.get('/audit-logs', { params }).then((r) => r.data),
  });
  const logs = data?.logs ?? [];

  const entities = [...new Set(logs.map((l) => l.entity))].sort();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
      <p className="text-sm text-gray-500">Track all create, update, and delete operations</p>

      <div className="card p-4 flex flex-wrap gap-3">
        <select className="input w-44" value={entity} onChange={(e) => setEntity(e.target.value)}>
          <option value="">All Entities</option>
          {entities.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        <select className="input w-36" value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="">All Actions</option>
          {['create', 'update', 'delete'].map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <button onClick={() => { setEntity(''); setAction(''); }} className="btn-secondary">Reset</button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="table-th">Date</th>
                <th className="table-th">Action</th>
                <th className="table-th">Entity</th>
                <th className="table-th">Entity ID</th>
                <th className="table-th">User</th>
                <th className="table-th">Changes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && <tr><td colSpan={6} className="table-td text-center text-gray-400">Loading…</td></tr>}
              {!isLoading && logs.length === 0 && <tr><td colSpan={6} className="table-td text-center text-gray-400 py-8">No audit logs</td></tr>}
              {logs.map((log) => {
                const user = typeof log.user === 'object' ? log.user as User : null;
                return (
                  <tr key={log._id} className="hover:bg-gray-50">
                    <td className="table-td text-xs text-gray-500 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="table-td"><span className={ACTION_BADGE[log.action] ?? 'badge-gray'}>{log.action}</span></td>
                    <td className="table-td font-medium">{log.entity}</td>
                    <td className="table-td font-mono text-xs text-gray-500">{log.entityId.slice(-8)}</td>
                    <td className="table-td text-sm">{user?.name ?? '-'}</td>
                    <td className="table-td text-xs text-gray-500 max-w-sm">
                      {log.action === 'create' && <span className="text-green-600">Created new record</span>}
                      {log.action === 'delete' && <span className="text-red-600">Deleted record</span>}
                      {log.action === 'update' && log.oldValue && (
                        <details>
                          <summary className="cursor-pointer text-blue-600 hover:underline">View changes</summary>
                          <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto max-w-xs">
                            {JSON.stringify({ old: log.oldValue, new: log.newValue }, null, 2)}
                          </pre>
                        </details>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
