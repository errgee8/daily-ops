import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { AreaTemplate, ItemTemplate, CriterionTemplate, CriterionResult, InspectionStatusType } from '../types';
import { formatDateTime, formatDate } from '../utils/crypto';
import { 
  ClipboardCheck, 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  Camera, 
  Check, 
  History, 
  Send, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  Eye, 
  CheckCheck,
  AlertTriangle,
  Lock,
  ArrowRight,
  X,
  Plus
} from 'lucide-react';
import { PhotoCaptureModal } from '../components/PhotoCaptureModal';
import { ItemHistoryModal } from '../components/ItemHistoryModal';

interface DailyInspectionViewProps {
  onNavigateToIssues: () => void;
}

export const DailyInspectionView: React.FC<DailyInspectionViewProps> = ({ onNavigateToIssues }) => {
  const { currentUser, currentRole } = useAuth();
  const { 
    template, 
    todayDate, 
    todayInspection, 
    todayIssues,
    startTodayInspection,
    setItemCriterionStatus, 
    quickMarkItemAllGood, 
    quickMarkAreaAllGood, 
    completeAndHandover 
  } = useData();

  const isManager = currentRole === 'MANAGER';

  // Active Area selection tab
  const [selectedAreaId, setSelectedAreaId] = useState<string>(template.areas[0]?.id || '');
  
  // Modals
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [photoTarget, setPhotoTarget] = useState<{
    areaId: string;
    areaName: string;
    itemId: string;
    itemName: string;
    criterionId: string;
    criterionName: string;
  } | null>(null);

  const [enlargedPhoto, setEnlargedPhoto] = useState<string | null>(null);

  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<{ areaId: string; itemId: string } | null>(null);

  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  // Active Area
  const activeArea = useMemo(() => {
    return template.areas.find(a => a.id === selectedAreaId) || template.areas[0];
  }, [template, selectedAreaId]);

  // Inspection data
  const inspection = todayInspection;
  const isLocked = inspection?.isHandedOver && !isManager;

  const handleStartInspection = async () => {
    if (!currentUser) return;
    await startTodayInspection(currentUser);
  };

  const handleStatusChange = async (
    area: AreaTemplate,
    item: ItemTemplate,
    criterion: CriterionTemplate,
    status: InspectionStatusType,
    existingReasons: string[] = []
  ) => {
    if (!currentUser || !inspection) return;

    if (status === 'NOT_OK') {
      // Default to first reason if none selected yet
      const reasons = existingReasons.length > 0 ? existingReasons : [criterion.predefinedReasons[0] || 'DEFECT FOUND'];
      await setItemCriterionStatus(
        todayDate,
        area.id,
        area.name,
        item.id,
        item.name,
        criterion.id,
        criterion.name,
        'NOT_OK',
        reasons,
        '',
        undefined,
        currentUser
      );
    } else {
      await setItemCriterionStatus(
        todayDate,
        area.id,
        area.name,
        item.id,
        item.name,
        criterion.id,
        criterion.name,
        status,
        [],
        '',
        undefined,
        currentUser
      );
    }
  };

  const handleToggleReason = async (
    area: AreaTemplate,
    item: ItemTemplate,
    criterion: CriterionTemplate,
    reason: string,
    currentReasons: string[],
    customReason?: string
  ) => {
    if (!currentUser || !inspection) return;

    let updatedReasons: string[];
    if (currentReasons.includes(reason)) {
      updatedReasons = currentReasons.filter(r => r !== reason);
      if (updatedReasons.length === 0 && !customReason) {
        // If all reasons unchecked, keep at least one or 'OTHER'
        updatedReasons = ['NOT SPECIFIED'];
      }
    } else {
      updatedReasons = [...currentReasons.filter(r => r !== 'NOT SPECIFIED'), reason];
    }

    await setItemCriterionStatus(
      todayDate,
      area.id,
      area.name,
      item.id,
      item.name,
      criterion.id,
      criterion.name,
      'NOT_OK',
      updatedReasons,
      customReason,
      undefined,
      currentUser
    );
  };

  const handleCustomReasonChange = async (
    area: AreaTemplate,
    item: ItemTemplate,
    criterion: CriterionTemplate,
    customText: string,
    currentReasons: string[]
  ) => {
    if (!currentUser || !inspection) return;
    await setItemCriterionStatus(
      todayDate,
      area.id,
      area.name,
      item.id,
      item.name,
      criterion.id,
      criterion.name,
      'NOT_OK',
      currentReasons,
      customText,
      undefined,
      currentUser
    );
  };

  const handleQuickGoodItem = async (item: ItemTemplate, areaName: string) => {
    if (!currentUser) return;
    await quickMarkItemAllGood(todayDate, item, areaName, currentUser);
  };

  const handleQuickGoodArea = async (area: AreaTemplate) => {
    if (!currentUser) return;
    await quickMarkAreaAllGood(todayDate, area, currentUser);
  };

  const handleOpenPhotoCapture = (
    areaId: string,
    areaName: string,
    itemId: string,
    itemName: string,
    criterionId: string,
    criterionName: string
  ) => {
    setPhotoTarget({ areaId, areaName, itemId, itemName, criterionId, criterionName });
    setPhotoModalOpen(true);
  };

  const handlePhotoSaved = async (photoDataUrl: string) => {
    if (!photoTarget || !currentUser) return;
    const itemResult = inspection?.itemResults[photoTarget.itemId];
    const critResult = itemResult?.criterionResults.find(c => c.criterionId === photoTarget.criterionId);

    const existingPhotos = Array.isArray(critResult?.photos) && critResult.photos.length > 0
      ? critResult.photos
      : (critResult?.photoUrl ? [critResult.photoUrl] : []);

    const updatedPhotos = existingPhotos.includes(photoDataUrl)
      ? existingPhotos
      : [...existingPhotos, photoDataUrl];

    await setItemCriterionStatus(
      todayDate,
      photoTarget.areaId,
      photoTarget.areaName,
      photoTarget.itemId,
      photoTarget.itemName,
      photoTarget.criterionId,
      photoTarget.criterionName,
      'NOT_OK',
      critResult?.selectedReasons || [critResult?.criterionName || 'DEFECT FOUND'],
      critResult?.customReason,
      updatedPhotos,
      currentUser
    );
  };

  const handleRemoveCriterionPhoto = async (
    areaId: string,
    areaName: string,
    itemId: string,
    itemName: string,
    criterion: CriterionTemplate,
    photoUrlToRemove: string,
    critResult?: CriterionResult
  ) => {
    if (!currentUser || !inspection) return;
    const existingPhotos = Array.isArray(critResult?.photos) && critResult.photos.length > 0
      ? critResult.photos
      : (critResult?.photoUrl ? [critResult.photoUrl] : []);
    
    const updatedPhotos = existingPhotos.filter(p => p !== photoUrlToRemove);

    await setItemCriterionStatus(
      todayDate,
      areaId,
      areaName,
      itemId,
      itemName,
      criterion.id,
      criterion.name,
      'NOT_OK',
      critResult?.selectedReasons || ['NOT SPECIFIED'],
      critResult?.customReason,
      updatedPhotos,
      currentUser
    );
  };

  const handleHandover = async () => {
    if (!currentUser) return;
    await completeAndHandover(todayDate, currentUser);
    setReviewModalOpen(false);
  };

  const handleOpenItemHistory = (areaId: string, itemId: string) => {
    setHistoryTarget({ areaId, itemId });
    setHistoryModalOpen(true);
  };

  if (!inspection) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center space-y-6 select-none">
        <div className="bg-white border-2 border-slate-200 rounded-3xl p-10 shadow-lg space-y-4 text-slate-900">
          <div className="p-4 bg-orange-50 text-orange-600 rounded-2xl w-fit mx-auto border border-orange-200 shadow-sm">
            <ClipboardCheck className="w-12 h-12" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">START DAILY OPERATIONAL WALKTHROUGH</h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Loads predefined checklist structure for {template.areas.length} areas and all operational items. Tap buttons to inspect with zero typing.
          </p>
          <button
            onClick={handleStartInspection}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-black text-lg rounded-2xl shadow-lg uppercase tracking-wide transition-all cursor-pointer min-h-[56px]"
            id="start-walkthrough-btn"
          >
            START TODAY'S INSPECTION ({formatDate(todayDate)})
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-5 pb-32 select-none">
      {/* Handover Notice Banner */}
      {inspection.isHandedOver && (
        <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4 flex items-center justify-between gap-4 text-green-800 shadow-sm">
          <div className="flex items-center gap-3">
            <CheckCheck className="w-6 h-6 text-green-600 shrink-0" />
            <div>
              <span className="font-bold text-slate-900">DAILY INSPECTION HANDED OVER TO ASSISTANT MANAGER</span>
              <p className="text-xs text-green-700">
                Completed by {inspection.completedByName} at {formatDateTime(inspection.completedAt)}. Original walkthrough is locked.
              </p>
            </div>
          </div>
          <button
            onClick={onNavigateToIssues}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow min-h-[44px]"
          >
            <span>View Outstanding Issues ({todayIssues.length})</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Large Horizontal Area Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {template.areas.map(area => {
          const isSelected = area.id === selectedAreaId;
          const areaItems = area.items;
          const inspectedInArea = areaItems.filter(it => {
            const res = inspection.itemResults[it.id];
            return res && res.overallStatus !== 'NA';
          }).length;
          const notReadyInArea = areaItems.filter(it => {
            const res = inspection.itemResults[it.id];
            return res && res.overallStatus === 'NOT_READY';
          }).length;

          return (
            <button
              key={area.id}
              onClick={() => setSelectedAreaId(area.id)}
              className={`px-5 py-3 rounded-2xl font-bold text-sm md:text-base flex items-center gap-2.5 transition-all whitespace-nowrap border-2 min-h-[50px] cursor-pointer ${
                isSelected
                  ? 'bg-orange-600 text-white border-orange-600 shadow-md font-extrabold'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
              }`}
              id={`area-tab-${area.id}`}
            >
              <span>{area.name}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                isSelected 
                  ? 'bg-white text-orange-600' 
                  : notReadyInArea > 0 
                    ? 'bg-red-100 text-red-700 border border-red-200' 
                    : 'bg-slate-100 text-slate-600'
              }`}>
                {inspectedInArea}/{areaItems.length}
                {notReadyInArea > 0 && ` • 🔴 ${notReadyInArea}`}
              </span>
            </button>
          );
        })}
      </div>

      {/* Area Actions Bar */}
      {activeArea && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-sm">
          <div>
            <div className="text-xs font-mono text-slate-500 uppercase tracking-wider">
              INSPECTING AREA:
            </div>
            <h2 className="text-xl font-black text-slate-900">{activeArea.name} ({activeArea.items.length} Items)</h2>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => handleQuickGoodArea(activeArea)}
              disabled={isLocked}
              className="flex-1 sm:flex-initial px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow active:scale-95 disabled:opacity-40 min-h-[44px] cursor-pointer"
              title="Fast pass all items in this area as Good"
              id="quick-all-good-area-btn"
            >
              <Sparkles className="w-4 h-4 text-emerald-200" />
              <span>PASS ENTIRE {activeArea.name} AS GOOD</span>
            </button>
          </div>
        </div>
      )}

      {/* Items List in Active Area */}
      <div className="space-y-4">
        {activeArea?.items.map((item) => {
          const itemResult = inspection.itemResults[item.id];
          const overallStatus = itemResult?.overallStatus || 'NA';
          const isNotReady = overallStatus === 'NOT_READY';
          const isReady = overallStatus === 'READY';

          return (
            <div
              key={item.id}
              className={`bg-white border-2 rounded-2xl p-4 md:p-6 transition-all shadow-sm ${
                isNotReady
                  ? 'border-red-300 bg-red-50/30'
                  : isReady
                    ? 'border-green-300 bg-green-50/30'
                    : 'border-slate-200'
              }`}
              id={`checklist-item-${item.id}`}
            >
              {/* Item Card Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-200 gap-3">
                <div className="flex items-center gap-3">
                  <div className={`px-3 py-1 rounded-xl border text-xs font-black font-mono shadow-2xs ${
                    isNotReady ? 'bg-red-100 text-red-700 border-red-300' :
                    isReady ? 'bg-green-100 text-green-700 border-green-300' :
                    'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {isNotReady ? '🔴 NOT READY' : isReady ? '🟢 READY' : '⚪ UNCHECKED'}
                  </div>

                  <div>
                    <h3 className="text-xl font-black text-slate-900">{item.name}</h3>
                    <div className="text-xs text-slate-500 font-mono">
                      {activeArea.name} • {item.criteria.length} Criteria
                    </div>
                  </div>
                </div>

                {/* Right Item Quick Tools */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenItemHistory(activeArea.id, item.id)}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-300 text-xs font-bold flex items-center gap-1.5 min-h-[40px] px-3 transition-colors cursor-pointer"
                    title="View historical defect pattern for this room"
                  >
                    <History className="w-4 h-4 text-blue-600" />
                    <span className="hidden sm:inline">History</span>
                  </button>

                  <button
                    onClick={() => handleQuickGoodItem(item, activeArea.name)}
                    disabled={isLocked}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow active:scale-95 disabled:opacity-40 min-h-[40px] cursor-pointer"
                    id={`quick-good-item-${item.id}`}
                  >
                    <Check className="w-4 h-4" />
                    <span>ALL GOOD</span>
                  </button>
                </div>
              </div>

              {/* Criteria List */}
              <div className="mt-4 space-y-3">
                {item.criteria.map((criterion) => {
                  const critResult = itemResult?.criterionResults.find(c => c.criterionId === criterion.id);
                  const currentStatus = critResult?.status || 'NA';
                  const selectedReasons = critResult?.selectedReasons || [];
                  const customReason = critResult?.customReason || '';
                  const attachedPhotos = Array.isArray(critResult?.photos) && critResult.photos.length > 0
                    ? critResult.photos
                    : (critResult?.photoUrl ? [critResult.photoUrl] : []);
                  const isCritNotOk = currentStatus === 'NOT_OK';

                  return (
                    <div
                      key={criterion.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isCritNotOk 
                          ? 'bg-red-50 border-red-200' 
                          : currentStatus === 'GOOD' 
                            ? 'bg-green-50/50 border-green-200' 
                            : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      {/* Criterion Header & 1-Tap Status Buttons */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${
                            isCritNotOk ? 'bg-red-500' : currentStatus === 'GOOD' ? 'bg-green-500' : 'bg-slate-400'
                          }`} />
                          <span className="text-sm font-bold text-slate-800">{criterion.name}</span>
                        </div>

                        {/* Large 1-Tap Evaluation Buttons */}
                        <div className="flex items-center gap-2">
                          {/* GOOD Button */}
                          <button
                            onClick={() => handleStatusChange(activeArea, item, criterion, 'GOOD')}
                            disabled={isLocked}
                            className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all border min-h-[44px] min-w-[84px] cursor-pointer ${
                              currentStatus === 'GOOD'
                                ? 'bg-green-600 text-white border-green-600 font-extrabold shadow-sm'
                                : 'bg-white text-slate-700 border-slate-300 hover:bg-green-50 hover:text-green-700'
                            } disabled:opacity-40`}
                          >
                            <Check className="w-4 h-4" />
                            <span>GOOD</span>
                          </button>

                          {/* NOT OK Button */}
                          <button
                            onClick={() => handleStatusChange(activeArea, item, criterion, 'NOT_OK', selectedReasons)}
                            disabled={isLocked}
                            className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all border min-h-[44px] min-w-[88px] cursor-pointer ${
                              isCritNotOk
                                ? 'bg-red-600 text-white border-red-600 font-black shadow-sm'
                                : 'bg-white text-slate-700 border-slate-300 hover:bg-red-50 hover:text-red-700'
                            } disabled:opacity-40`}
                          >
                            <AlertCircle className="w-4 h-4" />
                            <span>NOT OK</span>
                          </button>

                          {/* N/A Button */}
                          <button
                            onClick={() => handleStatusChange(activeArea, item, criterion, 'NA')}
                            disabled={isLocked}
                            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center transition-all border min-h-[44px] min-w-[52px] cursor-pointer ${
                              currentStatus === 'NA'
                                ? 'bg-slate-700 text-white border-slate-700 font-bold'
                                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                            } disabled:opacity-40`}
                          >
                            <span>N/A</span>
                          </button>
                        </div>
                      </div>

                      {/* Expanded Predefined Reason Selector when NOT OK */}
                      {isCritNotOk && (
                        <div className="mt-3 pt-3 border-t border-red-200 space-y-3 animate-in fade-in duration-100">
                          <div className="text-xs font-bold text-red-700 flex items-center justify-between">
                            <span>SELECT SPECIFIC PROBLEM(S):</span>
                            <button
                              type="button"
                              onClick={() => handleOpenPhotoCapture(activeArea.id, activeArea.name, item.id, item.name, criterion.id, criterion.name)}
                              className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs cursor-pointer hover:bg-blue-50/50"
                            >
                              <Camera className="w-3.5 h-3.5" />
                              <span>{attachedPhotos.length > 0 ? `Add Photo (${attachedPhotos.length})` : 'Attach Photo'}</span>
                            </button>
                          </div>

                          {/* Predefined Reason Chips */}
                          <div className="flex flex-wrap gap-2">
                            {criterion.predefinedReasons.map(reason => {
                              const isSelected = selectedReasons.includes(reason);
                              return (
                                <button
                                  key={reason}
                                  type="button"
                                  onClick={() => handleToggleReason(activeArea, item, criterion, reason, selectedReasons, customReason)}
                                  disabled={isLocked}
                                  className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition-all border min-h-[44px] cursor-pointer ${
                                    isSelected
                                      ? 'bg-red-600 text-white border-red-600 font-black shadow-sm'
                                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                                  }`}
                                >
                                  {reason}
                                </button>
                              );
                            })}
                          </div>

                          {/* Optional Custom Problem Text */}
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={customReason}
                              onChange={(e) => handleCustomReasonChange(activeArea, item, criterion, e.target.value, selectedReasons)}
                              placeholder="Optional extra detail or unusual problem..."
                              disabled={isLocked}
                              className="flex-1 bg-white text-slate-900 text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-orange-500 min-h-[44px]"
                            />
                          </div>

                          {/* Multi-Photo Thumbnails List */}
                          {attachedPhotos.length > 0 && (
                            <div className="pt-2 border-t border-red-100 space-y-1.5">
                              <div className="text-[11px] font-bold text-slate-600 flex items-center justify-between">
                                <span>ATTACHED PHOTOS ({attachedPhotos.length}):</span>
                                <span className="text-[10px] text-slate-400 font-normal">Tap to inspect</span>
                              </div>
                              <div className="flex flex-wrap gap-2 items-center">
                                {attachedPhotos.map((photo, pIdx) => (
                                  <div 
                                    key={pIdx} 
                                    className="relative group rounded-xl overflow-hidden border border-slate-300 bg-white shadow-2xs"
                                  >
                                    <img 
                                      src={photo} 
                                      alt={`Defect ${pIdx + 1}`} 
                                      onClick={() => setEnlargedPhoto(photo)}
                                      className="w-14 h-14 object-cover cursor-pointer hover:opacity-90 transition-opacity" 
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveCriterionPhoto(activeArea.id, activeArea.name, item.id, item.name, criterion, photo, critResult)}
                                      disabled={isLocked}
                                      title="Remove this photo"
                                      className="absolute top-1 right-1 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center text-xs shadow-md hover:bg-red-700 cursor-pointer disabled:opacity-50"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                    <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] text-center font-bold py-0.5 pointer-events-none">
                                      #{pIdx + 1}
                                    </div>
                                  </div>
                                ))}

                                {!isLocked && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenPhotoCapture(activeArea.id, activeArea.name, item.id, item.name, criterion.id, criterion.name)}
                                    className="w-14 h-14 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-500 bg-white hover:bg-blue-50 flex flex-col items-center justify-center gap-0.5 text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
                                    title="Add another photo"
                                  >
                                    <Plus className="w-4 h-4" />
                                    <span className="text-[9px] font-bold">Add</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Operational Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-[#0F172A] border-t border-slate-800 p-3 md:p-4 text-white shadow-2xl">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Summary Numbers */}
          <div className="flex items-center gap-4 text-xs md:text-sm font-mono">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">TOTAL:</span>
              <span className="font-bold text-white text-base">
                {inspection.readyItems + inspection.notReadyItems} / {inspection.totalItems}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-green-400">
              <span>READY:</span>
              <span className="font-bold text-base">{inspection.readyItems}</span>
            </div>
            <div className="flex items-center gap-1.5 text-red-400">
              <span>ISSUES:</span>
              <span className="font-bold text-base">{todayIssues.length}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => setReviewModalOpen(true)}
              className="flex-1 sm:flex-initial px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl border border-slate-700 text-xs flex items-center justify-center gap-2 min-h-[48px] cursor-pointer"
              id="review-issues-btn"
            >
              <Eye className="w-4 h-4 text-orange-400" />
              <span>REVIEW ISSUES ({todayIssues.length})</span>
            </button>

            {isManager && (
              <button
                onClick={() => setReviewModalOpen(true)}
                className="flex-1 sm:flex-initial px-6 py-3 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-black rounded-xl text-xs md:text-sm flex items-center justify-center gap-2 shadow-lg uppercase tracking-wide min-h-[48px] cursor-pointer"
                id="handover-asst-btn"
              >
                <Send className="w-4 h-4" />
                <span>HANDOVER TO ASST MANAGER</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Review & Handover Modal (Requirement #9) */}
      {reviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl max-h-[90vh] bg-white border-2 border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-900 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h2 className="text-xl font-black text-slate-900">DAILY INSPECTION SUMMARY & HANDOVER</h2>
                <p className="text-xs text-slate-500">Review outstanding defects before handing over to Assistant Manager</p>
              </div>
              <button onClick={() => setReviewModalOpen(false)} className="text-slate-400 hover:text-slate-700 p-2 cursor-pointer font-bold">
                ✕
              </button>
            </div>

            <div className="p-4 bg-white border-b border-slate-200 grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-2xl font-black text-slate-900 font-mono">{inspection.readyItems + inspection.notReadyItems}</div>
                <div className="text-[11px] font-bold text-slate-500">Total Inspected</div>
              </div>
              <div className="p-3 bg-green-50 rounded-xl border border-green-200">
                <div className="text-2xl font-black text-green-600 font-mono">{inspection.readyItems}</div>
                <div className="text-[11px] font-bold text-green-700">Ready for Service</div>
              </div>
              <div className="p-3 bg-red-50 rounded-xl border border-red-200">
                <div className="text-2xl font-black text-red-600 font-mono">{todayIssues.length}</div>
                <div className="text-[11px] font-bold text-red-700">Defects Found</div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {todayIssues.length === 0 ? (
                <div className="text-center py-8 text-green-600 space-y-2">
                  <CheckCircle className="w-12 h-12 mx-auto" />
                  <p className="font-bold text-slate-800">Zero defects logged! Venue is 100% Ready.</p>
                </div>
              ) : (
                todayIssues.map((iss) => (
                  <div key={iss.id} className="p-3.5 bg-red-50/60 rounded-xl border border-red-200 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-white text-slate-800 border border-slate-200 font-bold">{iss.areaName}</span>
                        <span className="text-sm font-black text-slate-900">{iss.itemName}</span>
                        <span className="text-xs text-slate-500">• {iss.criterionName}</span>
                      </div>
                      <div className="text-xs text-red-700 font-mono font-semibold mt-1">
                        {iss.specificProblems.join(', ')} {iss.customNote && `(${iss.customNote})`}
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-800 shadow-2xs">
                      {iss.departmentName}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                onClick={() => setReviewModalOpen(false)}
                className="px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-300 cursor-pointer"
              >
                Back to Inspection
              </button>

              {isManager && (
                <button
                  onClick={handleHandover}
                  className="px-6 py-3 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-black rounded-xl text-sm flex items-center gap-2 shadow-lg uppercase tracking-wide cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>CONFIRM HANDOVER TO ASST MANAGER</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Photo Capture Modal */}
      <PhotoCaptureModal
        isOpen={photoModalOpen}
        title={`Attach Photo - ${photoTarget?.itemName}`}
        onClose={() => setPhotoModalOpen(false)}
        onPhotoSaved={handlePhotoSaved}
      />

      {/* Item History Modal */}
      {historyTarget && (
        <ItemHistoryModal
          isOpen={historyModalOpen}
          initialAreaId={historyTarget.areaId}
          initialItemId={historyTarget.itemId}
          onClose={() => setHistoryModalOpen(false)}
        />
      )}

      {/* Enlarged Photo Preview Modal */}
      {enlargedPhoto && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setEnlargedPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden p-2 shadow-2xl" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setEnlargedPhoto(null)}
              className="absolute top-4 right-4 z-10 w-9 h-9 bg-black/70 text-white rounded-full flex items-center justify-center hover:bg-black cursor-pointer border border-white/20"
            >
              <X className="w-5 h-5" />
            </button>
            <img 
              src={enlargedPhoto} 
              alt="Enlarged issue defect" 
              className="max-h-[80vh] w-auto mx-auto object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
