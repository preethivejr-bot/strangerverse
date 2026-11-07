import React, { useState } from 'react';
import { 
  X, 
  ShieldAlert, 
  ShieldCheck, 
  UserCheck, 
  UserX, 
  AlertTriangle, 
  Ban, 
  Clock, 
  CheckCircle2 
} from 'lucide-react';
import { User, Role } from '../types';

interface RoleManagementModalProps {
  isOpen: boolean;
  targetUser: User | null;
  currentUser: User | null;
  onClose: () => void;
  onApplyRoleChange: (targetUserId: string, newRole: Role, action: string) => Promise<void>;
}

export const RoleManagementModal: React.FC<RoleManagementModalProps> = ({
  isOpen,
  targetUser,
  currentUser,
  onClose,
  onApplyRoleChange
}) => {
  const [selectedAction, setSelectedAction] = useState<{ newRole: Role; action: string; label: string } | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !targetUser) return null;

  const isOwner = currentUser?.role === 'OWNER';
  const isManager = currentUser?.role === 'MANAGER';

  const roleOptions = [
    {
      id: 'make_manager',
      label: 'Make Manager',
      description: 'Promote member to Level 2 Manager (Owner only)',
      newRole: 'MANAGER' as Role,
      action: 'MAKE_MANAGER',
      icon: ShieldCheck,
      color: 'text-purple-400 border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20',
      allowed: isOwner // Only Owner can appoint Manager!
    },
    {
      id: 'make_moderator',
      label: 'Make Moderator',
      description: 'Promote member to Level 3 Moderator',
      newRole: 'MODERATOR' as Role,
      action: 'MAKE_MODERATOR',
      icon: ShieldCheck,
      color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20',
      allowed: isOwner || isManager
    },
    {
      id: 'keep_normal',
      label: 'Keep as Normal User',
      description: 'Reset or maintain member as Level 4 Normal User',
      newRole: 'NORMAL_USER' as Role,
      action: 'KEEP_NORMAL',
      icon: UserCheck,
      color: 'text-slate-300 border-slate-700 bg-white/5 hover:bg-white/10',
      allowed: isOwner || isManager
    },
    {
      id: 'remove_manager',
      label: 'Remove Manager Role',
      description: 'Demote Manager to Normal User (Owner only)',
      newRole: 'NORMAL_USER' as Role,
      action: 'REMOVE_MANAGER',
      icon: UserX,
      color: 'text-amber-400 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20',
      allowed: isOwner && targetUser.role === 'MANAGER'
    },
    {
      id: 'remove_moderator',
      label: 'Remove Moderator Role',
      description: 'Demote Moderator to Normal User',
      newRole: 'NORMAL_USER' as Role,
      action: 'REMOVE_MODERATOR',
      icon: UserX,
      color: 'text-teal-400 border-teal-500/30 bg-teal-500/10 hover:bg-teal-500/20',
      allowed: (isOwner || isManager) && targetUser.role === 'MODERATOR'
    },
    {
      id: 'suspend_user',
      label: 'Suspend User',
      description: 'Temporarily suspend user account access',
      newRole: targetUser.role,
      action: 'SUSPEND_USER',
      icon: Clock,
      color: 'text-orange-400 border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20',
      allowed: isOwner || isManager
    },
    {
      id: 'ban_user',
      label: 'Ban User',
      description: 'Permanently revoke platform access',
      newRole: targetUser.role,
      action: targetUser.isBanned ? 'UNBAN_USER' : 'BAN_USER',
      icon: Ban,
      color: targetUser.isBanned 
        ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' 
        : 'text-rose-400 border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20',
      allowed: isOwner
    }
  ];

  const handleSelect = (option: typeof roleOptions[0]) => {
    setSelectedAction({
      newRole: option.newRole,
      action: option.action,
      label: option.label
    });
    setShowConfirmation(true);
    setError(null);
  };

  const handleConfirm = async () => {
    if (!selectedAction) return;

    try {
      setLoading(true);
      setError(null);
      await onApplyRoleChange(targetUser.id, selectedAction.newRole, selectedAction.action);
      setShowConfirmation(false);
      onClose();
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'Failed to update role.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-3xl glass-panel border border-white/10 p-6 sm:p-8 shadow-2xl">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-6">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500 to-rose-500 text-white shadow-lg">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-display font-bold text-xl text-white">
              MANAGE MEMBER ROLE
            </h3>
            <p className="text-xs text-slate-400">
              Authority Level: <span className="text-amber-400 font-semibold">{currentUser?.role}</span>
            </p>
          </div>
        </div>

        {/* Target User Info Card */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-4 mb-6">
          <img
            src={targetUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${targetUser.displayName}`}
            alt={targetUser.displayName}
            className="w-12 h-12 rounded-xl border border-white/10"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm">{targetUser.displayName}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-dark-900 border border-white/10 text-cyan-300">
                Current: {targetUser.role}
              </span>
            </div>
            <span className="text-xs text-slate-400 font-mono">{targetUser.email}</span>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Status: <span className={targetUser.isBanned ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                {targetUser.isBanned ? 'PERMANENTLY BANNED' : targetUser.status}
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
            {error}
          </div>
        )}

        {/* Normal Mode: Role Options */}
        {!showConfirmation ? (
          <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
            {roleOptions.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.id}
                  disabled={!opt.allowed}
                  onClick={() => handleSelect(opt)}
                  className={`w-full flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all ${
                    opt.allowed
                      ? opt.color + ' cursor-pointer'
                      : 'opacity-30 cursor-not-allowed border-slate-800 bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <div>
                      <div className="text-xs font-bold">{opt.label}</div>
                      <div className="text-[11px] text-slate-400">{opt.description}</div>
                    </div>
                  </div>
                  {opt.allowed && <CheckCircle2 className="w-4 h-4 opacity-70" />}
                </button>
              );
            })}
          </div>
        ) : (
          /* Confirmation Dialog */
          <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-4 animate-fadeIn">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-white">
                  Confirm Administrative Action
                </h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Are you sure you want to assign this role to this member?
                </p>
                <div className="mt-2 text-xs font-mono p-2 rounded bg-dark-900/80 border border-white/10 text-cyan-300">
                  Target: {targetUser.displayName} ({targetUser.email})<br />
                  Action: {selectedAction?.label} ({selectedAction?.newRole})
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                disabled={loading}
                onClick={() => setShowConfirmation(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={loading}
                onClick={handleConfirm}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-lg shadow-amber-500/25 hover:opacity-95 transition-all"
              >
                {loading ? 'Applying...' : 'Confirm'}
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-white/5 text-[11px] text-slate-400 text-center">
          Hierarchy: LEVEL 1: OWNER &gt; LEVEL 2: MANAGER &gt; LEVEL 3: MODERATOR &gt; LEVEL 4: NORMAL USER
        </div>
      </div>
    </div>
  );
};
