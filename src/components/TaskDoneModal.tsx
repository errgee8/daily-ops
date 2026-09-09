import React, { useState } from 'react';
import { DailyTask } from '../types';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { X, CheckCircle2, MessageSquare } from 'lucide-react';

interface TaskDoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: DailyTask | null;
}

export const TaskDoneModal: React.FC<TaskDoneModalProps> = ({
  isOpen,
  onClose,
  task
}) => {
  const { currentUser } = useAuth();
  const { markDailyTaskDone } = useData();

  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !task) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setIsSubmitting(true);
    try {
      await markDailyTaskDone(task.id, currentUser, note.trim() || undefined);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        id="modal-task-done"
      >
        {/* Header */}
        <div className="bg-emerald-600 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Complete Task</h2>
              <p className="text-xs text-emerald-100">Confirm task completion</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-emerald-200 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Target Task Summary */}
          <div className="p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-xl">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block mb-1">Task</span>
            <p className="font-bold text-slate-900 text-sm">{task.title}</p>
            {task.notes && (
              <p className="text-xs text-slate-600 mt-1 italic">"{task.notes}"</p>
            )}
          </div>

          {/* Completion Note */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-slate-500" />
              Completion Note (Optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="e.g. Completed as instructed. Checked storage temperatures and restocked supplies."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              autoFocus
            />
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 shadow-md transition-all cursor-pointer flex items-center gap-2"
              id="btn-confirm-task-done"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : 'Mark as DONE'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
