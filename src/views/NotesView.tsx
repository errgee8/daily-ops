import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { ShiftNote } from '../types';
import { formatDate } from '../utils/crypto';
import { soundSynth } from '../utils/audio';
import { 
  StickyNote, 
  Plus, 
  Clock, 
  User, 
  CheckCircle2, 
  PlayCircle, 
  AlertCircle, 
  Check, 
  Trash2, 
  Sparkles,
  Calendar,
  Layers,
  Filter,
  X
} from 'lucide-react';

export const NotesView: React.FC = () => {
  const { currentUser, isManager, isAssistantManager } = useAuth();
  const { shiftNotes, todayDate, addShiftNote, updateShiftNoteStatus, deleteShiftNote } = useData();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<'GENERAL' | 'MAINTENANCE' | 'HANDOVER' | 'URGENT'>('GENERAL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'OPEN' | 'IN_PROGRESS' | 'DONE'>('ALL');
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const [noteFormError, setNoteFormError] = useState<string | null>(null);

  // Filtered Notes
  const filteredNotes = useMemo(() => {
    return shiftNotes.filter(note => {
      if (filterStatus !== 'ALL' && note.status !== filterStatus) return false;
      return true;
    }).sort((a, b) => {
      // OPEN and IN_PROGRESS first, then newest
      const weight = { OPEN: 3, IN_PROGRESS: 2, DONE: 1 };
      const wDiff = (weight[b.status] || 0) - (weight[a.status] || 0);
      if (wDiff !== 0) return wDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [shiftNotes, filterStatus]);

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    setNoteFormError(null);
    if (!content.trim() || !currentUser) return;
    try {
      soundSynth.playSuccess();
      await addShiftNote({
        content: content.trim(),
        category,
        authorId: currentUser.id,
        authorName: currentUser.name,
        authorRole: currentUser.role,
        status: 'OPEN',
      });
      setContent('');
      setCategory('GENERAL');
      setIsAddModalOpen(false);
    } catch (err: any) {
      setNoteFormError(err?.message || 'Something went wrong while saving note.');
    }
  };

  const handleStatusChange = async (noteId: string, newStatus: 'OPEN' | 'IN_PROGRESS' | 'DONE') => {
    if (!currentUser) return;
    soundSynth.playTap();
    if (newStatus === 'DONE') {
      soundSynth.playSuccess();
    }
    await updateShiftNoteStatus(noteId, newStatus, currentUser.name);
  };

  const handleDelete = (noteId: string) => {
    setNoteToDelete(noteId);
  };

  const handleConfirmDeleteNote = async () => {
    if (!noteToDelete) return;
    await deleteShiftNote(noteToDelete);
    setNoteToDelete(null);
  };

  // Format time (e.g. "19:20")
  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return '';
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5 select-none animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-500 uppercase tracking-wider mb-1">
            <StickyNote className="w-4 h-4 text-orange-500" />
            <span>OPERATIONAL NOTES & SHIFT INSTRUCTIONS</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Team Shift Notes</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Clear, actionable instructions for the current and incoming shift.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            soundSynth.playTap();
            setIsAddModalOpen(true);
          }}
          className="px-5 py-3 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-black rounded-xl text-sm flex items-center justify-center gap-2 shadow cursor-pointer min-h-[44px]"
        >
          <Plus className="w-5 h-5" />
          <span>+ ADD NOTE</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {(['ALL', 'OPEN', 'IN_PROGRESS', 'DONE'] as const).map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => {
              soundSynth.playTap();
              setFilterStatus(tab);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-black tracking-wide font-mono cursor-pointer transition-colors min-h-[38px] ${
              filterStatus === tab
                ? 'bg-slate-900 text-white'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            {tab.replace('_', ' ')}
            {tab !== 'ALL' && (
              <span className="ml-1.5 opacity-70">
                ({shiftNotes.filter(n => n.status === tab).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notes List */}
      {filteredNotes.length === 0 ? (
        <div className="bg-white border-2 border-slate-200 rounded-3xl p-10 text-center space-y-2">
          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
            <StickyNote className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-black text-slate-800">No Notes in this view</h3>
          <p className="text-xs text-slate-500">Tap "+ ADD NOTE" to create an operational instruction for the team.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredNotes.map(note => {
            const isOpen = note.status === 'OPEN';
            const isInProgress = note.status === 'IN_PROGRESS';
            const isDone = note.status === 'DONE';

            return (
              <div
                key={note.id}
                className={`p-5 rounded-2xl border-2 transition-all flex flex-col justify-between shadow-2xs ${
                  isOpen
                    ? 'bg-white border-red-200 hover:border-red-300'
                    : isInProgress
                    ? 'bg-amber-50/40 border-amber-200'
                    : 'bg-slate-50/70 border-slate-200 opacity-80'
                }`}
              >
                {/* Top Section: WHO & WHEN */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-xs">
                        {note.authorName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-black text-slate-900">{note.authorName}</div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase font-mono">
                          {note.authorRole === 'MANAGER' ? 'Manager' : 'Assistant Manager'}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-mono font-black text-slate-700">
                        {formatTime(note.createdAt)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {formatDate(note.date)}
                      </div>
                    </div>
                  </div>

                  {/* WHAT (The Note Body) */}
                  <div className="text-base font-bold text-slate-900 leading-snug">
                    {note.content}
                  </div>
                </div>

                {/* Bottom Section: STATUS & ACTION BUTTON */}
                <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-black font-mono px-2.5 py-1 rounded-lg border ${
                      isOpen
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : isInProgress
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    }`}>
                      {isOpen ? '🔴 OPEN' : isInProgress ? '🟡 IN PROGRESS' : '🟢 DONE'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isOpen && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(note.id, 'IN_PROGRESS')}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg cursor-pointer min-h-[36px]"
                      >
                        [ START ]
                      </button>
                    )}

                    {!isDone && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(note.id, 'DONE')}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-lg shadow-2xs flex items-center gap-1 cursor-pointer min-h-[36px]"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>[ MARK DONE ]</span>
                      </button>
                    )}

                    {isDone && note.completedByName && (
                      <span className="text-xs text-slate-500 font-medium">
                        ✓ Done by {note.completedByName}
                      </span>
                    )}

                    {isManager && (
                      <button
                        type="button"
                        onClick={() => handleDelete(note.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg cursor-pointer"
                        title="Delete Note"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE NOTE MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white border-2 border-slate-200 rounded-3xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-xl font-black text-slate-900">Add Operational Note</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-800 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNote} className="space-y-4">
              {noteFormError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl flex items-center gap-2">
                  <span>{noteFormError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase font-mono">
                  Instruction / Message (WHAT):
                </label>
                <textarea
                  rows={3}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="e.g. Check pool table 07 cloth condition after 22:00 closing..."
                  className="w-full bg-slate-50 text-slate-900 text-sm font-medium p-3 rounded-xl border border-slate-300 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase font-mono">Category:</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['GENERAL', 'MAINTENANCE', 'HANDOVER', 'URGENT'] as const).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold font-mono transition-colors cursor-pointer ${
                        category === cat
                          ? 'bg-orange-500 text-white'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white rounded-xl text-xs font-black shadow cursor-pointer min-h-[44px]"
                >
                  Save Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {noteToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border-2 border-red-200 animate-in zoom-in-95 duration-150">
            <div className="p-5 bg-red-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-white" />
                <h3 className="text-base font-black tracking-tight">Delete Shift Note</h3>
              </div>
              <button
                type="button"
                onClick={() => setNoteToDelete(null)}
                className="text-white/70 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm font-bold text-slate-800">
                Are you sure you want to remove this shift note? This action cannot be undone.
              </p>
            </div>
            <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setNoteToDelete(null)}
                className="px-4 py-2 bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteNote}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black shadow cursor-pointer"
              >
                Delete Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
