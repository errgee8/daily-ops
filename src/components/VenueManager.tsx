import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { VenueDefinition } from '../types';
import { Building2, Plus, Edit2, Trash2, Check, X, ShieldAlert, Sparkles, MapPin } from 'lucide-react';

export const VenueManager: React.FC = () => {
  const { venues, addVenue, editVenue, deleteVenue } = useData();

  const [isAddingVenue, setIsAddingVenue] = useState(false);
  const [editingVenue, setEditingVenue] = useState<VenueDefinition | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; isError?: boolean } | null>(null);
  const [venueToDelete, setVenueToDelete] = useState<VenueDefinition | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const showNotification = (text: string, isError = false) => {
    setFeedback({ text, isError });
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleStartAdd = () => {
    setName('');
    setCode('');
    setAddress('');
    setIsActive(true);
    setError(null);
    setIsAddingVenue(true);
    setEditingVenue(null);
  };

  const handleStartEdit = (venue: VenueDefinition) => {
    setName(venue.name);
    setCode(venue.code || '');
    setAddress(venue.address || '');
    setIsActive(venue.isActive);
    setError(null);
    setEditingVenue(venue);
    setIsAddingVenue(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Venue name is required.');
      return;
    }

    try {
      if (editingVenue) {
        await editVenue(editingVenue.id, {
          name: trimmedName,
          code: code.trim().toUpperCase() || undefined,
          address: address.trim() || undefined,
          isActive
        });
        showNotification(`Venue "${trimmedName}" updated successfully.`);
        setEditingVenue(null);
      } else {
        await addVenue({
          name: trimmedName,
          code: code.trim().toUpperCase() || undefined,
          address: address.trim() || undefined,
          isActive
        });
        showNotification(`Venue "${trimmedName}" created successfully.`);
        setIsAddingVenue(false);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to save venue.');
    }
  };

  const handleDelete = (venue: VenueDefinition) => {
    if (venues.length <= 1) {
      showNotification('Cannot delete: You must keep at least 1 active venue in the system.', true);
      return;
    }
    setVenueToDelete(venue);
  };

  const handleConfirmDelete = async () => {
    if (!venueToDelete) return;
    try {
      setIsDeleting(true);
      await deleteVenue(venueToDelete.id);
      showNotification(`Venue "${venueToDelete.name}" deleted.`);
      setVenueToDelete(null);
    } catch (err: any) {
      showNotification(err?.message || 'Failed to delete venue.', true);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-orange-600" />
            <span>OPERATIONAL VENUES ({venues.length})</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage distinct hospitality locations (e.g. Lucky Cat, JPE KTV) with dedicated checklist areas, tasks, and issues.
          </p>
        </div>

        <button
          onClick={handleStartAdd}
          className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition-all min-h-[40px]"
          id="btn-add-venue"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Venue</span>
        </button>
      </div>

      {feedback && (
        <div className={`p-3 border text-xs font-bold rounded-xl flex items-center gap-2 ${
          feedback.isError
            ? 'bg-red-50 border-red-200 text-red-800'
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          {feedback.isError ? (
            <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
          ) : (
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Add / Edit Form Modal or Inline Card */}
      {(isAddingVenue || editingVenue) && (
        <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl border-2 border-orange-400 shadow-md space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-orange-500" />
              <span>{editingVenue ? `Edit Venue: ${editingVenue.name}` : 'Create New Venue'}</span>
            </h3>
            <button
              type="button"
              onClick={() => {
                setIsAddingVenue(false);
                setEditingVenue(null);
              }}
              className="text-slate-400 hover:text-slate-700 p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-xs font-bold rounded-xl border border-red-200 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Venue Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. LUCKY CAT or JPE KTV"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Short Code (Optional)
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. LC or KTV"
                maxLength={6}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono font-bold text-slate-900 uppercase focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Location Address / Building Details
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Building A, Level 2"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-slate-300"
              />
              <span>Venue Active for Daily Operations</span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsAddingVenue(false);
                  setEditingVenue(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 shadow cursor-pointer"
              >
                Save Venue
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Venues Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {venues.map(v => (
          <div
            key={v.id}
            className="bg-white p-5 rounded-2xl border-2 border-slate-200 hover:border-slate-300 transition-all shadow-2xs flex flex-col justify-between"
            id={`venue-card-${v.id}`}
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-orange-50 text-orange-600 rounded-xl border border-orange-200">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">{v.name}</h3>
                    {v.code && (
                      <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        CODE: {v.code}
                      </span>
                    )}
                  </div>
                </div>

                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  v.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                }`}>
                  {v.isActive ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>

              {v.address && (
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{v.address}</span>
                </p>
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => handleStartEdit(v)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
              <button
                onClick={() => handleDelete(v)}
                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Delete Venue Confirmation Modal */}
      {venueToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border-2 border-red-200 animate-in zoom-in-95 duration-150">
            <div className="p-5 bg-red-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-red-700/50 rounded-xl">
                  <Trash2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight">Delete Venue</h3>
                  <p className="text-xs text-red-100">Venue Configuration</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVenueToDelete(null)}
                className="text-white/70 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3">
              <p className="text-sm font-bold text-slate-900">
                Are you sure you want to delete venue <span className="text-red-600 underline">&ldquo;{venueToDelete.name}&rdquo;</span>?
              </p>
              <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed">
                This will remove the venue profile. Make sure all checklist areas for this venue have been re-assigned or cleared.
              </p>
            </div>

            <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setVenueToDelete(null)}
                className="px-4 py-2.5 bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black shadow cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Venue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
