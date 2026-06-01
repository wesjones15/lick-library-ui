import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../core/auth/AuthContext';
import {
  getUserProfile, requestDeletion, deleteOwnAccount,
  getAllLicks, getAllSongs, getAllPlaylists,
  getAdminQueue, getAdminUsers, approveUser, rejectUser, deleteAdminUser,
  updateUsername, getAdminSongUpdateQueue,
} from '../../core/api/client';
import type { UserProfileResponse, AdminUserResponse, LickSummary, SongSummary, PlaylistSummary, SongUpdateRequestSummary } from '../../core/api/client';
import SongUpdateReviewModal from '../songs/SongUpdateReviewModal';
import { ALERT_AMBER, ALERT_RED } from '../../core/ui';
import { C_DANGER_BG, C_DANGER_BG_DARK, C_DANGER_BG_MID, C_DANGER_BG_SOFT, C_DANGER_BORDER_MID, C_DANGER_TEXT_MID, C_DANGER_TEXT_SOFT, C_GRAY_BG_50, C_GRAY_BORDER_100, C_GRAY_BORDER_200, C_GRAY_BORDER_300, C_GRAY_TEXT_300, C_GRAY_TEXT_400, C_GRAY_TEXT_500, C_GRAY_TEXT_600, C_GRAY_TEXT_700, C_GRAY_TEXT_800, C_GRAY_TEXT_900, C_PRIMARY_BG, C_PRIMARY_BG_DARK, C_PRIMARY_BG_SOFT, C_PRIMARY_BORDER_MID, C_PRIMARY_BORDER_SOFT, C_PRIMARY_TEXT, C_PRIMARY_TEXT_DARK, C_PRIMARY_TEXT_MID, C_SUCCESS_BG, C_SUCCESS_BG_DARK, C_WHITE_BG, C_WHITE_TEXT } from '../../core/colors';

