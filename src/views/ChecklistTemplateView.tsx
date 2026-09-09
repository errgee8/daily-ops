import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { AreaTemplate, ItemTemplate, CriterionTemplate, Department } from '../types';
import { VenueManager } from '../components/VenueManager';
import { BlueprintManager } from '../components/BlueprintManager';
import { 
  Layers, 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  Check, 
  Building2, 
  ListOrdered, 
  HelpCircle, 
  FolderPlus, 
  ChevronRight,
  ShieldAlert,
  Copy,
  Sparkles,
  BookmarkPlus
} from 'lucide-react';

export const ChecklistTemplateView: React.FC = () => {
  const { currentRole } = useAuth();
  const { 
    template, 
    updateVenueTemplate, 
    venues, 
    blueprints, 
    addBlueprint, 
    duplicateItem 
  } = useData();

  const isManager = currentRole === 'MANAGER';

  // Active Area selection
  const [selectedAreaId, setSelectedAreaId] = useState<string>(template.areas[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'AREAS_ITEMS' | 'BLUEPRINTS' | 'VENUES' | 'DEPARTMENTS'>('AREAS_ITEMS');

  // Modals / forms state
  const [newAreaName, setNewAreaName] = useState('');
  const [isAddingArea, setIsAddingArea] = useState(false);

  const [newItemName, setNewItemName] = useState('');
  const [selectedBlueprintId, setSelectedBlueprintId] = useState<string>('');
  const [isAddingItem, setIsAddingItem] = useState(false);

  // Bulk Generator State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkBlueprintId, setBulkBlueprintId] = useState<string>(blueprints[0]?.id || '');
  const [bulkPrefix, setBulkPrefix] = useState<string>('Room ');
  const [bulkNumberList, setBulkNumberList] = useState<string>('201, 202, 203, 205, 206');
  const [bulkStartNum, setBulkStartNum] = useState<number>(1);
  const [bulkEndNum, setBulkEndNum] = useState<number>(12);
  const [bulkExcludeList, setBulkExcludeList] = useState<string>('4');
  const [bulkMode, setBulkMode] = useState<'LIST' | 'RANGE'>('LIST');

  // Edit Area Modal
  const [editingArea, setEditingArea] = useState<{ id: string; name: string } | null>(null);

  // Edit Item Modal (including criteria and predefined reasons)
  const [editingItem, setEditingItem] = useState<ItemTemplate | null>(null);

  // New Department Modal
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptColor, setNewDeptColor] = useState('#3b82f6');
  const [isAddingDept, setIsAddingDept] = useState(false);

  // Save as Blueprint Modal State
  const [saveBlueprintItem, setSaveBlueprintItem] = useState<ItemTemplate | null>(null);
  const [bpFormName, setBpFormName] = useState('');
  const [bpFormCategory, setBpFormCategory] = useState('ROOM');
  const [bpFormPrefix, setBpFormPrefix] = useState('Room ');
  const [bpFormDescription, setBpFormDescription] = useState('');

  // Delete Confirmation Modal State (replaces window.confirm)
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    type: 'AREA' | 'ITEM' | 'DEPARTMENT';
    id: string;
    name: string;
    details?: string;
  } | null>(null);

  // Save / Error / Feedback status
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; isError: boolean } | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  const showNotification = (text: string, isError = false) => {
    setFeedback({ text, isError });
    setTimeout(() => {
      setFeedback(null);
    }, 4000);
  };

  if (!isManager) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4 text-slate-900">
        <div className="p-4 bg-red-100 text-red-600 rounded-2xl w-fit mx-auto border border-red-200">
          <ShieldAlert className="w-12 h-12" />
        </div>
        <h2 className="text-xl font-black text-slate-900">ACCESS RESTRICTED</h2>
        <p className="text-sm text-slate-600">
          Only the <strong>MANAGER</strong> has permission to modify checklist structure, venue areas, items, and department templates.
        </p>
      </div>
    );
  }

  const activeArea = template.areas.find(a => a.id === selectedAreaId) || template.areas[0];

  // AREA HANDLERS
  const handleAddArea = async () => {
    if (!newAreaName.trim()) return;
    try {
      setIsSaving(true);
      const areaId = `area_${Date.now()}`;
      const newArea: AreaTemplate = {
        id: areaId,
        name: newAreaName.trim(),
        order: template.areas.length + 1,
        items: [
          {
            id: `item_${Date.now()}_1`,
            name: `${newAreaName.trim()} 01`,
            areaId: areaId,
            order: 1,
            criteria: [
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
            ]
          }
        ]
      };

      const updated = {
        ...template,
        areas: [...template.areas, newArea]
      };
      await updateVenueTemplate(updated);
      setNewAreaName('');
      setIsAddingArea(false);
      setSelectedAreaId(newArea.id);
      showNotification(`Area "${newArea.name}" added successfully.`);
    } catch (err: any) {
      showNotification(err?.message || 'Failed to add area.', true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAreaName = async () => {
    if (!editingArea || !editingArea.name.trim()) return;
    try {
      setIsSaving(true);
      const updated = {
        ...template,
        areas: template.areas.map(a => a.id === editingArea.id ? { ...a, name: editingArea.name.trim() } : a)
      };
      await updateVenueTemplate(updated);
      showNotification(`Renamed area to "${editingArea.name.trim()}".`);
      setEditingArea(null);
    } catch (err: any) {
      showNotification(err?.message || 'Failed to rename area.', true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteArea = (areaId: string) => {
    if (template.areas.length <= 1) {
      showNotification('Cannot delete: You must keep at least 1 area in the template.', true);
      return;
    }
    const targetArea = template.areas.find(a => a.id === areaId);
    if (!targetArea) return;
    setDeleteConfirmModal({
      type: 'AREA',
      id: areaId,
      name: targetArea.name,
      details: `This will permanently delete the area "${targetArea.name}" and all ${targetArea.items.length} checklist items inside it.`
    });
  };

  // ITEM HANDLERS
  const handleAddItem = async () => {
    if (!newItemName.trim() || !activeArea) return;
    try {
      setIsSaving(true);
      const blueprint = blueprints.find(b => b.id === selectedBlueprintId);
      const criteriaToUse = blueprint?.criteria
        ? JSON.parse(JSON.stringify(blueprint.criteria))
        : activeArea.items[0]?.criteria
        ? JSON.parse(JSON.stringify(activeArea.items[0].criteria))
        : [
            {
              id: `crit_${Date.now()}_1`,
              name: 'Cleanliness',
              defaultDepartmentId: template.departments[0]?.id || 'dept-hk',
              predefinedReasons: ['DIRTY', 'TRASH', 'DUST']
            },
            {
              id: `crit_${Date.now()}_2`,
              name: 'Equipment / AC / Lights',
              defaultDepartmentId: template.departments[1]?.id || 'dept-eng',
              predefinedReasons: ['NOT WORKING', 'DAMAGED', 'LEAKING']
            }
          ];

      const newItem: ItemTemplate = {
        id: `item_${Date.now()}`,
        name: newItemName.trim(),
        areaId: activeArea.id,
        order: activeArea.items.length + 1,
        criteria: criteriaToUse
      };

      const updated = {
        ...template,
        areas: template.areas.map(a => a.id === activeArea.id ? { ...a, items: [...a.items, newItem] } : a)
      };
      await updateVenueTemplate(updated);
      setNewItemName('');
      setSelectedBlueprintId('');
      setIsAddingItem(false);
      showNotification(`Item "${newItem.name}" added to ${activeArea.name}.`);
    } catch (err: any) {
      showNotification(err?.message || 'Failed to add item.', true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDuplicateItem = async (item: ItemTemplate) => {
    if (!activeArea) return;
    try {
      setIsSaving(true);
      await duplicateItem(activeArea.id, item.id);
      showNotification(`Item "${item.name}" duplicated.`);
    } catch (err: any) {
      showNotification(err?.message || 'Failed to duplicate item.', true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveItemAsBlueprint = (item: ItemTemplate) => {
    setSaveBlueprintItem(item);
    setBpFormName(item.name);
    setBpFormCategory(activeArea?.name.toUpperCase() || 'ROOM');
    setBpFormPrefix(`${item.name.replace(/\d+$/, '')} `);
    setBpFormDescription(`Standard configuration with ${item.criteria.length} inspection criteria.`);
    setModalError(null);
  };

  const handleConfirmSaveBlueprint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveBlueprintItem) return;
    const trimmedName = bpFormName.trim();
    if (!trimmedName) {
      setModalError('Blueprint preset name is required.');
      return;
    }

    try {
      setIsSaving(true);
      await addBlueprint({
        name: trimmedName,
        category: bpFormCategory.trim().toUpperCase() || 'GENERAL',
        defaultNamePrefix: bpFormPrefix,
        description: bpFormDescription.trim() || undefined,
        venueCompatibility: ['ALL'],
        criteria: JSON.parse(JSON.stringify(saveBlueprintItem.criteria))
      });
      showNotification(`Blueprint "${trimmedName}" saved to Blueprint Library!`);
      setSaveBlueprintItem(null);
    } catch (err: any) {
      showNotification(err?.message || 'Failed to save blueprint.', true);
    } finally {
      setIsSaving(false);
    }
  };

  const getComputedBulkNumbers = (): string[] => {
    if (bulkMode === 'LIST') {
      return bulkNumberList
        .split(/[,\s]+/)
        .map(s => s.trim())
        .filter(Boolean);
    } else {
      const excludes = bulkExcludeList
        .split(/[,\s]+/)
        .map(s => s.trim())
        .filter(Boolean);
      const list: string[] = [];
      for (let i = bulkStartNum; i <= bulkEndNum; i++) {
        const strVal = String(i);
        const paddedVal = i < 10 && bulkStartNum < 10 ? String(i).padStart(2, '0') : String(i);
        if (!excludes.includes(strVal) && !excludes.includes(paddedVal)) {
          list.push(paddedVal);
        }
      }
      return list;
    }
  };

  const handleBulkGenerate = async () => {
    if (!activeArea) return;
    const computedNumbers = getComputedBulkNumbers();
    if (computedNumbers.length === 0) {
      showNotification('Please specify at least one valid item number.', true);
      return;
    }

    const blueprint = blueprints.find(b => b.id === bulkBlueprintId);
    const baseCriteria = blueprint?.criteria || activeArea.items[0]?.criteria || [
      {
        id: `crit_def_1`,
        name: 'Cleanliness',
        defaultDepartmentId: 'dept-hk',
        predefinedReasons: ['DIRTY', 'DUST', 'STAINS']
      }
    ];

    try {
      setIsSaving(true);
      const newItems: ItemTemplate[] = computedNumbers.map((num, idx) => ({
        id: `item_${Date.now()}_${idx}`,
        name: `${bulkPrefix}${num}`.trim(),
        areaId: activeArea.id,
        order: activeArea.items.length + idx + 1,
        // Deep clone so each item's criteria remains independently editable
        criteria: JSON.parse(JSON.stringify(baseCriteria)).map((c: CriterionTemplate, cIdx: number) => ({
          ...c,
          id: `crit_${Date.now()}_${idx}_${cIdx}`
        }))
      }));

      const updated = {
        ...template,
        areas: template.areas.map(a => a.id === activeArea.id ? { ...a, items: [...a.items, ...newItems] } : a)
      };

      await updateVenueTemplate(updated);
      setIsBulkModalOpen(false);
      showNotification(`Bulk generated ${newItems.length} items in ${activeArea.name} successfully.`);
    } catch (err: any) {
      showNotification(err?.message || 'Failed to bulk generate items.', true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteItem = (itemId: string) => {
    if (!activeArea) return;
    if (activeArea.items.length <= 1) {
      showNotification('Cannot delete: Each area must have at least 1 item.', true);
      return;
    }
    const targetItem = activeArea.items.find(it => it.id === itemId);
    if (!targetItem) return;
    setDeleteConfirmModal({
      type: 'ITEM',
      id: itemId,
      name: targetItem.name,
      details: `This will remove "${targetItem.name}" with its ${targetItem.criteria.length} inspection criteria from ${activeArea.name}.`
    });
  };

  const handleDeleteDepartment = (deptId: string) => {
    if (template.departments.length <= 1) {
      showNotification('Cannot delete: Must maintain at least 1 department.', true);
      return;
    }
    const targetDept = template.departments.find(d => d.id === deptId);
    if (!targetDept) return;
    setDeleteConfirmModal({
      type: 'DEPARTMENT',
      id: deptId,
      name: targetDept.name,
      details: `This will remove "${targetDept.name}" from the list of responsible divisions.`
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmModal) return;
    const { type, id, name } = deleteConfirmModal;
    try {
      setIsSaving(true);
      if (type === 'AREA') {
        const updated = {
          ...template,
          areas: template.areas.filter(a => a.id !== id)
        };
        await updateVenueTemplate(updated);
        setSelectedAreaId(updated.areas[0]?.id || '');
        showNotification(`Area "${name}" deleted successfully.`);
      } else if (type === 'ITEM') {
        if (!activeArea) return;
        const updated = {
          ...template,
          areas: template.areas.map(a => a.id === activeArea.id ? { ...a, items: a.items.filter(it => it.id !== id) } : a)
        };
        await updateVenueTemplate(updated);
        showNotification(`Item "${name}" deleted successfully.`);
      } else if (type === 'DEPARTMENT') {
        const updated = {
          ...template,
          departments: template.departments.filter(d => d.id !== id)
        };
        await updateVenueTemplate(updated);
        showNotification(`Department "${name}" deleted.`);
      }
      setDeleteConfirmModal(null);
    } catch (err: any) {
      showNotification(err?.message || 'Failed to delete.', true);
    } finally {
      setIsSaving(false);
    }
  };

  // ITEM EDIT MODAL CRITERIA HELPERS
  const handleSaveEditedItem = async () => {
    if (!editingItem || !activeArea) return;
    
    // 1. Validate Item Name
    const trimmedItemName = editingItem.name.trim();
    if (!trimmedItemName) {
      setModalError('Item name cannot be empty.');
      return;
    }

    // 2. Validate Criteria
    if (!editingItem.criteria || editingItem.criteria.length === 0) {
      setModalError('Item must have at least one inspection criterion.');
      return;
    }

    for (let i = 0; i < editingItem.criteria.length; i++) {
      if (!editingItem.criteria[i].name.trim()) {
        setModalError(`Criterion #${i + 1} must have a valid title.`);
        return;
      }
    }

    // Sanitize criteria list
    const sanitizedCriteria: CriterionTemplate[] = editingItem.criteria.map((crit, idx) => ({
      id: crit.id || `crit_${Date.now()}_${idx}`,
      name: crit.name.trim(),
      defaultDepartmentId: crit.defaultDepartmentId || template.departments[0]?.id || 'dept-hk',
      predefinedReasons: crit.predefinedReasons && crit.predefinedReasons.length > 0
        ? crit.predefinedReasons.map(r => r.trim()).filter(Boolean)
        : ['DEFECT / NOT READY', 'OTHER']
    }));

    const sanitizedItem: ItemTemplate = {
      ...editingItem,
      name: trimmedItemName,
      criteria: sanitizedCriteria
    };

    try {
      setIsSaving(true);
      setModalError(null);
      const updated = {
        ...template,
        areas: template.areas.map(a => a.id === activeArea.id ? {
          ...a,
          items: a.items.map(it => it.id === sanitizedItem.id ? sanitizedItem : it)
        } : a)
      };
      await updateVenueTemplate(updated);
      showNotification(`Saved criteria configuration for ${trimmedItemName} successfully.`);
      setEditingItem(null);
    } catch (err: any) {
      console.error('Failed to save edited item criteria:', err);
      setModalError(err?.message || 'Failed to save criteria. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCriterionToEditingItem = () => {
    if (!editingItem) return;
    setModalError(null);
    const newCrit: CriterionTemplate = {
      id: `crit_${Date.now()}`,
      name: 'New Criterion',
      defaultDepartmentId: template.departments[0]?.id || 'dept-hk',
      predefinedReasons: ['NOT WORKING', 'DIRTY', 'DAMAGED', 'OTHER']
    };
    setEditingItem({
      ...editingItem,
      criteria: [...editingItem.criteria, newCrit]
    });
  };

  const handleRemoveCriterionFromEditingItem = (critId: string) => {
    if (!editingItem) return;
    if (editingItem.criteria.length <= 1) {
      setModalError('Each item must maintain at least 1 criterion.');
      return;
    }
    setModalError(null);
    setEditingItem({
      ...editingItem,
      criteria: editingItem.criteria.filter(c => c.id !== critId)
    });
  };

  const handleAddReasonToCriterion = (critId: string, reason: string) => {
    if (!editingItem || !reason.trim()) return;
    setModalError(null);
    setEditingItem({
      ...editingItem,
      criteria: editingItem.criteria.map(c => {
        if (c.id === critId && !c.predefinedReasons.includes(reason.trim().toUpperCase())) {
          return { ...c, predefinedReasons: [...c.predefinedReasons, reason.trim().toUpperCase()] };
        }
        return c;
      })
    });
  };

  const handleRemoveReasonFromCriterion = (critId: string, reason: string) => {
    if (!editingItem) return;
    setModalError(null);
    setEditingItem({
      ...editingItem,
      criteria: editingItem.criteria.map(c => {
        if (c.id === critId) {
          return { ...c, predefinedReasons: c.predefinedReasons.filter(r => r !== reason) };
        }
        return c;
      })
    });
  };

  // DEPARTMENT HANDLERS
  const handleAddDepartment = async () => {
    if (!newDeptName.trim()) return;
    try {
      setIsSaving(true);
      const newDept: Department = {
        id: `dept_${Date.now()}`,
        name: newDeptName.trim(),
        color: newDeptColor
      };
      const updated = {
        ...template,
        departments: [...template.departments, newDept]
      };
      await updateVenueTemplate(updated);
      setNewDeptName('');
      setIsAddingDept(false);
      showNotification(`Department "${newDept.name}" added successfully.`);
    } catch (err: any) {
      showNotification(err?.message || 'Failed to add department.', true);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 select-none animate-in fade-in duration-150 text-slate-900">
      {/* Feedback banner */}
      {feedback && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-sm font-bold animate-in fade-in duration-150 ${
          feedback.isError
            ? 'bg-red-50 text-red-800 border-red-200'
            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.isError ? <ShieldAlert className="w-5 h-5 text-red-600" /> : <Check className="w-5 h-5 text-emerald-600" />}
            <span>{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs px-2 py-1 bg-white/60 hover:bg-white rounded-lg border border-current"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Title & Section Tabs */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Layers className="w-8 h-8 text-orange-600" />
            CHECKLIST & TEMPLATE SYSTEM
          </h1>
          <p className="text-xs md:text-sm text-slate-600">
            Manager control center for venue rooms, reusable blueprints, multi-location configuration, and department routing.
          </p>
        </div>

        <div className="flex flex-wrap items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-2xs gap-1">
          <button
            onClick={() => setActiveTab('AREAS_ITEMS')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer min-h-[40px] flex items-center gap-1.5 ${
              activeTab === 'AREAS_ITEMS' ? 'bg-orange-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>AREAS & ITEMS ({template.areas.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('BLUEPRINTS')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer min-h-[40px] flex items-center gap-1.5 ${
              activeTab === 'BLUEPRINTS' ? 'bg-orange-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>BLUEPRINTS ({blueprints.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('VENUES')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer min-h-[40px] flex items-center gap-1.5 ${
              activeTab === 'VENUES' ? 'bg-orange-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>VENUES ({venues.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('DEPARTMENTS')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer min-h-[40px] flex items-center gap-1.5 ${
              activeTab === 'DEPARTMENTS' ? 'bg-orange-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ListOrdered className="w-4 h-4" />
            <span>DIVISIONS ({template.departments.length})</span>
          </button>
        </div>
      </div>

      {activeTab === 'BLUEPRINTS' ? (
        <BlueprintManager />
      ) : activeTab === 'VENUES' ? (
        <VenueManager />
      ) : activeTab === 'AREAS_ITEMS' ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Areas Sidebar (Left 1 Col) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-mono font-bold text-slate-600 uppercase tracking-wider">
                VENUE AREAS ({template.areas.length})
              </h2>
              <button
                onClick={() => setIsAddingArea(true)}
                className="px-2.5 py-1 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg text-xs font-bold flex items-center gap-1 border border-orange-200 cursor-pointer min-h-[36px]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Area</span>
              </button>
            </div>

            {/* Add Area Inline Form */}
            {isAddingArea && (
              <div className="p-3 bg-white border-2 border-orange-400 rounded-2xl space-y-2 shadow-sm">
                <input
                  type="text"
                  value={newAreaName}
                  onChange={(e) => setNewAreaName(e.target.value)}
                  placeholder="e.g. VIP LOUNGE"
                  className="w-full bg-slate-50 text-slate-900 text-xs px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-orange-500 min-h-[40px] font-medium"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setIsAddingArea(false)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddArea}
                    disabled={!newAreaName.trim()}
                    className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold disabled:opacity-40 cursor-pointer"
                  >
                    Save Area
                  </button>
                </div>
              </div>
            )}

            {/* Area List */}
            <div className="space-y-2">
              {template.areas.map(area => {
                const isSelected = area.id === selectedAreaId;
                return (
                  <div
                    key={area.id}
                    className={`p-3.5 rounded-2xl border-2 transition-all flex items-center justify-between gap-2 min-h-[52px] ${
                      isSelected
                        ? 'bg-orange-50 border-orange-500 text-slate-900 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <button
                      onClick={() => setSelectedAreaId(area.id)}
                      className="flex-1 text-left font-black text-sm flex items-center gap-2 cursor-pointer text-slate-900"
                    >
                      <span>{area.name}</span>
                      <span className="text-xs text-slate-500 font-mono font-normal">
                        ({area.items.length})
                      </span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingArea({ id: area.id, name: area.name })}
                        className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg cursor-pointer"
                        title="Rename Area"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteArea(area.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg cursor-pointer"
                        title="Delete Area"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Items & Criteria in Selected Area (Right 3 Cols) */}
          <div className="lg:col-span-3 space-y-4">
            {activeArea ? (
              <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
                {/* Section Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
                  <div>
                    <div className="text-xs font-mono text-orange-600 font-bold uppercase tracking-wider">
                      MANAGING ITEMS FOR:
                    </div>
                    <h2 className="text-2xl font-black text-slate-900">{activeArea.name}</h2>
                    <p className="text-xs text-slate-500">
                      Each item inherits criteria and predefined 1-tap defect reasons for rapid inspection
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setIsBulkModalOpen(true);
                        const matchBp = blueprints.find(b => activeArea.name.toLowerCase().includes(b.category.toLowerCase())) || blueprints[0];
                        if (matchBp) {
                          setBulkBlueprintId(matchBp.id);
                          setBulkPrefix(matchBp.defaultNamePrefix);
                        }
                      }}
                      className="px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold border border-indigo-200 rounded-xl text-xs flex items-center gap-1.5 min-h-[44px] cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      <span>Bulk Generate</span>
                    </button>

                    <button
                      onClick={() => setIsAddingItem(true)}
                      className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow min-h-[44px] cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Item</span>
                    </button>
                  </div>
                </div>

                {/* Add Item Form */}
                {isAddingItem && (
                  <div className="p-4 bg-orange-50/60 border border-orange-200 rounded-2xl space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <h3 className="text-xs font-black text-orange-600 uppercase font-mono">New Item / Room Name</h3>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-600 font-medium">Blueprint:</span>
                        <select
                          value={selectedBlueprintId}
                          onChange={(e) => {
                            const bpId = e.target.value;
                            setSelectedBlueprintId(bpId);
                            const bp = blueprints.find(b => b.id === bpId);
                            if (bp && (!newItemName.trim() || blueprints.some(b2 => newItemName === b2.defaultNamePrefix))) {
                              setNewItemName(bp.defaultNamePrefix);
                            }
                          }}
                          className="bg-white text-slate-800 text-xs font-bold border border-slate-300 rounded-lg px-2.5 py-1.5 cursor-pointer"
                        >
                          <option value="">Custom (Clone previous item)</option>
                          {blueprints.map(bp => (
                            <option key={bp.id} value={bp.id}>
                              [{bp.category}] {bp.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <input
                      type="text"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      placeholder="e.g. ROOM 309, POOL TABLE 12, BAR"
                      className="w-full bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-orange-500 min-h-[44px] font-medium"
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setIsAddingItem(false);
                          setSelectedBlueprintId('');
                        }}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddItem}
                        disabled={!newItemName.trim()}
                        className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black disabled:opacity-40 cursor-pointer"
                      >
                        Add Item
                      </button>
                    </div>
                  </div>
                )}

                {/* Items Grid */}
                <div className="space-y-3">
                  {activeArea.items.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <h4 className="text-lg font-black text-slate-900">{item.name}</h4>
                          <span className="text-xs px-2 py-0.5 rounded bg-white text-slate-600 border border-slate-200 font-mono font-bold">
                            {item.criteria.length} Criteria
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 flex flex-wrap gap-1.5">
                          {item.criteria.map(c => (
                            <span key={c.id} className="px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200 text-[11px] font-medium">
                              {c.name}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => handleDuplicateItem(item)}
                          className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1 min-h-[40px] cursor-pointer shadow-2xs"
                          title="Duplicate Item"
                        >
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span>Duplicate</span>
                        </button>

                        <button
                          onClick={() => handleSaveItemAsBlueprint(item)}
                          className="px-3 py-2 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1 min-h-[40px] cursor-pointer shadow-2xs"
                          title="Save as Reusable Blueprint Preset"
                        >
                          <BookmarkPlus className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Save as Blueprint</span>
                        </button>

                        <button
                          onClick={() => setEditingItem(JSON.parse(JSON.stringify(item)))}
                          className="px-3.5 py-2 bg-white hover:bg-orange-50 text-orange-700 border border-orange-200 rounded-xl text-xs font-bold flex items-center gap-1.5 min-h-[40px] cursor-pointer shadow-2xs"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-orange-600" />
                          <span>Configure Criteria</span>
                        </button>

                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-2.5 bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-300 rounded-xl min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer shadow-2xs"
                          title="Delete Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 bg-white rounded-3xl border border-slate-200">
                Select an area to configure items.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* DEPARTMENTS CONFIGURATION */
        <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Building2 className="w-6 h-6 text-blue-600" />
                RESPONSIBLE OPERATIONAL DIVISIONS
              </h2>
              <p className="text-xs text-slate-500">
                Define the departments that receive task assignments when defects are logged
              </p>
            </div>

            <button
              onClick={() => setIsAddingDept(true)}
              className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow min-h-[44px] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Department</span>
            </button>
          </div>

          {isAddingDept && (
            <div className="p-4 bg-orange-50/60 border border-orange-200 rounded-2xl space-y-3 max-w-md">
              <h3 className="text-xs font-black text-orange-600 uppercase font-mono">Department Details</h3>
              <input
                type="text"
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                placeholder="e.g. IT & AUDIO-VISUAL"
                className="w-full bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-orange-500 min-h-[44px] font-medium"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsAddingDept(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddDepartment}
                  disabled={!newDeptName.trim()}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-black disabled:opacity-40 cursor-pointer"
                >
                  Save Department
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {template.departments.map((dept) => (
              <div
                key={dept.id}
                className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3 shadow-2xs"
              >
                <div className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full" style={{ backgroundColor: dept.color || '#3b82f6' }} />
                  <span className="font-bold text-slate-900 text-sm">{dept.name}</span>
                </div>

                <button
                  onClick={() => handleDeleteDepartment(dept.id)}
                  className="p-2 text-slate-400 hover:text-red-600 rounded-xl hover:bg-slate-200 cursor-pointer"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Area Name Modal */}
      {editingArea && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white border-2 border-slate-300 rounded-2xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-black text-slate-900">Rename Area</h3>
            <input
              type="text"
              value={editingArea.name}
              onChange={(e) => setEditingArea({ ...editingArea, name: e.target.value })}
              className="w-full bg-slate-50 text-slate-900 text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-orange-500 font-medium"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setEditingArea(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAreaName}
                className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-black cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Configure Item Criteria & Predefined Reasons Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-3xl max-h-[90vh] bg-white border-2 border-slate-300 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-900">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900">Configure Criteria for {editingItem.name}</h3>
                <p className="text-xs text-slate-500">Define evaluation checkpoints & 1-tap defect reasons</p>
              </div>
              <button onClick={() => setEditingItem(null)} className="p-2 text-slate-400 hover:text-slate-800 font-bold text-lg cursor-pointer">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Item Name Input */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase font-mono">Item Name</label>
                <input
                  type="text"
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="w-full bg-slate-50 text-slate-900 text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 font-medium"
                />
              </div>

              {/* Criteria List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider">
                    CRITERIA ({editingItem.criteria.length})
                  </span>
                  <button
                    onClick={handleAddCriterionToEditingItem}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Criterion
                  </button>
                </div>

                {editingItem.criteria.map((crit) => (
                  <div key={crit.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <input
                        type="text"
                        value={crit.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditingItem({
                            ...editingItem,
                            criteria: editingItem.criteria.map(c => c.id === crit.id ? { ...c, name: val } : c)
                          });
                        }}
                        className="flex-1 bg-white text-slate-900 font-bold text-sm px-3 py-2 rounded-xl border border-slate-300"
                      />

                      {/* Suggested Department Select */}
                      <select
                        value={crit.defaultDepartmentId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditingItem({
                            ...editingItem,
                            criteria: editingItem.criteria.map(c => c.id === crit.id ? { ...c, defaultDepartmentId: val } : c)
                          });
                        }}
                        className="bg-white text-slate-700 text-xs font-bold border border-slate-300 rounded-xl px-3 py-2 cursor-pointer"
                      >
                        {template.departments.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>

                      <button
                        onClick={() => handleRemoveCriterionFromEditingItem(crit.id)}
                        className="p-2 text-slate-400 hover:text-red-600 cursor-pointer"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Predefined Reasons Chips for this Criterion */}
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-bold text-slate-500 uppercase font-mono">Predefined 1-Tap Defect Reasons:</div>
                      <div className="flex flex-wrap gap-1.5">
                        {crit.predefinedReasons.map(r => (
                          <span key={r} className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-slate-800 text-xs flex items-center gap-1.5 font-mono font-bold shadow-2xs">
                            <span>{r}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveReasonFromCriterion(crit.id, r)}
                              className="text-slate-400 hover:text-red-600 font-bold cursor-pointer"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>

                      {/* Add new reason input */}
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          id={`new-reason-${crit.id}`}
                          placeholder="Type defect label (e.g. LOW PRESSURE) & tap +"
                          className="flex-1 bg-white text-slate-900 text-xs px-3 py-1.5 rounded-lg border border-slate-300 font-medium"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const input = e.currentTarget;
                              handleAddReasonToCriterion(crit.id, input.value);
                              input.value = '';
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const input = document.getElementById(`new-reason-${crit.id}`) as HTMLInputElement;
                            if (input && input.value) {
                              handleAddReasonToCriterion(crit.id, input.value);
                              input.value = '';
                            }
                          }}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold cursor-pointer"
                        >
                          + Add Reason
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {modalError && (
              <div className="mx-5 mb-2 p-3 bg-red-50 text-red-700 text-xs font-bold rounded-xl border border-red-200 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500 font-medium">
                Changes will apply to all upcoming inspections.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingItem(null);
                    setModalError(null);
                  }}
                  disabled={isSaving}
                  className="px-4 py-2 bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditedItem}
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white rounded-xl text-xs font-black shadow cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSaving ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Save Configuration</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Bulk Generator Modal */}
      {isBulkModalOpen && activeArea && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl max-h-[90vh] bg-white border-2 border-slate-300 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-900 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Bulk Generate Items</h3>
                  <p className="text-xs text-slate-500">Generating for area: <strong className="text-slate-800">{activeArea.name}</strong></p>
                </div>
              </div>
              <button
                onClick={() => setIsBulkModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-800 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Select Blueprint */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase font-mono">1. Reusable Blueprint / Criteria Preset</label>
                <select
                  value={bulkBlueprintId}
                  onChange={(e) => {
                    const bpId = e.target.value;
                    setBulkBlueprintId(bpId);
                    const bp = blueprints.find(b => b.id === bpId);
                    if (bp && bp.defaultNamePrefix) {
                      setBulkPrefix(bp.defaultNamePrefix);
                    }
                  }}
                  className="w-full bg-slate-50 text-slate-900 text-sm font-bold border border-slate-300 rounded-xl px-3.5 py-2.5 cursor-pointer focus:outline-none focus:border-indigo-500"
                >
                  {blueprints.map(bp => (
                    <option key={bp.id} value={bp.id}>
                      [{bp.category || 'GENERAL'}] {bp.name} ({bp.criteria.length} criteria)
                    </option>
                  ))}
                </select>
              </div>

              {/* Item Name Prefix */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase font-mono">2. Item Prefix</label>
                <input
                  type="text"
                  value={bulkPrefix}
                  onChange={(e) => setBulkPrefix(e.target.value)}
                  placeholder="e.g. Room , Pool Table , VIP "
                  className="w-full bg-slate-50 text-slate-900 text-sm font-bold px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Generation Mode Tabs */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase font-mono">3. Numbering Mode</label>
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setBulkMode('LIST')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      bulkMode === 'LIST' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Custom List (e.g. Skip 04 / non-contiguous)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkMode('RANGE')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      bulkMode === 'RANGE' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Sequential Range with Exclusions
                  </button>
                </div>
              </div>

              {bulkMode === 'LIST' ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600">
                    Comma or space-separated numbers (e.g. <code className="font-mono text-indigo-600">01, 02, 03, 05, 06, 07, 08, 09, 10, 11, 12</code>)
                  </label>
                  <textarea
                    value={bulkNumberList}
                    onChange={(e) => setBulkNumberList(e.target.value)}
                    rows={3}
                    placeholder="201, 202, 203, 205, 206"
                    className="w-full bg-slate-50 text-slate-900 text-sm font-mono px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-indigo-500 font-bold"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Start Number</label>
                    <input
                      type="number"
                      value={bulkStartNum}
                      onChange={(e) => setBulkStartNum(parseInt(e.target.value) || 1)}
                      className="w-full bg-slate-50 text-slate-900 text-sm font-bold px-3 py-2 rounded-xl border border-slate-300"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">End Number</label>
                    <input
                      type="number"
                      value={bulkEndNum}
                      onChange={(e) => setBulkEndNum(parseInt(e.target.value) || 1)}
                      className="w-full bg-slate-50 text-slate-900 text-sm font-bold px-3 py-2 rounded-xl border border-slate-300"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Exclude Numbers</label>
                    <input
                      type="text"
                      value={bulkExcludeList}
                      onChange={(e) => setBulkExcludeList(e.target.value)}
                      placeholder="e.g. 4, 13"
                      className="w-full bg-slate-50 text-slate-900 text-sm font-bold px-3 py-2 rounded-xl border border-slate-300"
                    />
                  </div>
                </div>
              )}

              {/* Generated Preview Chips */}
              <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-indigo-900 uppercase">
                    Preview Output ({getComputedBulkNumbers().length} items to be created):
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {getComputedBulkNumbers().map(num => (
                    <span key={num} className="px-2.5 py-1 bg-white border border-indigo-200 text-indigo-900 text-xs font-mono font-bold rounded-lg shadow-2xs">
                      {bulkPrefix}{num}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500 font-medium">
                Each created item remains fully editable independently.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBulkGenerate}
                  disabled={isSaving || getComputedBulkNumbers().length === 0}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-black shadow cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSaving ? (
                    <span>Generating...</span>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Generate {getComputedBulkNumbers().length} Items</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SAVE AS BLUEPRINT MODAL */}
      {saveBlueprintItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border-2 border-indigo-200 animate-in zoom-in-95 duration-150">
            <form onSubmit={handleConfirmSaveBlueprint}>
              <div className="p-5 bg-linear-to-r from-indigo-700 to-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-500/30 rounded-xl">
                    <BookmarkPlus className="w-6 h-6 text-indigo-200" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tight">Save as Blueprint Preset</h3>
                    <p className="text-xs text-indigo-200">
                      Create reusable template based on &ldquo;{saveBlueprintItem.name}&rdquo;
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSaveBlueprintItem(null)}
                  className="text-white/70 hover:text-white p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                {modalError && (
                  <div className="p-3 bg-red-50 text-red-700 text-xs font-bold rounded-xl border border-red-200 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{modalError}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase font-mono">
                    Blueprint Preset Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={bpFormName}
                    onChange={(e) => setBpFormName(e.target.value)}
                    placeholder="e.g. VIP KTV Suite, Pool Table Standard"
                    className="w-full bg-slate-50 text-slate-900 text-sm font-bold px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-indigo-500"
                    autoFocus
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase font-mono">Category</label>
                    <input
                      type="text"
                      value={bpFormCategory}
                      onChange={(e) => setBpFormCategory(e.target.value)}
                      placeholder="e.g. KTV, POOL, BAR"
                      className="w-full bg-slate-50 text-slate-900 text-sm font-bold px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase font-mono">Default Name Prefix</label>
                    <input
                      type="text"
                      value={bpFormPrefix}
                      onChange={(e) => setBpFormPrefix(e.target.value)}
                      placeholder="e.g. Room , Table "
                      className="w-full bg-slate-50 text-slate-900 text-sm font-bold px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase font-mono">Description (Optional)</label>
                  <input
                    type="text"
                    value={bpFormDescription}
                    onChange={(e) => setBpFormDescription(e.target.value)}
                    placeholder="e.g. Standard 6-step checklist for VIP rooms"
                    className="w-full bg-slate-50 text-slate-900 text-sm px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Included Criteria Preview */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <div className="text-xs font-mono font-bold text-slate-700 uppercase flex items-center justify-between">
                    <span>Criteria to be saved ({saveBlueprintItem.criteria.length}):</span>
                  </div>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {saveBlueprintItem.criteria.map((crit, idx) => (
                      <div key={crit.id || idx} className="p-2 bg-white border border-slate-200 rounded-xl text-xs flex items-center justify-between">
                        <span className="font-bold text-slate-800">{crit.name}</span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {crit.predefinedReasons?.length || 0} quick defect tags
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSaveBlueprintItem(null)}
                  className="px-4 py-2.5 bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !bpFormName.trim()}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSaving ? 'Saving...' : 'Save to Blueprint Library'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border-2 border-red-200 animate-in zoom-in-95 duration-150">
            <div className="p-5 bg-red-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-red-700/50 rounded-xl">
                  <Trash2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight">
                    Delete {deleteConfirmModal.type === 'AREA' ? 'Area' : deleteConfirmModal.type === 'ITEM' ? 'Checklist Item' : 'Department'}
                  </h3>
                  <p className="text-xs text-red-100">Permanent configuration change</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteConfirmModal(null)}
                className="text-white/70 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3">
              <p className="text-sm font-bold text-slate-900">
                Are you sure you want to delete <span className="text-red-600 underline">&ldquo;{deleteConfirmModal.name}&rdquo;</span>?
              </p>
              {deleteConfirmModal.details && (
                <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed">
                  {deleteConfirmModal.details}
                </p>
              )}
            </div>

            <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmModal(null)}
                className="px-4 py-2.5 bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isSaving}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black shadow cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSaving ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
