import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { BlueprintTemplate, CriterionTemplate } from '../types';
import { 
  Sparkles, 
  Plus, 
  Edit2, 
  Trash2, 
  Copy, 
  Check, 
  X, 
  ShieldAlert, 
  Layers, 
  Tag, 
  ChevronRight, 
  FolderPlus, 
  HelpCircle 
} from 'lucide-react';

export const BlueprintManager: React.FC = () => {
  const { blueprints, addBlueprint, editBlueprint, deleteBlueprint, template } = useData();

  const [isCreating, setIsCreating] = useState(false);
  const [editingBlueprint, setEditingBlueprint] = useState<BlueprintTemplate | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('KTV');
  const [defaultNamePrefix, setDefaultNamePrefix] = useState('Room ');
  const [criteria, setCriteria] = useState<CriterionTemplate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; isError?: boolean } | null>(null);
  const [blueprintToDelete, setBlueprintToDelete] = useState<BlueprintTemplate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const showNotification = (text: string, isError = false) => {
    setFeedback({ text, isError });
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleStartCreate = () => {
    setName('');
    setDescription('');
    setCategory('ROOM');
    setDefaultNamePrefix('Room ');
    setCriteria([
      {
        id: `crit_${Date.now()}_1`,
        name: 'General Cleanliness',
        defaultDepartmentId: template.departments[0]?.id || 'dept-hk',
        predefinedReasons: ['DIRTY', 'DUST', 'STAIN', 'TRASH NOT EMPTIED']
      },
      {
        id: `crit_${Date.now()}_2`,
        name: 'Lighting & Electronics',
        defaultDepartmentId: template.departments[1]?.id || 'dept-eng',
        predefinedReasons: ['NOT WORKING', 'FLICKERING', 'BROKEN FIXTURE']
      }
    ]);
    setError(null);
    setIsCreating(true);
    setEditingBlueprint(null);
  };

  const handleStartEdit = (bp: BlueprintTemplate) => {
    setName(bp.name);
    setDescription(bp.description || '');
    setCategory(bp.category);
    setDefaultNamePrefix(bp.defaultNamePrefix);
    setCriteria(JSON.parse(JSON.stringify(bp.criteria)));
    setError(null);
    setEditingBlueprint(bp);
    setIsCreating(false);
  };

  const handleDuplicate = async (bp: BlueprintTemplate) => {
    try {
      await addBlueprint({
        name: `${bp.name} (Copy)`,
        description: bp.description,
        category: bp.category,
        defaultNamePrefix: bp.defaultNamePrefix,
        criteria: JSON.parse(JSON.stringify(bp.criteria))
      });
      showNotification(`Duplicated blueprint "${bp.name}".`);
    } catch (err: any) {
      showNotification(err?.message || 'Failed to duplicate blueprint.', true);
    }
  };

  const handleDelete = (bp: BlueprintTemplate) => {
    if (blueprints.length <= 1) {
      showNotification('Cannot delete: You must keep at least 1 blueprint in the library.', true);
      return;
    }
    setBlueprintToDelete(bp);
  };

  const handleConfirmDelete = async () => {
    if (!blueprintToDelete) return;
    try {
      setIsDeleting(true);
      await deleteBlueprint(blueprintToDelete.id);
      showNotification(`Deleted blueprint "${blueprintToDelete.name}".`);
      setBlueprintToDelete(null);
    } catch (err: any) {
      showNotification(err?.message || 'Failed to delete blueprint.', true);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddCriterion = () => {
    const newCrit: CriterionTemplate = {
      id: `crit_${Date.now()}`,
      name: 'New Inspection Item',
      defaultDepartmentId: template.departments[0]?.id || 'dept-hk',
      predefinedReasons: ['DEFECT / NOT READY', 'DIRTY', 'DAMAGED']
    };
    setCriteria([...criteria, newCrit]);
  };

  const handleRemoveCriterion = (critId: string) => {
    if (criteria.length <= 1) {
      setError('A blueprint must have at least 1 inspection criterion.');
      return;
    }
    setCriteria(criteria.filter(c => c.id !== critId));
  };

  const handleAddReason = (critId: string, reason: string) => {
    const trimmed = reason.trim().toUpperCase();
    if (!trimmed) return;
    setCriteria(criteria.map(c => {
      if (c.id === critId && !c.predefinedReasons.includes(trimmed)) {
        return { ...c, predefinedReasons: [...c.predefinedReasons, trimmed] };
      }
      return c;
    }));
  };

  const handleRemoveReason = (critId: string, reason: string) => {
    setCriteria(criteria.map(c => {
      if (c.id === critId) {
        return { ...c, predefinedReasons: c.predefinedReasons.filter(r => r !== reason) };
      }
      return c;
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Blueprint name is required.');
      return;
    }
    if (criteria.length === 0) {
      setError('Please add at least one criterion.');
      return;
    }

    try {
      if (editingBlueprint) {
        await editBlueprint(editingBlueprint.id, {
          name: trimmedName,
          description: description.trim() || undefined,
          category: category.trim().toUpperCase(),
          defaultNamePrefix: defaultNamePrefix.trim() || 'Room ',
          criteria
        });
        showNotification(`Updated blueprint "${trimmedName}".`);
        setEditingBlueprint(null);
      } else {
        await addBlueprint({
          name: trimmedName,
          description: description.trim() || undefined,
          category: category.trim().toUpperCase(),
          defaultNamePrefix: defaultNamePrefix.trim() || 'Room ',
          criteria
        });
        showNotification(`Created new blueprint "${trimmedName}".`);
        setIsCreating(false);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to save blueprint.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-orange-600" />
            <span>REUSABLE BLUEPRINT LIBRARY ({blueprints.length})</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pre-configured checklists and 1-tap defect reasons for rapid room, bar, table, and facility generation.
          </p>
        </div>

        <button
          onClick={handleStartCreate}
          className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition-all min-h-[40px]"
          id="btn-new-blueprint"
        >
          <Plus className="w-4 h-4" />
          <span>New Blueprint</span>
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

      {/* Add / Edit Form Modal */}
      {(isCreating || editingBlueprint) && (
        <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl border-2 border-orange-400 shadow-xl space-y-5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-orange-500" />
              <span>{editingBlueprint ? `Edit Blueprint: ${editingBlueprint.name}` : 'Create New Blueprint'}</span>
            </h3>
            <button
              type="button"
              onClick={() => {
                setIsCreating(false);
                setEditingBlueprint(null);
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Blueprint Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. VIP KTV Room Standard"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Category
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value.toUpperCase())}
                placeholder="e.g. KTV, BAR, RESTROOM, DINING"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Default Name Prefix
              </label>
              <input
                type="text"
                value={defaultNamePrefix}
                onChange={(e) => setDefaultNamePrefix(e.target.value)}
                placeholder="e.g. Room , Table , VIP "
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Description (Optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of when to use this blueprint..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>

          {/* Criteria Editor */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold font-mono text-slate-700 uppercase tracking-wider">
                Inspection Criteria & Predefined 1-Tap Defect Reasons ({criteria.length})
              </h4>
              <button
                type="button"
                onClick={handleAddCriterion}
                className="px-3 py-1 bg-orange-100 hover:bg-orange-200 text-orange-800 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Criterion</span>
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {criteria.map((crit, idx) => (
                <div key={crit.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">
                          Criterion #{idx + 1} Name
                        </label>
                        <input
                          type="text"
                          value={crit.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCriteria(criteria.map(c => c.id === crit.id ? { ...c, name: val } : c));
                          }}
                          placeholder="e.g. Microphones & Sound System"
                          className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 text-xs font-bold text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">
                          Default Responsible Division
                        </label>
                        <select
                          value={crit.defaultDepartmentId}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCriteria(criteria.map(c => c.id === crit.id ? { ...c, defaultDepartmentId: val } : c));
                          }}
                          className="w-full px-3 py-2 bg-white rounded-xl border border-slate-300 text-xs font-semibold text-slate-900"
                        >
                          {template.departments.map(dept => (
                            <option key={dept.id} value={dept.id}>
                              {dept.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveCriterion(crit.id)}
                      className="p-2 text-slate-400 hover:text-red-600 rounded-lg"
                      title="Remove criterion"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Predefined 1-Tap Defect Reasons */}
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                      1-Tap Quick Defect Tags:
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      {crit.predefinedReasons.map(r => (
                        <span key={r} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white border border-slate-300 text-slate-800">
                          <span>{r}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveReason(crit.id, r)}
                            className="text-slate-400 hover:text-red-600"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Add quick defect tag..."
                        id={`input-reason-${crit.id}`}
                        className="px-2.5 py-1.5 bg-white rounded-lg border border-slate-300 text-xs font-medium text-slate-800"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddReason(crit.id, e.currentTarget.value);
                            e.currentTarget.value = '';
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const input = document.getElementById(`input-reason-${crit.id}`) as HTMLInputElement;
                          if (input && input.value) {
                            handleAddReason(crit.id, input.value);
                            input.value = '';
                          }
                        }}
                        className="px-2.5 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-900"
                      >
                        + Add Tag
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => {
                setIsCreating(false);
                setEditingBlueprint(null);
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 shadow cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Save Blueprint</span>
            </button>
          </div>
        </form>
      )}

      {/* Blueprint Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {blueprints.map(bp => (
          <div
            key={bp.id}
            className="bg-white p-5 rounded-2xl border-2 border-slate-200 hover:border-slate-300 transition-all shadow-2xs flex flex-col justify-between"
            id={`blueprint-card-${bp.id}`}
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <span className="text-[10px] font-mono font-black uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {bp.category}
                  </span>
                  <h3 className="text-base font-black text-slate-900 mt-1.5">{bp.name}</h3>
                </div>
                <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  {bp.criteria.length} criteria
                </span>
              </div>

              {bp.description && (
                <p className="text-xs text-slate-500 mb-3">{bp.description}</p>
              )}

              {/* Criteria Preview List */}
              <div className="space-y-1.5 my-3">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Included Criteria:</span>
                <ul className="space-y-1">
                  {bp.criteria.slice(0, 4).map(c => (
                    <li key={c.id} className="text-xs text-slate-700 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                      <span className="font-medium truncate">{c.name}</span>
                      <span className="text-[10px] font-mono text-slate-400">({c.predefinedReasons.length} tags)</span>
                    </li>
                  ))}
                  {bp.criteria.length > 4 && (
                    <li className="text-[11px] text-slate-400 font-mono italic">
                      + {bp.criteria.length - 4} more criteria
                    </li>
                  )}
                </ul>
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-400 font-bold">
                Pattern: {bp.defaultNamePrefix}##
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleDuplicate(bp)}
                  className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
                  title="Duplicate Blueprint"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleStartEdit(bp)}
                  className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
                  title="Edit Blueprint"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(bp)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                  title="Delete Blueprint"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Delete Blueprint Confirmation Modal */}
      {blueprintToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border-2 border-red-200 animate-in zoom-in-95 duration-150">
            <div className="p-5 bg-red-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-red-700/50 rounded-xl">
                  <Trash2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight">Delete Blueprint Preset</h3>
                  <p className="text-xs text-red-100">Library Configuration</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBlueprintToDelete(null)}
                className="text-white/70 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3">
              <p className="text-sm font-bold text-slate-900">
                Are you sure you want to delete blueprint <span className="text-red-600 underline">&ldquo;{blueprintToDelete.name}&rdquo;</span>?
              </p>
              <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed">
                Existing checklist items created from this blueprint will NOT be affected, but this blueprint will no longer appear in the bulk generator or item creator.
              </p>
            </div>

            <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setBlueprintToDelete(null)}
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
                {isDeleting ? 'Deleting...' : 'Yes, Delete Blueprint'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