export default function UserPage() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [managing, setManaging] = useState(false);
  const [editingUsername, setEditingUsername] = useState<string | null>(null);
  const [savingUsername, setSavingUsername] = useState(false);

  // Approved user uploads
  const [myLicks, setMyLicks] = useState<LickSummary[]>([]);
  const [mySongs, setMySongs] = useState<SongSummary[]>([]);
  const [myPlaylists, setMyPlaylists] = useState<PlaylistSummary[]>([]);

  // Admin
  const [queue, setQueue] = useState<AdminUserResponse[]>([]);
  const [allUsers, setAllUsers] = useState<AdminUserResponse[]>([]);
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<number | null>(null);
  const [songUpdateQueue, setSongUpdateQueue] = useState<SongUpdateRequestSummary[]>([]);
  const [reviewingUpdateId, setReviewingUpdateId] = useState<string | null>(null);

  const loadData = useCallback(() => {
    if (!currentUser) return;
    getUserProfile().then(setProfile).catch(() => {});
    if (currentUser.status === 'APPROVED' || currentUser.role === 'ADMIN') {
      getAllLicks(false, { mine: true }).then(setMyLicks).catch(() => {});
      getAllSongs(true).then(data => setMySongs(data.filter(s => s.ownedByCurrentUser))).catch(() => {});
      getAllPlaylists().then(data => setMyPlaylists(data.filter(p => p.ownedByCurrentUser))).catch(() => {});
    }
    if (currentUser.role === 'ADMIN') {
      getAdminQueue().then(setQueue).catch(() => {});
      getAdminUsers().then(setAllUsers).catch(() => {});
      getAdminSongUpdateQueue().then(setSongUpdateQueue).catch(() => {});
    }
  }, [currentUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  async function handleDeleteUser(userId: number) {
    await deleteAdminUser(userId);
    setAllUsers(u => u.filter(x => x.id !== userId));
    setConfirmDeleteUserId(null);
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      await requestDeletion();
      logout();
      navigate('/');
    } finally {
      setDeleting(false);
    }
  }

  async function handleSaveUsername() {
    if (!editingUsername) return;
    setSavingUsername(true);
    try {
      const updated = await updateUsername(editingUsername);
      setProfile(updated);
      setEditingUsername(null);
    } catch {
      // swallow; keep editing open
    } finally {
      setSavingUsername(false);
    }
  }

  if (!currentUser) return null;

  const isPending = currentUser.status === 'PENDING';
  const isRejected = currentUser.status === 'REJECTED';
  const isAdmin = currentUser.role === 'ADMIN';
  const isApproved = currentUser.status === 'APPROVED' || isAdmin;
  const isSuperAdmin = isAdmin && profile?.id === 1;

  const refreshButton = (
    <button
      onClick={loadData}
      title="Refresh"
      className={`${C_GRAY_TEXT_300} hover:${C_PRIMARY_TEXT_MID} transition-colors text-base leading-none`}
      aria-label="Refresh"
    >
      ↺
    </button>
  );

  return (
    <>
    <div className="max-w-3xl mx-auto px-6 py-10">
      {isAdmin && (
        <h1 className={`text-3xl font-bold ${C_PRIMARY_TEXT_DARK} mb-1`}>Welcome aboard, captain.</h1>
      )}
      {!isAdmin && (
        <h1 className={`text-3xl font-bold ${C_GRAY_TEXT_900} mb-1`}>Account</h1>
      )}

      {/* Profile card */}
      <div className={`border ${C_GRAY_BORDER_200} rounded-xl p-5 mb-6 ${C_WHITE_BG}`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {editingUsername !== null ? (
              <div className="flex items-center gap-2 mb-0.5">
                <input
                  autoFocus
                  value={editingUsername}
                  onChange={e => setEditingUsername(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveUsername(); if (e.key === 'Escape') setEditingUsername(null); }}
                  className={`text-sm border ${C_GRAY_BORDER_300} rounded px-2 py-0.5 ${C_GRAY_TEXT_900} focus:outline-none focus:${C_PRIMARY_BORDER_MID} w-40`}
                />
                <button
                  onClick={handleSaveUsername}
                  disabled={savingUsername}
                  className={`text-xs px-2 py-0.5 rounded ${C_PRIMARY_BG} ${C_WHITE_TEXT} hover:${C_PRIMARY_BG_DARK} disabled:opacity-50 transition-colors`}
                >
                  {savingUsername ? '…' : 'Save'}
                </button>
                <button
                  onClick={() => setEditingUsername(null)}
                  className={`text-xs ${C_GRAY_TEXT_400} hover:${C_GRAY_TEXT_600} transition-colors`}
                >
                  ×
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className={`font-semibold ${C_GRAY_TEXT_900}`}>{profile?.username ?? '—'}</span>
                {managing && (
                  <button
                    onClick={() => setEditingUsername(profile?.username ?? '')}
                    title="Edit username"
                    className={`${C_GRAY_TEXT_300} hover:${C_PRIMARY_TEXT_MID} transition-colors text-sm leading-none`}
                    aria-label="Edit username"
                  >
                    ✎
                  </button>
                )}
              </div>
            )}
            <div className={`text-sm ${C_GRAY_TEXT_400}`}>{profile?.email}</div>
            {profile?.creationTs && (
              <div className={`text-xs ${C_GRAY_TEXT_300} mt-1`}>
                Joined {new Date(profile.creationTs).toLocaleDateString()}
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              {!isAdmin && refreshButton}
              <button
                onClick={() => { setManaging(m => !m); setEditingUsername(null); setConfirmDelete(false); }}
                className={`text-xs ${C_GRAY_TEXT_400} hover:${C_PRIMARY_TEXT} transition-colors`}
              >
                {managing ? 'Done' : 'Manage'}
              </button>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isAdmin ? '${C_PRIMARY_BG_SUBTLE} ${C_PRIMARY_TEXT_DARK}' : '${C_GRAY_BG_100} ${C_GRAY_TEXT_500}'}`}>
              {currentUser.role}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              currentUser.status === 'APPROVED' ? '${C_SUCCESS_BG_SUBTLE} ${C_SUCCESS_TEXT}' :
              currentUser.status === 'REJECTED' ? '${C_DANGER_BG_SUBTLE} ${C_DANGER_TEXT}' :
              'bg-amber-100 ${C_WARN_TEXT}'
            }`}>
              {currentUser.status}
            </span>
          </div>
        </div>
      </div>

      {/* Status banners for non-approved non-admin */}
      {isPending && !isAdmin && (
        <div className={`mb-6 ${ALERT_AMBER}`}>
          {currentUser.requestType === 'ACCOUNT_DELETION'
            ? 'Your deletion request is pending admin review.'
            : "Your account is pending approval. You'll have full access once an admin approves your request."}
        </div>
      )}
      {isRejected && !isAdmin && (
        <div className={`mb-6 ${ALERT_RED}`}>
          Your account request was not approved.
        </div>
      )}

      {/* My Uploads */}
      {isApproved && (
        <div className="mb-8">
          <h2 className={`text-lg font-semibold ${C_GRAY_TEXT_800} mb-3`}>My Uploads</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className={`border ${C_GRAY_BORDER_200} rounded-xl p-4 text-center`}>
              <div className={`text-2xl font-bold ${C_PRIMARY_TEXT}`}>{myLicks.length}</div>
              <div className={`text-xs ${C_GRAY_TEXT_400} mt-1`}>Licks</div>
            </div>
            <div className={`border ${C_GRAY_BORDER_200} rounded-xl p-4 text-center`}>
              <div className={`text-2xl font-bold ${C_PRIMARY_TEXT}`}>{mySongs.length}</div>
              <div className={`text-xs ${C_GRAY_TEXT_400} mt-1`}>Songs</div>
            </div>
            <div className={`border ${C_GRAY_BORDER_200} rounded-xl p-4 text-center`}>
              <div className={`text-2xl font-bold ${C_PRIMARY_TEXT}`}>{myPlaylists.length}</div>
              <div className={`text-xs ${C_GRAY_TEXT_400} mt-1`}>Playlists</div>
            </div>
          </div>
        </div>
      )}

      {/* Admin: Approval Queue */}
      {isAdmin && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className={`text-lg font-semibold ${C_GRAY_TEXT_800}`}>Approval Queue</h2>
            <div className="flex items-center gap-2">
              {refreshButton}
              <button
                onClick={() => { setManaging(m => !m); setEditingUsername(null); setConfirmDelete(false); }}
                className={`text-xs ${C_GRAY_TEXT_400} hover:${C_PRIMARY_TEXT} transition-colors`}
              >
                {managing ? 'Done' : 'Manage'}
              </button>
            </div>
          </div>
          {queue.length === 0 ? (
            <p className={`text-sm ${C_GRAY_TEXT_400}`}>No pending users.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {queue.map(u => (
                <div key={u.id} className={`flex items-center justify-between border ${C_GRAY_BORDER_200} rounded-lg px-4 py-2.5 ${C_WHITE_BG}`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <div className={`text-sm font-medium ${C_GRAY_TEXT_800}`}>{u.username}</div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        u.requestType === 'ACCOUNT_DELETION'
                          ? '${C_DANGER_BG_SUBTLE} ${C_DANGER_TEXT}'
                          : '${C_INFO_BG_SUBTLE} ${C_INFO_TEXT}'
                      }`}>
                        {u.requestType === 'ACCOUNT_DELETION' ? 'Deletion' : 'Account Creation'}
                      </span>
                    </div>
                    <div className={`text-xs ${C_GRAY_TEXT_400}`}>{u.email}</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(u.id)}
                      className={`text-xs px-3 py-1 rounded-lg ${C_SUCCESS_BG} ${C_WHITE_TEXT} hover:${C_SUCCESS_BG_DARK} transition-colors`}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(u.id)}
                      className={`text-xs px-3 py-1 rounded-lg border ${C_DANGER_BORDER_MID} ${C_DANGER_TEXT_MID} hover:${C_DANGER_BG_SOFT} transition-colors`}
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
          <h2 className={`text-lg font-semibold ${C_GRAY_TEXT_800} mb-3`}>All Users</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className={`border-b ${C_GRAY_BORDER_200} ${C_GRAY_TEXT_400} text-left`}>
                  <th className="pb-2 pr-4">ID</th>
                  <th className="pb-2 pr-4">Username</th>
                  <th className="pb-2 pr-4">Email</th>
                  <th className="pb-2 pr-4">Role</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {allUsers.map(u => (
                  <tr key={u.id} className={`border-b ${C_GRAY_BORDER_100}`}>
                    <td className={`py-1.5 pr-4 ${C_GRAY_TEXT_400}`}>{u.id}</td>
                    <td className={`py-1.5 pr-4 ${C_GRAY_TEXT_700}`}>{u.username}</td>
                    <td className={`py-1.5 pr-4 ${C_GRAY_TEXT_500}`}>{u.email}</td>
                    <td className="py-1.5 pr-4">
                      <span className={`px-1.5 py-0.5 rounded text-xs ${u.role === 'ADMIN' ? '${C_PRIMARY_BG_SUBTLE} ${C_PRIMARY_TEXT_DARK}' : '${C_GRAY_BG_100} ${C_GRAY_TEXT_500}'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-1.5 pr-4">
                      <span className={`px-1.5 py-0.5 rounded text-xs ${
                        u.status === 'APPROVED' ? '${C_SUCCESS_BG_SUBTLE} ${C_SUCCESS_TEXT}' :
                        u.status === 'REJECTED' ? '${C_DANGER_BG_SUBTLE} ${C_DANGER_TEXT}' :
                        'bg-amber-100 ${C_WARN_TEXT}'
                      }`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="py-1.5">
                      {u.id !== profile?.id && (
                        confirmDeleteUserId === u.id ? (
                          <div className="flex items-center gap-1">
                            <span className={`text-xs ${C_DANGER_TEXT_SOFT}`}>Sure?</span>
                            <button
                              onClick={() => handleDeleteUser(u.id)}
                              className={`text-xs px-2 py-0.5 rounded ${C_DANGER_BG_MID} ${C_WHITE_TEXT} hover:${C_DANGER_BG} transition-colors`}
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setConfirmDeleteUserId(null)}
                              className={`text-xs px-2 py-0.5 rounded border ${C_GRAY_BORDER_300} ${C_GRAY_TEXT_500} hover:${C_GRAY_BG_50} transition-colors`}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteUserId(u.id)}
                            className={`text-xs text-red-300 hover:${C_DANGER_TEXT_SOFT} transition-colors`}
                          >
                            Delete
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Admin: Song Update Requests */}
      {isAdmin && (
        <div className="mb-8">
          <h2 className={`text-lg font-semibold ${C_GRAY_TEXT_800} mb-3`}>Song Update Requests</h2>
          {songUpdateQueue.length === 0 ? (
            <p className={`text-sm ${C_GRAY_TEXT_400}`}>No pending song updates.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {songUpdateQueue.map(req => (
                <div key={req.id} className={`flex items-center justify-between border ${C_GRAY_BORDER_200} rounded-lg px-4 py-2.5 ${C_WHITE_BG}`}>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className={`text-sm font-medium ${C_GRAY_TEXT_800}`}>{req.songTitle}{req.songArtist ? ` — ${req.songArtist}` : ''}</div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        req.requestType === 'SONG_METADATA' ? '${C_INFO_BG_SUBTLE} ${C_INFO_TEXT}' :
                        req.requestType === 'SONG_CHART' ? '${C_CHART_BG} ${C_CHART_TEXT}' :
                        '${C_BEATMAP_BG} ${C_BEATMAP_TEXT}'
                      }`}>
                        {req.requestType === 'SONG_METADATA' ? 'Metadata' : req.requestType === 'SONG_CHART' ? 'Chart' : 'Beatmap'}
                      </span>
                    </div>
                    <div className={`text-xs ${C_GRAY_TEXT_400}`}>submitted by {req.submitterUsername}</div>
                  </div>
                  <button
                    onClick={() => setReviewingUpdateId(req.id)}
                    className={`text-xs px-3 py-1 rounded-lg border ${C_PRIMARY_BORDER_SOFT} ${C_PRIMARY_TEXT} hover:${C_PRIMARY_BG_SOFT} transition-colors`}
                  >
                    Review
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delete Account — only visible in manage mode */}
      {managing && (
        <div className={`mt-8 pt-6 border-t ${C_GRAY_BORDER_100}`}>
          {confirmDelete ? (
            <div className="flex items-center gap-3">
              <span className={`text-sm ${C_DANGER_TEXT_MID}`}>Submit a deletion request for admin review?</span>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || isSuperAdmin}
                className={`text-xs px-3 py-1.5 rounded-lg ${C_DANGER_BG} ${C_WHITE_TEXT} hover:${C_DANGER_BG_DARK} disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
              >
                {deleting ? 'Submitting…' : 'Submit request'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className={`text-xs px-3 py-1.5 rounded-lg border ${C_GRAY_BORDER_300} ${C_GRAY_TEXT_600} hover:${C_GRAY_BG_50} transition-colors`}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => !isSuperAdmin && setConfirmDelete(true)}
              disabled={isSuperAdmin}
              title={isSuperAdmin ? 'Primary admin account cannot be deleted' : undefined}
              className={`text-xs transition-colors ${isSuperAdmin ? '${C_GRAY_TEXT_300} cursor-not-allowed' : '${C_DANGER_TEXT_MUTED} hover:${C_DANGER_TEXT_MID}'}`}
            >
              Delete account
            </button>
          )}
        </div>
      )}
    </div>

      {reviewingUpdateId && (
        <SongUpdateReviewModal
          updateId={reviewingUpdateId}
          onClose={() => setReviewingUpdateId(null)}
          onDone={(doneId) => {
            setSongUpdateQueue(q => q.filter(r => r.id !== doneId));
            setReviewingUpdateId(null);
          }}
        />
      )}
    </>
  );
}
