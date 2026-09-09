import React, { useState, useEffect } from 'react';
import { DailyTask, TaskPriority } from '../types';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { X, Plus, Edit2, AlertCircle, Calendar, Flag, AlignLeft, CheckCircle2 } from 'lucide-react';

interface DailyTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskToEdit?: DailyTask | null;
  defaultDate?: string;
}

export const DailyTaskModal: React.FC<DailyTaskModalProps> = ({
  isOpen,
  onClose,
  taskToEdit,
  defaultDate
}) => {
  const { currentUser, users } = useAuth();
  const { todayDate, createDailyTask, updateDailyTask, venues } = useData();

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('NORMAL');
  const [date, setDate] = useState(todayDate);
  const [selectedVenueId, setSelectedVenueId] = useState<string>('ALL');
  const [assignedToUserId, setAssignedToUserId] = useState<string>('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (taskToEdit) {
        setTitle(taskToEdit.title);
        setNotes(taskToEdit.notes || '');
        setPriority(taskToEdit.priority);
        setDate(taskToEdit.date);
        setSelectedVenueId(taskToEdit.venueId || 'ALL');
        setAssignedToUserId(taskToEdit.assignedToUserId || '');
      } else {
        setTitle('');
        setNotes('');
        setPriority('NORMAL');
        setDate(defaultDate || todayDate);
        setSelectedVenueId('ALL');
        setAssignedToUserId('');
      }
      setError('');
      setIsSubmitting(false);
    }
  }, [isOpen, taskToEdit, defaultDate, todayDate]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Please enter a task title or description.');
      return;
    }

    const matchedVenue = venues.find(v => v.id === selectedVenueId);
    const assignee = users.find(user => user.id === assignedToUserId);

    setIsSubmitting(true);
    try {
      if (taskToEdit) {
        await updateDailyTask(
          taskToEdit.id,
          {
            title: trimmedTitle,
            notes: notes.trim() || undefined,
            priority,
            venueId: selectedVenueId !== 'ALL' ? selectedVenueId : undefined,
            venueName: matchedVenue ? matchedVenue.name : undefined
            ,assignedToUserId: assignee?.id, assignedToName: assignee?.name
          },
          currentUser
        );
      } else {
        await createDailyTask(
          {
            title: trimmedTitle,
            notes: notes.trim() || undefined,
            priority,
            date,
            venueId: selectedVenueId !== 'ALL' ? selectedVenueId : undefined,
            venueName: matchedVenue ? matchedVenue.name : undefined
            ,assignedToUserId: assignee?.id, assignedToName: assignee?.name
          },
          currentUser
        );
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save task. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const priorityOptions: { value: TaskPriority; label: string; bg: string; text: string; border: string }[] = [
    { value: 'LOW', label: 'Low', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
    { value: 'NORMAL', label: 'Normal', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300' },
    { value: 'HIGH', label: 'High', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-300' },
    { value: 'URGENT', label: 'Urgent', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        id="modal-daily-task"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-600 flex items-center justify-center text-white">
              {taskToEdit ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {taskToEdit ? 'Edit AM Daily Task' : 'New Manager → AM Task'}
              </h2>
              <p className="text-xs text-slate-300">
                Direct assignment for Assistant Manager operational duties
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2.5 text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Date & Venue Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-500" />
                Task Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={!!taskToEdit}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                  taskToEdit 
                    ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed' 
                    : 'bg-white text-slate-900 border-slate-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500'
                }`}
                id="input-task-date"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Target Venue
              </label>
              <select
                value={selectedVenueId}
                onChange={(e) => setSelectedVenueId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                id="input-task-venue"
              >
                <option value="ALL">All Venues / General</option>
                {venues.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Task Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Assign to staff (optional)</label>
            <select value={assignedToUserId} onChange={(e) => setAssignedToUserId(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-900">
              <option value="">Any staff / team</option>
              {users.filter(user => user.status !== 'INACTIVE').map(user => <option key={user.id} value={user.id}>{user.name} · {user.role}</option>)}
            </select>
          </div>

          {/* Task Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-orange-600" />
              Task Title / Action Item <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError('');
              }}
              placeholder="e.g. Deep clean beer lines in Main Bar"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              id="input-task-title"
              autoFocus
            />
          </div>

          {/* Priority Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Flag className="w-4 h-4 text-slate-500" />
              Priority Level
            </label>
            <div className="grid grid-cols-4 gap-2">
              {priorityOptions.map((opt) => {
                const isSelected = priority === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPriority(opt.value)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all text-center flex flex-col items-center gap-1 cursor-pointer ${
                      isSelected
                        ? `${opt.bg} ${opt.text} ${opt.border} ring-2 ring-orange-500 shadow-sm font-extrabold`
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Special Instructions / Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <AlignLeft className="w-4 h-4 text-slate-500" />
              Special Instructions / Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Provide context, required supplies, or specific deadlines for the Assistant Manager..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              id="input-task-notes"
            />
          </div>

          {/* Creator Attribution */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center justify-between">
            <span className="font-medium">Assigned by:</span>
            <span className="font-bold text-slate-800">{currentUser.name} (General Manager)</span>
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
              disabled={isSubmitting || !title.trim()}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all cursor-pointer flex items-center gap-2"
              id="btn-save-daily-task"
            >
              {isSubmitting ? (
                <span>Saving...</span>
              ) : taskToEdit ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Update Task</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Assign Task</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
