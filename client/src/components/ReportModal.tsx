import React, { useState } from 'react';
import { X, Flag, AlertCircle, CheckCircle } from 'lucide-react';
import { User } from '../types';
import { SERVER_URL } from '../services/config';

interface ReportModalProps {
  isOpen: boolean;
  reportedUser: { id: string; displayName: string } | null;
  reporterUser: User | null;
  context?: string;
  onClose: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  reportedUser,
  reporterUser,
  context = 'General',
  onClose
}) => {
  const [reason, setReason] = useState('Inappropriate Language');
  const [details, setDetails] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen || !reportedUser) return null;

  const reasons = [
    'Inappropriate Language or Abuse',
    'Harassment or Hate Speech',
    'Spam or Commercial Solicitation',
    'Audio / Microphone Disturbance',
    'Impersonation or False Identity',
    'Underage Participant Concern',
    'Other Guideline Violation'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reporterUser) return;

    try {
      setLoading(true);
      await fetch(`${SERVER_URL}/api/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reporterId: reporterUser.id,
          reportedUserId: reportedUser.id,
          reason,
          details,
          context
        })
      });

      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 1800);
    } catch (err) {
      console.error('Report error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md rounded-3xl glass-panel border border-white/10 p-6 sm:p-8 shadow-2xl">
        
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="text-center py-8 space-y-3">
            <CheckCircle className="w-14 h-14 text-emerald-400 mx-auto animate-bounce" />
            <h3 className="font-bold text-lg text-white">Report Submitted</h3>
            <p className="text-xs text-slate-400">
              Thank you for keeping STRANGERVERSE safe. Room moderators and the Owner Control Center have been alerted.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                <Flag className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">Report User</h3>
                <p className="text-xs text-slate-400">
                  Target: <span className="text-rose-400 font-semibold">{reportedUser.displayName}</span> ({context})
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Select Reason:
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-dark-900 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-400"
              >
                {reasons.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Additional Details (Optional):
              </label>
              <textarea
                rows={3}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Describe what occurred..."
                className="w-full px-3 py-2 rounded-xl bg-dark-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 resize-none"
              />
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-[11px] text-slate-400 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
              False reports may result in account warnings. All moderation actions are logged in the Owner Control Center.
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-500 hover:bg-rose-600 text-white transition-colors"
              >
                {loading ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
