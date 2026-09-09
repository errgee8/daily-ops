import React, { useState } from 'react';
import { DailyTask } from '../types';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { X, XCircle, AlertCircle, MessageSquare } from 'lucide-react';

interface TaskNotDoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: DailyTask | null;
}

const COMMON_REASONS = [
  'Out of supplies / stock',
  'Awaiting vendor / external contractor',
  'Insufficient shift time / high venue volume',
  'Equipment malfunctioning / broken',
  'Manager approval required',
  'Safety concern / hazardous condition',
  'Other (specify below)'
];

export const TaskNotDoneModal: React.FC<TaskNotDoneModalProps> = ({
  isOpen,
  onClose,
  task
}) => {
  const { currentUser } = useAuth();
  const { markDailyTaskNotDone } = useData();

  const [selectedReason, setSelectedReason] = useState(COMMON_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !task) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason = selectedReason === 'Other (specify below)' 
      ? customReason.trim() 
      : selectedReason;

    if (!finalReason) {
      setError('Please provide a reason why this task could not be completed.');
      return;
    }

    setIsSubmitting(true);
    try {
      await markDailyTaskNotDone(task.id, finalReason, note.trim() || undefined, currentUser || undefined);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update task status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        id="modal-task-not-done"
      >
        {/* Header */}
        <div className="bg-red-700 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Mark Task As Not Done</h2>
              <p className="text-xs text-red-100">Log why this task could not be fulfilled today</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-red-200 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Target Task Summary */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Target Task</span>
            <p className="font-bold text-slate-900 text-sm">{task.title}</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2.5 text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Reason Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select Primary Reason <span className="text-red-500">*</span>
            </label>
            <div className="space-y-1.5">
              {COMMON_REASONS.map((r) => {
                const isSelected = selectedReason === r;
                return (
                  <label
                    key={r}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-red-50/70 border-red-300 text-red-950 font-bold'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reason"
                      value={r}
                      checked={isSelected}
                      onChange={() => {
                        setSelectedReason(r);
                        if (error) setError('');
                      }}
                      className="text-red-600 focus:ring-red-500 h-4 w-4"
                    />
                    <span>{r}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Custom Reason Input if 'Other' is chosen */}
          {selectedReason === 'Other (specify below)' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Specify Reason <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={customReason}
                onChange={(e) => {
                  setCustomReason(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Briefly state the specific impediment..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                autoFocus
              />
            </div>
          )}

          {/* Detailed Explanation / Handover Note */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-slate-500" />
              Additional Details / Follow-up Note (Optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Provide additional context for the Manager's shift review..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-red-500 focus:border-red-500"
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
              disabled={isSubmitting || (selectedReason === 'Other (specify below)' && !customReason.trim())}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all cursor-pointer flex items-center gap-2"
              id="btn-confirm-task-not-done"
            >
              <XCircle className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : 'Submit Not Done Status'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
