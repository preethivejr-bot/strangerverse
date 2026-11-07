import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Users, 
  UserCheck, 
  UserX, 
  ShieldCheck, 
  MapPin, 
  MessageSquare, 
  Flag, 
  Search, 
  Clock, 
  Activity, 
  CheckCircle2, 
  AlertTriangle,
  RotateCcw,
  Zap,
  Lock,
  Ban,
  FileText,
  SlidersHorizontal
} from 'lucide-react';
import { User, Role, AuditLog, UserReport, JunctionSummary } from '../types';
import { RoleManagementModal } from '../components/RoleManagementModal';
import { socket } from '../services/socket';
import { SERVER_URL } from '../services/config';

interface OwnerControlCenterViewProps {
  user: User | null;
  onOpenAuth: () => void;
}

export const OwnerControlCenterView: React.FC<OwnerControlCenterViewProps> = ({ user, onOpenAuth }) => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    onlineUsers: 0,
    totalManagers: 0,
    totalModerators: 0,
    activeJunctions: 0,
    active1on1Sessions: 0,
    pendingReports: 0,
    fastModeratorMode: false
  });

  const [usersList, setUsersList] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [reportsList, setReportsList] = useState<UserReport[]>([]);
  const [junctions, setJunctions] = useState<JunctionSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'members' | 'junctions' | 'reports' | 'logs'>('members');
  const [selectedUserForRole, setSelectedUserForRole] = useState<User | null>(null);
  const [fastMode, setFastMode] = useState(false);
  const [loading, setLoading] = useState(true);

  const isOwner = user?.role === 'OWNER';

  useEffect(() => {
    fetchDashboardData();
    socket.emit('junctions:get-all');
    socket.on('junctions:updated', (data: JunctionSummary[]) => setJunctions(data));

    return () => {
      socket.off('junctions:updated');
    };
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const headers = {
        'Content-Type': 'application/json',
        'x-requester-email': user.email
      };

      // 1. Stats
      const statsRes = await fetch(`${SERVER_URL}/api/owner/stats`, { headers });
      const statsData = await statsRes.json();
      setStats(statsData);
      setFastMode(statsData.fastModeratorMode);

      // 2. Users list
      const usersRes = await fetch(`${SERVER_URL}/api/owner/users`, { headers });
      const usersData = await usersRes.json();
      if (usersData.users) setUsersList(usersData.users);

      // 3. Audit logs (Owner only)
      if (isOwner) {
        const logsRes = await fetch(`${SERVER_URL}/api/owner/audit-logs`, { headers });
        const logsData = await logsRes.json();
        if (logsData.logs) setAuditLogs(logsData.logs);
      }

      // 4. Reports
      const reportsRes = await fetch(`${SERVER_URL}/api/owner/reports`, { headers });
      const reportsData = await reportsRes.json();
      if (reportsData.reports) setReportsList(reportsData.reports);

    } catch (e) {
      console.error('Fetch dashboard error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyRoleChange = async (targetUserId: string, newRole: Role, action: string) => {
    if (!user) return;
    const res = await fetch(`${SERVER_URL}/api/owner/role`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-requester-email': user.email
      },
      body: JSON.stringify({
        targetUserId,
        newRole,
        action
      })
    });

    const data = await res.json();
    if (data.error) {
      throw new Error(data.error);
    }

    // Refresh data
    fetchDashboardData();
  };

  const toggleFastAutoMod = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/api/dev/toggle-fast-automod`, { method: 'POST' });
      const data = await res.json();
      setFastMode(data.fastModeratorMode);
    } catch (e) {
      console.error('Toggle fast automod error:', e);
    }
  };

  if (!user || (user.role !== 'OWNER' && user.role !== 'MANAGER')) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 rounded-3xl glass-panel border border-rose-500/30 text-center space-y-4">
        <Lock className="w-14 h-14 text-rose-500 mx-auto" />
        <h3 className="font-display font-bold text-xl text-white">Access Restricted</h3>
        <p className="text-xs text-slate-300">
          The <strong className="text-amber-400">STRANGERVERSE OWNER CONTROL CENTER</strong> is strictly reserved for the Original Website Owner and appointed Managers.
        </p>
        <button
          onClick={onOpenAuth}
          className="px-6 py-2.5 rounded-xl font-bold text-xs bg-stranger-purple text-white shadow"
        >
          Sign in as Owner
        </button>
      </div>
    );
  }

  const filteredUsers = usersList.filter(u => 
    u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Control Center Header Banner */}
      <div className="relative p-8 rounded-3xl glass-panel border border-amber-500/30 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-500/15 via-rose-500/10 to-transparent rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold">
              <ShieldAlert className="w-4 h-4" />
              Sovereign Command Center • Level 1 Supreme Authority
            </div>
            <h2 className="text-3xl sm:text-4xl font-display font-black text-white">
              STRANGERVERSE OWNER CONTROL CENTER
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Authenticated Owner: <span className="text-amber-300 font-mono font-semibold">{user.email}</span>
            </p>
          </div>

          {/* Dev AutoMod Testing Toggle */}
          <div className="p-4 rounded-2xl bg-dark-900 border border-white/10 space-y-2">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-400" />
                Auto-Moderator Testing
              </span>
              <button
                onClick={toggleFastAutoMod}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  fastMode
                    ? 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/25'
                    : 'bg-white/10 text-slate-400'
                }`}
              >
                {fastMode ? 'Fast Mode (20s)' : 'Standard (10m)'}
              </button>
            </div>
            <p className="text-[10px] text-slate-400">
              {fastMode 
                ? '⚡ Testing: Auto-promotes eligible users after 20 continuous seconds in junction.'
                : '🛡️ Production: Requires 10 continuous minutes of continuous presence.'}
            </p>
          </div>
        </div>
      </div>

      {/* Dashboard Statistics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
        
        <div className="p-4 rounded-2xl glass-panel border border-white/10 space-y-1">
          <div className="text-[11px] text-slate-400 font-medium">Total Users</div>
          <div className="text-2xl font-display font-extrabold text-white">{stats.totalUsers}</div>
        </div>

        <div className="p-4 rounded-2xl glass-panel border border-emerald-500/20 space-y-1">
          <div className="text-[11px] text-emerald-400 font-medium">Online Users</div>
          <div className="text-2xl font-display font-extrabold text-emerald-300">{stats.onlineUsers}</div>
        </div>

        <div className="p-4 rounded-2xl glass-panel border border-purple-500/20 space-y-1">
          <div className="text-[11px] text-purple-400 font-medium">Managers</div>
          <div className="text-2xl font-display font-extrabold text-purple-300">{stats.totalManagers}</div>
        </div>

        <div className="p-4 rounded-2xl glass-panel border border-teal-500/20 space-y-1">
          <div className="text-[11px] text-teal-400 font-medium">Moderators</div>
          <div className="text-2xl font-display font-extrabold text-teal-300">{stats.totalModerators}</div>
        </div>

        <div className="p-4 rounded-2xl glass-panel border border-cyan-500/20 space-y-1">
          <div className="text-[11px] text-cyan-400 font-medium">Active Hubs</div>
          <div className="text-2xl font-display font-extrabold text-cyan-300">{stats.activeJunctions}</div>
        </div>

        <div className="p-4 rounded-2xl glass-panel border border-indigo-500/20 space-y-1">
          <div className="text-[11px] text-indigo-400 font-medium">1-on-1 Chats</div>
          <div className="text-2xl font-display font-extrabold text-indigo-300">{stats.active1on1Sessions}</div>
        </div>

        <div className="p-4 rounded-2xl glass-panel border border-rose-500/20 space-y-1">
          <div className="text-[11px] text-rose-400 font-medium">Reports</div>
          <div className="text-2xl font-display font-extrabold text-rose-300">{stats.pendingReports}</div>
        </div>
      </div>

      {/* Control Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab('members')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'members'
              ? 'bg-amber-500 text-slate-900 shadow-lg'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Users className="w-4 h-4" />
          Role & Member Management
        </button>

        <button
          onClick={() => setActiveTab('junctions')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'junctions'
              ? 'bg-amber-500 text-slate-900 shadow-lg'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <MapPin className="w-4 h-4" />
          All 10 District Hubs
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'reports'
              ? 'bg-amber-500 text-slate-900 shadow-lg'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Flag className="w-4 h-4" />
          Safety Reports ({reportsList.length})
        </button>

        {isOwner && (
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'logs'
                ? 'bg-amber-500 text-slate-900 shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileText className="w-4 h-4" />
            Audit Action Logs
          </button>
        )}
      </div>

      {/* TAB 1: ROLE & MEMBER MANAGEMENT */}
      {activeTab === 'members' && (
        <div className="rounded-3xl glass-panel border border-white/10 p-6 space-y-6 shadow-2xl">
          
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-display font-bold text-lg text-white">Registered Members</h3>
              <p className="text-xs text-slate-400">Click any user to open the Role Management Popup</p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search username or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-dark-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-dark-900/80 uppercase text-[10px] text-slate-400 font-bold border-b border-white/5">
                <tr>
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Registered Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredUsers.map((u) => {
                  const isOwnerUser = u.role === 'OWNER';
                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-white/5 cursor-pointer transition-colors"
                      onClick={() => setSelectedUserForRole(u)}
                    >
                      <td className="py-3.5 px-4 flex items-center gap-3">
                        <img
                          src={u.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.displayName}`}
                          alt={u.displayName}
                          className="w-8 h-8 rounded-xl object-cover border border-white/10"
                        />
                        <span className="font-bold text-white">{u.displayName}</span>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-400">
                        {u.email}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          u.role === 'OWNER' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                          u.role === 'MANAGER' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' :
                          u.role === 'MODERATOR' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                          'bg-white/5 text-slate-300'
                        }`}>
                          {u.role}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 ${
                          u.isBanned ? 'text-rose-400 font-bold' :
                          u.status === 'online' ? 'text-emerald-400 font-semibold' : 'text-slate-500'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            u.isBanned ? 'bg-rose-400' :
                            u.status === 'online' ? 'bg-emerald-400' : 'bg-slate-500'
                          }`}></span>
                          {u.isBanned ? 'BANNED' : u.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-400">
                        {u.registeredAt ? new Date(u.registeredAt).toLocaleDateString() : 'N/A'}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedUserForRole(u);
                          }}
                          className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-white/5 hover:bg-amber-500 hover:text-slate-900 text-slate-300 border border-white/10 transition-all"
                        >
                          Manage Role
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ALL 10 DISTRICT HUBS */}
      {activeTab === 'junctions' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {junctions.map((j) => (
            <div key={j.id} className="p-6 rounded-3xl glass-panel border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-display font-bold text-lg text-white">{j.name} Junction</h4>
                <span className="text-xs font-mono font-bold text-cyan-400">{j.currentCount}/10</span>
              </div>
              <p className="text-xs text-slate-400">{j.landmark}</p>
              <div className="space-y-1">
                <span className="text-[11px] text-slate-400 font-semibold">Active Members:</span>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {j.participants.map(p => (
                    <span key={p.userId} className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/5 text-[10px] text-slate-200">
                      {p.username} ({p.role})
                    </span>
                  ))}
                  {j.participants.length === 0 && (
                    <span className="text-[10px] text-slate-500 italic">Empty room</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: SAFETY REPORTS */}
      {activeTab === 'reports' && (
        <div className="rounded-3xl glass-panel border border-white/10 p-6 space-y-4">
          <h3 className="font-display font-bold text-lg text-white">Pending Reports</h3>
          <div className="space-y-3">
            {reportsList.map((rep) => (
              <div key={rep.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-400">{rep.reason}</span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(rep.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Reported User: <strong className="text-white">{rep.reportedName}</strong> by {rep.reporterName} ({rep.context})
                </p>
                {rep.details && <p className="text-xs text-slate-400 italic">"{rep.details}"</p>}
              </div>
            ))}
            {reportsList.length === 0 && (
              <p className="text-xs text-slate-500 italic py-6 text-center">No reports pending review.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT ACTION LOGS */}
      {activeTab === 'logs' && isOwner && (
        <div className="rounded-3xl glass-panel border border-white/10 p-6 space-y-4">
          <h3 className="font-display font-bold text-lg text-white">Owner Audit Trail</h3>
          <div className="space-y-2 max-h-[500px] overflow-y-auto font-mono text-xs">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-3 rounded-xl bg-dark-900 border border-white/5 flex items-start justify-between gap-4">
                <div>
                  <span className="text-amber-400 font-bold">[{log.action}]</span>{' '}
                  <span className="text-slate-300">{log.details}</span>{' '}
                  <span className="text-slate-500">by {log.actorName} ({log.actorRole})</span>
                </div>
                <span className="text-[10px] text-slate-500 whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Role Management Modal Popup */}
      <RoleManagementModal
        isOpen={Boolean(selectedUserForRole)}
        targetUser={selectedUserForRole}
        currentUser={user}
        onClose={() => setSelectedUserForRole(null)}
        onApplyRoleChange={handleApplyRoleChange}
      />
    </div>
  );
};
