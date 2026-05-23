import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../core/auth/AuthContext';
import {
  getUserProfile, deleteOwnAccount,
  getAllLicks, getAllSongs, getAllPlaylists,
  getAdminQueue, getAdminUsers, approveUser, rejectUser,
} from '../../core/api/client';
import type { UserProfileResponse, AdminUserResponse, LickSummary, SongSummary, PlaylistSummary } from '../../core/api/client';

export default function UserPage() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Approved user uploads
  const [myLicks, setMyLicks] = useState<LickSummary[]>([]);
  const [mySongs, setMySongs] = useState<SongSummary[]>([]);
  const [myPlaylists, setMyPlaylists] = useState<PlaylistSummary[]>([]);

  // Admin
  const [queue, setQueue] = useState<AdminUserResponse[]>([]);
  const [allUsers, setAllUsers] = useState<AdminUserResponse[]>([]);

  useEffect(() => {
    getUserProfile().then(setProfile).catch(() => {});
    if (currentUser?.status === 'APPROVED' || currentUser?.role === 'ADMIN') {
      getAllLicks(false, { mine: true }).then(setMyLicks).catch(() => {});
      getAllSongs(true).then(data => setMySongs(data.filter(s => s.ownedByCurrentUser))).catch(() => {});
      getAllPlaylists().then(data => setMyPlaylists(data.filter(p => p.ownedByCurrentUser))).catch(() => {});
    }
    if (currentUser?.role === 'ADMIN') {
      getAdminQueue().then(setQueue).catch(() => {});
      getAdminUsers().then(setAllUsers).catch(() => {});
    }
  }, [currentUser]);

  async function handleApprove(userId: number) {
    await approveUser(userId);
    setQueue(q => q.filter(u => u.id !== userId));
    getAdminUsers().then(setAllUsers).catch(() => {});
  }

  async function handleReject(userId: number) {
    await rejectUser(userId);
    setQueue(q => q.filter(u => u.id !== userId));
    getAdminUsers().then(setAllUsers).catch(() => {});
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      await deleteOwnAccount();
      logout();
      navigate('/');
    } finally {
      setDeleting(false);
    }
  }

  if (!currentUser) return null;

  const isPending = currentUser.status === 'PENDING';
  const isRejected = currentUser.status === 'REJECTED';
  const isAdmin = currentUser.role === 'ADMIN';
  const isApproved = currentUser.status === 'APPROVED' || isAdmin;

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      {isAdmin && (
        <h1 className="text-3xl font-bold text-indigo-700 mb-1">Welcome aboard, captain.</h1>
      )}
      {!isAdmin && (
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Account</h1>
      )}

      {/* Profile card */}
      <div className="border border-gray-200 rounded-xl p-5 mb-6 bg-white">
        <div className="flex items-start justify-between">
          <div>
            <div className="font-semibold text-gray-900">{profile?.username ?? '—'}</div>
            <div className="text-sm text-gray-400">{profile?.email}</div>
            {profile?.creationTs && (
              <div className="text-xs text-gray-300 mt-1">
                Joined {new Date(profile.creationTs).toLocaleDateString()}
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isAdmin ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>
              {currentUser.role}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              currentUser.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
              currentUser.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
              'bg-amber-100 text-amber-700'
            }`}>
              {currentUser.status}
            </span>
          </div>
        </div>
      </div>

      {/* Status banners for non-approved non-admin */}
      {isPending && !isAdmin && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Your account is pending approval. You'll have full access once an admin approves your request.
        </div>
      )}
      {isRejected && !isAdmin && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Your account request was not approved.
        </div>
      )}

      {/* My Uploads */}
      {isApproved && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">My Uploads</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="border border-gray-200 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-indigo-600">{myLicks.length}</div>
              <div className="text-xs text-gray-400 mt-1">Licks</div>
            </div>
            <div className="border border-gray-200 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-indigo-600">{mySongs.length}</div>
              <div className="text-xs text-gray-400 mt-1">Songs</div>
            </div>
            <div className="border border-gray-200 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-indigo-600">{myPlaylists.length}</div>
              <div className="text-xs text-gray-400 mt-1">Playlists</div>
            </div>
          </div>
        </div>
      )}

      {/* Admin: Approval Queue */}
      {isAdmin && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Approval Queue</h2>
          {queue.length === 0 ? (
            <p className="text-sm text-gray-400">No pending users.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {queue.map(u => (
                <div key={u.id} className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-2.5 bg-white">
                  <div>
                    <div className="text-sm font-medium text-gray-800">{u.username}</div>
                    <div className="text-xs text-gray-400">{u.email}</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(u.id)}
                      className="text-xs px-3 py-1 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(u.id)}
                      className="text-xs px-3 py-1 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Admin: All Users table */}
      {isAdmin && allUsers.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">All Users</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-gray-400 text-left">
                  <th className="pb-2 pr-4">ID</th>
                  <th className="pb-2 pr-4">Username</th>
                  <th className="pb-2 pr-4">Email</th>
                  <th className="pb-2 pr-4">Role</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {allUsers.map(u => (
                  <tr key={u.id} className="border-b border-gray-100">
                    <td className="py-1.5 pr-4 text-gray-400">{u.id}</td>
                    <td className="py-1.5 pr-4 text-gray-700">{u.username}</td>
                    <td className="py-1.5 pr-4 text-gray-500">{u.email}</td>
                    <td className="py-1.5 pr-4">
                      <span className={`px-1.5 py-0.5 rounded text-xs ${u.role === 'ADMIN' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-xs ${
                        u.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                        u.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {u.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Account */}
      <div className="mt-8 pt-6 border-t border-gray-100">
        {confirmDelete ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-red-600">Delete your account and all your data?</span>
            <button
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="text-xs px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {deleting ? 'Deleting…' : 'Confirm delete'}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-xs text-red-400 hover:text-red-600 transition-colors"
          >
            Delete account
          </button>
        )}
      </div>
    </div>
  );
}
