import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Bell, AlertTriangle, CheckCircle2, User, Clock, ShieldAlert } from 'lucide-react';

export const StaffCallAlertModal: React.FC = () => {
  const { currentUser } = useAuth();
  const { activeStaffCall, acknowledgeStaffCall, dismissActiveStaffCallModal } = useData();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If no active call, or call is not for this user, or already acknowledged, don't show
  if (!activeStaffCall || !currentUser || activeStaffCall.staffId !== currentUser.id || activeStaffCall.status === 'ACKNOWLEDGED') {
    return null;
  }

  const handleAcknowledge = async () => {
    setIsSubmitting(true);
    try {
      await acknowledgeStaffCall(activeStaffCall.id);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="urgent-call-title"
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border-4 border-red-500 overflow-hidden text-slate-900 animate-in zoom-in-95 duration-200"
      >
        {/* Urgent Header */}
        <div className="bg-red-600 px-6 py-5 text-white flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-2xl animate-bounce">
            <Bell className="w-8 h-8 text-white fill-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-white text-red-700 text-xs font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider">
                Priority 1
              </span>
              <span className="text-xs text-red-100 font-mono">
                {new Date(activeStaffCall.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
            <h2 id="urgent-call-title" className="text-xl font-black tracking-tight leading-tight">
              URGENT CALL FROM MANAGER
            </h2>
          </div>
        </div>

        {/* Call Content */}
        <div className="p-6 space-y-5">
          <div className="flex items-center gap-3 p-3.5 bg-red-50 border border-red-200 rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center font-black text-sm">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-red-700 font-semibold uppercase tracking-wider">Dispatched By</div>
              <div className="text-base font-extrabold text-slate-900">
                {activeStaffCall.dispatchedByName}
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Manager Instructions:
            </span>
            <p className="text-base font-semibold text-slate-800 whitespace-pre-wrap leading-relaxed">
              "{activeStaffCall.message || 'Report to Manager Station immediately for operational duty.'}"
            </p>
          </div>

          <p className="text-xs text-slate-500 text-center">
            Tap below to confirm receipt. The dispatching manager will immediately receive your acknowledgement in real-time.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={handleAcknowledge}
              disabled={isSubmitting}
              className="flex-1 py-3.5 px-6 rounded-2xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-extrabold text-base shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>{isSubmitting ? 'Acknowledging...' : 'Acknowledge & Confirm'}</span>
            </button>
            <button
              type="button"
              onClick={dismissActiveStaffCallModal}
              disabled={isSubmitting}
              className="py-3.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm transition-all cursor-pointer"
            >
              Dismiss Alert
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
