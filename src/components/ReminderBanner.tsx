import React, { useState } from 'react';
import { ActionableReminder } from '../utils/reminderEngine';
import { AlertCircle, Clock, ArrowRight, X, Volume2, Bell } from 'lucide-react';

interface ReminderBannerProps {
  reminders: ActionableReminder[];
  onSelectReminder: (reminder: ActionableReminder) => void;
  onDismiss?: (reminderId: string) => void;
}

export const ReminderBanner: React.FC<ReminderBannerProps> = ({
  reminders,
  onSelectReminder,
  onDismiss,
}) => {
  const [dismissedIds, setDismissedIds] = useState<Record<string, boolean>>({});

  const activeReminders = reminders.filter(r => !dismissedIds[r.id]);
  if (activeReminders.length === 0) return null;

  const top = activeReminders[0];
  const isOverdue = top.status === 'OVERDUE';
  const totalCount = activeReminders.length;

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissedIds(prev => ({ ...prev, [top.id]: true }));
    if (onDismiss) onDismiss(top.id);
  };

  return (
    <div className="w-full bg-slate-900 border-b-2 border-slate-700 shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Left Side: Status pill & description */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-xs font-black shrink-0 tracking-wide font-mono ${
            isOverdue
              ? 'bg-red-500 text-white animate-pulse'
              : 'bg-amber-400 text-slate-950'
          }`}>
            {isOverdue ? <AlertCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
            <span>{isOverdue ? 'ACTION OVERDUE' : 'DUE SOON'}</span>
          </div>

          <div className="truncate text-white text-xs md:text-sm font-medium">
            <span className="font-bold text-slate-100">{top.title}</span>
            <span className="hidden md:inline text-slate-400 ml-2">• {top.subtitle}</span>
          </div>
        </div>

        {/* Right Side: Total count & Action Button */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {totalCount > 1 && (
            <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-1 rounded-md border border-slate-700">
              +{totalCount - 1} more
            </span>
          )}

          <button
            onClick={() => onSelectReminder(top)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all shadow-xs cursor-pointer min-h-[36px] ${
              isOverdue
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
            }`}
          >
            <span>FIX / VIEW</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleDismiss}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
            title="Acknowledge & Dismiss Banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
