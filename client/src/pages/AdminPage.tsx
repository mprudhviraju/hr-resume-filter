import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  UserPlus,
  Trash2,
  Shield,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

function apiUrl(path: string): string {
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path;
}

interface UserRecord {
  email: string;
  name?: string;
  role: 'user' | 'admin';
  addedAt?: number;
  addedBy?: string;
}

export default function AdminPage() {
  const navigate = useNavigate();
  const { authHeaders, isAdmin, user } = useAuth();

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user');
  const [adding, setAdding] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await fetch(apiUrl('/api/users'), {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to load users');
      const data = (await res.json()) as { users: UserRecord[] };
      setUsers(data.users.sort((a, b) => a.email.localeCompare(b.email)));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAdd = async () => {
    setError('');
    setSuccess('');
    if (!newEmail.trim() || !newEmail.includes('@')) {
      setError('Enter a valid email address');
      return;
    }

    setAdding(true);
    try {
      const res = await fetch(apiUrl('/api/users'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          email: newEmail.trim().toLowerCase(),
          name: newName.trim() || undefined,
          role: newRole,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || 'Failed to add user');
      }
      setSuccess(`Added ${newEmail.trim()}`);
      setNewEmail('');
      setNewName('');
      setNewRole('user');
      setTimeout(() => setSuccess(''), 3000);
      await fetchUsers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (email: string) => {
    if (email === user?.email) {
      setError("You can't remove yourself");
      return;
    }
    setError('');
    setSuccess('');
    try {
      const res = await fetch(apiUrl(`/api/users/${encodeURIComponent(email)}`), {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to remove user');
      setSuccess(`Removed ${email}`);
      setTimeout(() => setSuccess(''), 3000);
      await fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-sm">
          <Shield size={40} className="text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-800 mb-2">Admin Access Required</h2>
          <p className="text-sm text-gray-500 mb-4">You don't have permission to manage users.</p>
          <button
            onClick={() => navigate('/')}
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Go back to Analyzer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 sm:py-12">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Analyzer
          </button>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-5 sm:px-8 sm:py-6">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg">
                  <Users className="text-white" size={22} />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">User Management</h1>
                  <p className="text-indigo-200 text-sm mt-0.5">
                    Add or remove authorized users
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              {/* Add user form */}
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-4">
                  <UserPlus size={16} className="text-indigo-500" />
                  Add New User
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="email"
                    placeholder="Email address"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  />
                  <input
                    type="text"
                    placeholder="Name (optional)"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  />
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as 'user' | 'admin')}
                    className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    onClick={handleAdd}
                    disabled={adding}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    {adding ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                    {adding ? 'Adding...' : 'Add User'}
                  </button>
                </div>
              </div>

              {/* Feedback */}
              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  {success}
                </div>
              )}

              {/* User list */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Authorized Users ({users.length})
                </h3>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 size={24} className="animate-spin text-indigo-400" />
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-8 text-sm text-gray-400">
                    No users yet. Add one above.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50 border border-gray-100 rounded-xl overflow-hidden">
                    {users.map((u) => (
                      <div
                        key={u.email}
                        className="flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-800 truncate">
                              {u.name || u.email}
                            </span>
                            {u.role === 'admin' && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                                Admin
                              </span>
                            )}
                            {u.email === user?.email && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
                                You
                              </span>
                            )}
                          </div>
                          {u.name && (
                            <div className="text-xs text-gray-400 truncate">{u.email}</div>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemove(u.email)}
                          disabled={u.email === user?.email}
                          className="ml-3 p-2 text-gray-300 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded-lg hover:bg-red-50"
                          title={u.email === user?.email ? "Can't remove yourself" : `Remove ${u.email}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
