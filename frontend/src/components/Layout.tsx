import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuthStore } from '../store/authStore';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Layout() {
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <div />
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {user?.name} <span className="text-gray-400 capitalize">({user?.role})</span>
            </span>
            <button onClick={handleLogout} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 transition-colors">
              <LogOut size={15} />
              Logout
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
