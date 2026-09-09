import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { formatDate, formatDateTime } from '../utils/crypto';
import { OperationalIssue, DailyTask, ItemTemplate, AreaTemplate } from '../types';
import { soundSynth } from '../utils/audio';
import { 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Clock3, 
  ArrowRight, 
  PlayCircle, 
  CheckSquare, 
  Check, 
  X, 
  AlertTriangle, 
  Sparkles, 
  Camera, 
  ChevronRight, 
  UserCheck, 
  ShieldCheck, 
  Building2, 
  RotateCcw,
  MessageSquare,
  HelpCircle
} from 'lucide-react';
import { TaskNotDoneModal } from '../components/TaskNotDoneModal';
import { TaskDoneModal } from '../components/TaskDoneModal';
import { PhotoCaptureModal } from '../components/PhotoCaptureModal';

interface TodayViewProps {
  onNavigate?: (tab: string, filterStatus?: string) => void;
}

type FilterCategory = 'ALL' | 'NEEDS_ACTION' | 'DUE_SOON' | 'DONE' | 'WAITING_MANAGER';

export const TodayView: React.FC<TodayViewProps> = ({ onNavigate }) => {
  const { currentUser, isManager, isAssistantManager } = useAuth();
  const { 
    settings, 
    template, 
    venues,
    selectedVenueFilter,
    setSelectedVenueFilter,
    todayDate, 
    todayInspection, 
    todayIssues, 
    todayTasks,
    startTodayInspection,
    setItemCriterionStatus,
    quickMarkItemAllGood,
    startWorkOnIssue,
    markIssueResolved,
    addIssueNote,
    attachPhotoToIssue,
    startDailyTask,
    markDailyTaskDone
  } = useData();

  // Active Category Filter
  const [selectedFilter, setSelectedFilter] = useState<FilterCategory>('ALL');

  // Modals state
  const [problemModalItem, setProblemModalItem] = useState<{ item: ItemTemplate; area: AreaTemplate } | null>(null);
  const [selectedProblems, setSelectedProblems] = useState<string[]>([]);
  const [customProblemText, setCustomProblemText] = useState<string>('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');

  const [fixModalIssue, setFixModalIssue] = useState<OperationalIssue | null>(null);
  const [fixNote, setFixNote] = useState<string>('');
  const [fixPhotos, setFixPhotos] = useState<string[]>([]);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [enlargedPhotoUrl, setEnlargedPhotoUrl] = useState<string | null>(null);

  const [taskToMarkDone, setTaskToMarkDone] = useState<DailyTask | null>(null);
  const [taskToMarkNotDone, setTaskToMarkNotDone] = useState<DailyTask | null>(null);

  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(null), 3000);
  };

  // 1. Gather all inspection items and check status
  const itemStatuses = useMemo(() => {
    if (!todayInspection) return {};
    return todayInspection.itemResults || {};
  }, [todayInspection]);

  // Flatten template items for quick operational inspection (filtered by venue)
  const allVenueItems = useMemo(() => {
    const list: { item: ItemTemplate; area: AreaTemplate; status: 'CHECKED' | 'NOT_CHECKED' | 'PROBLEM' }[] = [];
    template.areas.forEach(area => {
      if (selectedVenueFilter !== 'ALL' && area.venueId && area.venueId !== selectedVenueFilter) {
        return;
      }
      area.items.forEach(item => {
        const res = itemStatuses[item.id];
        let status: 'CHECKED' | 'NOT_CHECKED' | 'PROBLEM' = 'NOT_CHECKED';
        if (res) {
          if (res.overallStatus === 'READY') status = 'CHECKED';
          else if (res.overallStatus === 'NOT_READY') status = 'PROBLEM';
          else if (res.overallStatus === 'NA') status = 'CHECKED';
        }
        list.push({ item, area, status });
      });
    });
    return list;
  }, [template, itemStatuses, selectedVenueFilter]);

  // 2. Actionable Issues (filtered by venue)
  const actionableIssues = useMemo(() => {
    return todayIssues.filter(i => {
      if (selectedVenueFilter !== 'ALL' && i.venueId && i.venueId !== selectedVenueFilter) return false;
      return i.currentStatus === 'NOT_READY' || i.currentStatus === 'IN_PROCESS';
    });
  }, [todayIssues, selectedVenueFilter]);

  const waitingManagerIssues = useMemo(() => {
    return todayIssues.filter(i => {
      if (selectedVenueFilter !== 'ALL' && i.venueId && i.venueId !== selectedVenueFilter) return false;
      return i.currentStatus === 'WAITING_VERIFICATION';
    });
  }, [todayIssues, selectedVenueFilter]);

  const completedIssues = useMemo(() => {
    return todayIssues.filter(i => {
      if (selectedVenueFilter !== 'ALL' && i.venueId && i.venueId !== selectedVenueFilter) return false;
      return i.currentStatus === 'VERIFIED';
    });
  }, [todayIssues, selectedVenueFilter]);

  // 3. Actionable Daily Tasks (filtered by venue)
  const pendingTasks = useMemo(() => {
    return todayTasks.filter(t => {
      if (selectedVenueFilter !== 'ALL' && t.venueId && t.venueId !== selectedVenueFilter) return false;
      return t.status === 'PENDING' || t.status === 'IN_PROGRESS';
    });
  }, [todayTasks, selectedVenueFilter]);

  const completedTasks = useMemo(() => {
    return todayTasks.filter(t => {
      if (selectedVenueFilter !== 'ALL' && t.venueId && t.venueId !== selectedVenueFilter) return false;
      return t.status === 'DONE' || t.status === 'NOT_DONE';
    });
  }, [todayTasks, selectedVenueFilter]);

  // Counts for the 4 Simple Statuses
  const needsActionCount = actionableIssues.filter(i => i.currentStatus === 'NOT_READY').length + 
    pendingTasks.filter(t => t.priority === 'URGENT' || t.priority === 'HIGH').length +
    (allVenueItems.filter(i => i.status === 'NOT_CHECKED').length > 0 ? 1 : 0);

  const dueSoonCount = actionableIssues.filter(i => i.currentStatus === 'IN_PROCESS').length +
    pendingTasks.filter(t => t.priority !== 'URGENT' && t.priority !== 'HIGH').length;

  const completedCount = completedTasks.length + completedIssues.length + allVenueItems.filter(i => i.status === 'CHECKED').length;
  const waitingManagerCount = waitingManagerIssues.length;

  // 4. "What do I do next?" smart prioritization
  const prioritizedNextAction = useMemo(() => {
    // 1. Unresolved urgent/high tasks
    const urgentTask = pendingTasks.find(t => t.priority === 'URGENT');
    if (urgentTask) return { type: 'TASK' as const, data: urgentTask, label: 'Urgent Task to Complete' };

    // 2. Overdue/Not Ready Issues
    const notReadyIssue = actionableIssues.find(i => i.currentStatus === 'NOT_READY');
    if (notReadyIssue) return { type: 'ISSUE' as const, data: notReadyIssue, label: 'Problem Requiring Fix / Follow Up' };

    // 3. In Process Issues
    const inProcessIssue = actionableIssues.find(i => i.currentStatus === 'IN_PROCESS');
    if (inProcessIssue) return { type: 'ISSUE' as const, data: inProcessIssue, label: 'Continue Fix in Progress' };

    // 4. Regular Pending Tasks
    if (pendingTasks.length > 0) return { type: 'TASK' as const, data: pendingTasks[0], label: 'Next Task to Start' };

    // 5. Unchecked items in venue
    const unchecked = allVenueItems.find(i => i.status === 'NOT_CHECKED');
    if (unchecked) return { type: 'CHECK' as const, data: unchecked, label: `Check Condition: ${unchecked.item.name}` };

    return null;
  }, [pendingTasks, actionableIssues, allVenueItems]);

  // Handlers
  const handleQuickPass = async (item: ItemTemplate, area: AreaTemplate) => {
    if (!currentUser) return;
    try {
      soundSynth.playSuccess();
      if (!todayInspection) {
        await startTodayInspection(currentUser);
      }
      await quickMarkItemAllGood(todayDate, item, area.name, currentUser);
      showFeedback(`✓ ${item.name} marked all good!`);
    } catch {
      showFeedback('Something went wrong while saving this. Please try again.');
    }
  };

  const handleOpenProblemModal = (item: ItemTemplate, area: AreaTemplate) => {
    soundSynth.playTap();
    setProblemModalItem({ item, area });
    setSelectedProblems([]);
    setCustomProblemText('');
    setSelectedDepartmentId(item.criteria[0]?.defaultDepartmentId || template.departments[0]?.id || 'dept-clean');
  };

  const handleSubmitProblem = async () => {
    if (!problemModalItem || !currentUser) return;
    const { item, area } = problemModalItem;
    const criterion = item.criteria[0] || { id: 'crit_gen', name: 'General Condition' };
    const reasons = selectedProblems.length > 0 ? selectedProblems : [customProblemText.trim() || 'Needs Attention'];

    try {
      soundSynth.playDueSoonChime();
      if (!todayInspection) {
        await startTodayInspection(currentUser);
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
        reasons,
        customProblemText.trim() || undefined,
        undefined,
        currentUser
      );
      setProblemModalItem(null);
      showFeedback(`Problem reported on ${item.name}.`);
    } catch {
      showFeedback('Something went wrong while saving this. Please try again.');
    }
  };

  const handleStartFixIssue = async (issue: OperationalIssue) => {
    if (!currentUser) return;
    try {
      soundSynth.playTap();
      await startWorkOnIssue(issue.id, currentUser);
      showFeedback(`Started work on ${issue.itemName}.`);
    } catch {
      showFeedback('Something went wrong while updating issue.');
    }
  };

  const handleOpenFixModal = (issue: OperationalIssue) => {
    soundSynth.playTap();
    setFixModalIssue(issue);
    setFixNote('');
    setFixPhotos([]);
  };

  const handleSubmitFix = async () => {
    if (!fixModalIssue || !currentUser) return;
    try {
      soundSynth.playSuccess();
      await markIssueResolved(
        fixModalIssue.id, 
        currentUser, 
        fixNote.trim() || 'Fixed and ready for Manager verification',
        fixPhotos.length > 0 ? fixPhotos : undefined
      );
      setFixModalIssue(null);
      setFixPhotos([]);
      showFeedback(`✓ ${fixModalIssue.itemName} submitted! Waiting for Manager verification.`);
    } catch {
      showFeedback('Something went wrong while submitting.');
    }
  };

  const isAllCaughtUp = needsActionCount === 0 && dueSoonCount === 0;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5 select-none animate-in fade-in duration-150">
      {/* Top Banner Notice */}
      {notificationMsg && (
        <div className="bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-lg border border-slate-700 flex items-center justify-between text-sm font-bold animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-orange-400" />
            <span>{notificationMsg}</span>
          </div>
          <button onClick={() => setNotificationMsg(null)} className="p-1 hover:bg-slate-800 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-500 uppercase tracking-wider mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>HANDOVER. • TODAY</span>
            <span>•</span>
            <span>{formatDate(todayDate)}</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            {settings.venueName || 'Operations Assistant'}
          </h2>
          <p className="text-xs md:text-sm text-slate-600 font-medium mt-0.5">
            Signed in as <strong className="text-slate-900">{currentUser?.name}</strong> ({currentUser?.role === 'MANAGER' ? 'Manager' : currentUser?.role === 'STAFF' ? 'Staff' : 'Assistant Manager'})
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onNavigate && isManager && (
            <button
              onClick={() => onNavigate('dashboard')}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer min-h-[44px]"
            >
              Manager Dashboard &rarr;
            </button>
          )}
        </div>
      </div>

      {/* Venue Switcher Bar */}
      <div className="bg-white p-2 rounded-2xl border-2 border-slate-200 shadow-2xs flex items-center gap-2 overflow-x-auto">
        <div className="px-3 py-1 text-xs font-bold font-mono uppercase text-slate-400 flex items-center gap-1.5 shrink-0">
          <Building2 className="w-4 h-4 text-slate-500" />
          <span>VENUE:</span>
        </div>
        <button
          type="button"
          onClick={() => {
            soundSynth.playTap();
            setSelectedVenueFilter('ALL');
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer whitespace-nowrap min-h-[40px] flex items-center gap-2 ${
            selectedVenueFilter === 'ALL'
              ? 'bg-slate-900 text-white shadow-sm font-extrabold'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          <span>All Venues</span>
        </button>
        {venues.map(v => (
          <button
            key={v.id}
            type="button"
            onClick={() => {
              soundSynth.playTap();
              setSelectedVenueFilter(v.id);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer whitespace-nowrap min-h-[40px] flex items-center gap-2 ${
              selectedVenueFilter === v.id
                ? 'bg-orange-600 text-white shadow-sm font-extrabold'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <span>{v.name}</span>
          </button>
        ))}
      </div>

      {/* 4 Simple Status Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* 1. NEEDS ACTION */}
        <button
          type="button"
          onClick={() => {
            soundSynth.playTap();
            setSelectedFilter(selectedFilter === 'NEEDS_ACTION' ? 'ALL' : 'NEEDS_ACTION');
          }}
          className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer shadow-2xs ${
            selectedFilter === 'NEEDS_ACTION'
              ? 'bg-red-500 text-white border-red-600 ring-2 ring-red-400'
              : 'bg-white hover:bg-red-50/50 border-slate-200 text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase font-mono tracking-wider flex items-center gap-1.5">
              <AlertCircle className={`w-4 h-4 ${selectedFilter === 'NEEDS_ACTION' ? 'text-white' : 'text-red-500'}`} />
              NEEDS ACTION
            </span>
            <span className={`text-2xl font-black font-mono ${selectedFilter === 'NEEDS_ACTION' ? 'text-white' : 'text-red-600'}`}>
              {needsActionCount}
            </span>
          </div>
          <p className={`text-xs font-medium ${selectedFilter === 'NEEDS_ACTION' ? 'text-red-100' : 'text-slate-500'}`}>
            Must do right now
          </p>
        </button>

        {/* 2. COMING UP / DUE SOON */}
        <button
          type="button"
          onClick={() => {
            soundSynth.playTap();
            setSelectedFilter(selectedFilter === 'DUE_SOON' ? 'ALL' : 'DUE_SOON');
          }}
          className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer shadow-2xs ${
            selectedFilter === 'DUE_SOON'
              ? 'bg-amber-500 text-white border-amber-600 ring-2 ring-amber-400'
              : 'bg-white hover:bg-amber-50/50 border-slate-200 text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase font-mono tracking-wider flex items-center gap-1.5">
              <Clock3 className={`w-4 h-4 ${selectedFilter === 'DUE_SOON' ? 'text-white' : 'text-amber-500'}`} />
              COMING UP
            </span>
            <span className={`text-2xl font-black font-mono ${selectedFilter === 'DUE_SOON' ? 'text-white' : 'text-amber-600'}`}>
              {dueSoonCount}
            </span>
          </div>
          <p className={`text-xs font-medium ${selectedFilter === 'DUE_SOON' ? 'text-amber-100' : 'text-slate-500'}`}>
            Due soon / In progress
          </p>
        </button>

        {/* 3. DONE */}
        <button
          type="button"
          onClick={() => {
            soundSynth.playTap();
            setSelectedFilter(selectedFilter === 'DONE' ? 'ALL' : 'DONE');
          }}
          className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer shadow-2xs ${
            selectedFilter === 'DONE'
              ? 'bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-400'
              : 'bg-white hover:bg-emerald-50/50 border-slate-200 text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase font-mono tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className={`w-4 h-4 ${selectedFilter === 'DONE' ? 'text-white' : 'text-emerald-500'}`} />
              COMPLETED
            </span>
            <span className={`text-2xl font-black font-mono ${selectedFilter === 'DONE' ? 'text-white' : 'text-emerald-600'}`}>
              {completedCount}
            </span>
          </div>
          <p className={`text-xs font-medium ${selectedFilter === 'DONE' ? 'text-emerald-100' : 'text-slate-500'}`}>
            Finished shift items
          </p>
        </button>

        {/* 4. WAITING FOR MANAGER */}
        <button
          type="button"
          onClick={() => {
            soundSynth.playTap();
            setSelectedFilter(selectedFilter === 'WAITING_MANAGER' ? 'ALL' : 'WAITING_MANAGER');
          }}
          className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer shadow-2xs ${
            selectedFilter === 'WAITING_MANAGER'
              ? 'bg-blue-600 text-white border-blue-700 ring-2 ring-blue-400'
              : 'bg-white hover:bg-blue-50/50 border-slate-200 text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase font-mono tracking-wider flex items-center gap-1.5">
              <ShieldCheck className={`w-4 h-4 ${selectedFilter === 'WAITING_MANAGER' ? 'text-white' : 'text-blue-500'}`} />
              WAITING MGR
            </span>
            <span className={`text-2xl font-black font-mono ${selectedFilter === 'WAITING_MANAGER' ? 'text-white' : 'text-blue-600'}`}>
              {waitingManagerCount}
            </span>
          </div>
          <p className={`text-xs font-medium ${selectedFilter === 'WAITING_MANAGER' ? 'text-blue-100' : 'text-slate-500'}`}>
            Awaiting verification (No alarm)
          </p>
        </button>
      </div>

      {/* "WHAT DO I DO NEXT?" PRIORITY SPOTLIGHT */}
      {prioritizedNextAction && selectedFilter === 'ALL' && (
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white p-5 rounded-3xl shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider bg-black/20 px-3 py-1 rounded-full font-mono flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
              WHAT TO DO RIGHT NOW
            </span>
            <span className="text-xs font-bold text-orange-100">
              {prioritizedNextAction.label}
            </span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/10 backdrop-blur-xs p-4 rounded-2xl border border-white/20">
            <div>
              <h3 className="text-xl md:text-2xl font-black tracking-tight text-white">
                {prioritizedNextAction.type === 'CHECK'
                  ? `${prioritizedNextAction.data.item.name} (${prioritizedNextAction.data.area.name})`
                  : prioritizedNextAction.type === 'ISSUE'
                  ? `${prioritizedNextAction.data.itemName} — ${prioritizedNextAction.data.specificProblems.join(', ')}`
                  : prioritizedNextAction.data.title}
              </h3>
              <p className="text-xs md:text-sm text-orange-100 mt-1 font-medium">
                {prioritizedNextAction.type === 'CHECK'
                  ? 'Check cleanliness, lights, and equipment condition.'
                  : prioritizedNextAction.type === 'ISSUE'
                  ? `Assigned: ${prioritizedNextAction.data.departmentName} • Discovered: ${formatDateTime(prioritizedNextAction.data.discoveredAt)}`
                  : `Priority: ${prioritizedNextAction.data.priority} • ${prioritizedNextAction.data.notes || 'Daily task'}`}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {prioritizedNextAction.type === 'CHECK' ? (
                <>
                  <button
                    onClick={() => handleQuickPass(prioritizedNextAction.data.item, prioritizedNextAction.data.area)}
                    className="px-4 py-3 bg-white hover:bg-orange-50 active:bg-orange-100 text-orange-600 font-black rounded-xl text-sm shadow cursor-pointer flex items-center gap-2 min-h-[48px]"
                  >
                    <Check className="w-5 h-5 text-emerald-600" />
                    <span>PASS (ALL GOOD)</span>
                  </button>
                  <button
                    onClick={() => handleOpenProblemModal(prioritizedNextAction.data.item, prioritizedNextAction.data.area)}
                    className="px-4 py-3 bg-black/30 hover:bg-black/40 text-white font-bold rounded-xl text-sm cursor-pointer flex items-center gap-2 min-h-[48px]"
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-300" />
                    <span>PROBLEM</span>
                  </button>
                </>
              ) : prioritizedNextAction.type === 'ISSUE' ? (
                prioritizedNextAction.data.currentStatus === 'NOT_READY' ? (
                  <button
                    onClick={() => handleStartFixIssue(prioritizedNextAction.data)}
                    className="px-5 py-3 bg-white hover:bg-orange-50 active:bg-orange-100 text-orange-600 font-black rounded-xl text-sm shadow cursor-pointer flex items-center gap-2 min-h-[48px]"
                  >
                    <PlayCircle className="w-5 h-5 text-orange-600" />
                    <span>START FIX / FOLLOW UP</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleOpenFixModal(prioritizedNextAction.data)}
                    className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-sm shadow cursor-pointer flex items-center gap-2 min-h-[48px]"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>MARK FIXED / DONE</span>
                  </button>
                )
              ) : (
                <button
                  onClick={() => {
                    soundSynth.playTap();
                    setTaskToMarkDone(prioritizedNextAction.data);
                  }}
                  className="px-5 py-3 bg-white hover:bg-orange-50 text-orange-600 font-black rounded-xl text-sm shadow cursor-pointer flex items-center gap-2 min-h-[48px]"
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>COMPLETE TASK</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ALL CAUGHT UP STATE */}
      {isAllCaughtUp && selectedFilter === 'ALL' && (
        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-3xl p-8 text-center space-y-3 shadow-2xs">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h3 className="text-2xl md:text-3xl font-black text-emerald-900 tracking-tight">
            YOU'RE ALL CAUGHT UP ✓
          </h3>
          <p className="text-sm text-emerald-700 max-w-md mx-auto font-medium">
            All active operational tasks and issues have been resolved or submitted for Manager verification. No pending actions remaining!
          </p>
        </div>
      )}

      {/* MAIN OPERATIONAL TASK LIST */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-slate-900 tracking-wide uppercase font-mono flex items-center gap-2">
            <span>OPERATIONAL WORKLIST</span>
            {selectedFilter !== 'ALL' && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold">
                Filtered: {selectedFilter.replace('_', ' ')}
              </span>
            )}
          </h3>
          {selectedFilter !== 'ALL' && (
            <button
              onClick={() => setSelectedFilter('ALL')}
              className="text-xs text-orange-600 font-bold hover:underline cursor-pointer"
            >
              Show All Tasks
            </button>
          )}
        </div>

        {/* 1. Actionable Issues */}
        {(selectedFilter === 'ALL' || selectedFilter === 'NEEDS_ACTION' || selectedFilter === 'DUE_SOON') && actionableIssues.length > 0 && (
          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">
              Issues Requiring Fix / Follow Up ({actionableIssues.length})
            </div>
            {actionableIssues.map(issue => {
              const isNotReady = issue.currentStatus === 'NOT_READY';
              return (
                <div 
                  key={issue.id}
                  className={`p-4 md:p-5 rounded-2xl border-2 transition-all shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isNotReady ? 'bg-white border-red-200 hover:border-red-400' : 'bg-amber-50/40 border-amber-200'
                  }`}
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-black px-2.5 py-1 rounded-lg font-mono flex items-center gap-1 ${
                        isNotReady ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {isNotReady ? <AlertCircle className="w-3.5 h-3.5 text-red-600" /> : <Clock3 className="w-3.5 h-3.5 text-amber-600" />}
                        {isNotReady ? 'ACTION REQUIRED' : 'IN PROCESS'}
                      </span>
                      <span className="text-xs font-bold text-slate-500 font-mono">
                        {issue.areaName}
                      </span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                        {issue.departmentName}
                      </span>
                    </div>

                    <h4 className="text-lg font-black text-slate-900">
                      {issue.itemName} — {issue.specificProblems.join(', ') || 'Problem Reported'}
                    </h4>

                    {issue.customNote && (
                      <p className="text-xs text-slate-600 italic bg-slate-50 p-2 rounded-lg border border-slate-200 max-w-xl">
                        "{issue.customNote}"
                      </p>
                    )}

                    {/* Defect Photos Thumbnails if any */}
                    {(() => {
                      const issuePhotos = Array.isArray(issue.photos) && issue.photos.length > 0
                        ? issue.photos
                        : (issue.photoUrl ? [issue.photoUrl] : []);

                      if (issuePhotos.length === 0) return null;

                      return (
                        <div className="flex items-center gap-2 pt-1 flex-wrap">
                          <span className="text-[11px] font-bold text-slate-500 font-mono">Photos ({issuePhotos.length}):</span>
                          {issuePhotos.map((photo, pIdx) => (
                            <img
                              key={pIdx}
                              src={photo}
                              alt={`Defect ${pIdx + 1}`}
                              onClick={() => setEnlargedPhotoUrl(photo)}
                              className="w-10 h-10 object-cover rounded-lg border border-slate-300 cursor-pointer hover:opacity-85 shadow-2xs"
                            />
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isNotReady ? (
                      <button
                        onClick={() => handleStartFixIssue(issue)}
                        className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow min-h-[44px] cursor-pointer"
                      >
                        <PlayCircle className="w-4 h-4" />
                        <span>FIX / FOLLOW UP</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenFixModal(issue)}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow min-h-[44px] cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>MARK FIXED / DONE</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 2. Actionable Daily Tasks */}
        {(selectedFilter === 'ALL' || selectedFilter === 'NEEDS_ACTION' || selectedFilter === 'DUE_SOON') && pendingTasks.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">
              Daily Shift Tasks ({pendingTasks.length})
            </div>
            {pendingTasks.map(task => {
              const isUrgent = task.priority === 'URGENT' || task.priority === 'HIGH';
              return (
                <div 
                  key={task.id}
                  className="p-4 md:p-5 bg-white border-2 border-slate-200 hover:border-slate-300 rounded-2xl shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-md font-mono ${
                        isUrgent ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {task.priority} PRIORITY
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        Assigned by {task.createdByName}
                      </span>
                    </div>

                    <h4 className="text-lg font-black text-slate-900">
                      {task.title}
                    </h4>

                    {task.notes && (
                      <p className="text-xs text-slate-600">
                        {task.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        soundSynth.playTap();
                        setTaskToMarkDone(task);
                      }}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow min-h-[44px] cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>MARK DONE</span>
                    </button>
                    <button
                      onClick={() => {
                        soundSynth.playTap();
                        setTaskToMarkNotDone(task);
                      }}
                      className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold min-h-[44px] cursor-pointer"
                    >
                      Can't Complete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 3. Venue Quick Check Item Cards */}
        {(selectedFilter === 'ALL' || selectedFilter === 'NEEDS_ACTION') && (
          <div className="space-y-3 pt-2">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono flex items-center justify-between">
              <span>Venue Room & Table Checks ({allVenueItems.filter(i => i.status === 'NOT_CHECKED').length} unchecked)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {allVenueItems.map(({ item, area, status }) => {
                const isChecked = status === 'CHECKED';
                const isProblem = status === 'PROBLEM';

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl border-2 flex items-center justify-between gap-3 transition-all ${
                      isChecked
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : isProblem
                        ? 'bg-red-50/50 border-red-200'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="text-[11px] font-bold text-slate-500 font-mono uppercase">
                        {area.name}
                      </div>
                      <div className="text-base font-black text-slate-900">
                        {item.name}
                      </div>
                      <div className="text-xs font-medium text-slate-500 mt-0.5">
                        {isChecked ? (
                          <span className="text-emerald-700 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Checked & Ready
                          </span>
                        ) : isProblem ? (
                          <span className="text-red-600 font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" /> Problem Reported
                          </span>
                        ) : (
                          'Ready for condition check'
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!isChecked && (
                        <button
                          type="button"
                          onClick={() => handleQuickPass(item, area)}
                          className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black rounded-xl text-xs flex items-center gap-1 shadow cursor-pointer min-h-[44px]"
                          title="Pass & mark ready"
                        >
                          <Check className="w-4 h-4" />
                          <span>PASS</span>
                        </button>
                      )}

                      {!isProblem && (
                        <button
                          type="button"
                          onClick={() => handleOpenProblemModal(item, area)}
                          className={`px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer min-h-[44px] ${
                            isChecked
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              : 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                          }`}
                          title="Report a problem"
                        >
                          <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                          <span>PROBLEM</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. WAITING FOR MANAGER SECTION */}
        {(selectedFilter === 'ALL' || selectedFilter === 'WAITING_MANAGER') && waitingManagerIssues.length > 0 && (
          <div className="space-y-3 pt-3">
            <div className="text-xs font-bold text-blue-700 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>Waiting for Manager Verification ({waitingManagerIssues.length})</span>
            </div>

            {waitingManagerIssues.map(issue => (
              <div 
                key={issue.id}
                className="p-4 bg-blue-50/50 border-2 border-blue-200 rounded-2xl flex items-center justify-between gap-4"
              >
                <div>
                  <div className="text-xs font-bold text-blue-600 font-mono uppercase">
                    {issue.areaName} • {issue.departmentName}
                  </div>
                  <div className="text-base font-black text-slate-900">
                    {issue.itemName} — {issue.specificProblems.join(', ')}
                  </div>
                  <div className="text-xs text-blue-700 font-medium mt-0.5">
                    ✓ Submitted by {issue.resolutionInfo?.resolvedByName || 'Assistant Manager'}. Manager will verify. (No reminders).
                  </div>
                </div>

                <span className="text-xs font-mono font-black px-3 py-1.5 bg-blue-100 text-blue-800 rounded-xl border border-blue-200 shrink-0">
                  SUBMITTED
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* QUICK REPORT PROBLEM MODAL */}
      {problemModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white border-2 border-slate-200 rounded-3xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <span className="text-xs font-mono text-red-600 font-bold uppercase">{problemModalItem.area.name}</span>
                <h3 className="text-xl font-black text-slate-900">{problemModalItem.item.name} — What's Wrong?</h3>
              </div>
              <button
                onClick={() => setProblemModalItem(null)}
                className="p-2 text-slate-400 hover:text-slate-800 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Predefined Problem Chips */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 uppercase font-mono">Select Issue Type:</label>
              <div className="flex flex-wrap gap-2">
                {['DIRTY / NEEDS CLEANING', 'LIGHT NOT WORKING', 'AC / COOLING ISSUE', 'BROKEN / DAMAGED', 'MISSING SUPPLIES', 'LEAKING / WATER'].map(reason => {
                  const isSel = selectedProblems.includes(reason);
                  return (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => {
                        soundSynth.playTap();
                        if (isSel) setSelectedProblems(selectedProblems.filter(r => r !== reason));
                        else setSelectedProblems([...selectedProblems, reason]);
                      }}
                      className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[44px] ${
                        isSel
                          ? 'bg-red-500 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                      }`}
                    >
                      {reason}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Problem Note */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase font-mono">Or Describe Problem:</label>
              <input
                type="text"
                value={customProblemText}
                onChange={(e) => setCustomProblemText(e.target.value)}
                placeholder="e.g. cue stick broken, table cloth stained..."
                className="w-full bg-slate-50 text-slate-900 text-sm font-medium px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-red-500 min-h-[44px]"
              />
            </div>

            {/* Department Assignment */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase font-mono">Responsible Department:</label>
              <select
                value={selectedDepartmentId}
                onChange={(e) => setSelectedDepartmentId(e.target.value)}
                className="w-full bg-slate-50 text-slate-900 text-sm font-bold border border-slate-300 rounded-xl px-3.5 py-2.5 cursor-pointer"
              >
                {template.departments.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setProblemModalItem(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitProblem}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black shadow cursor-pointer min-h-[44px]"
              >
                Submit Problem
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESOLVE / FIX ISSUE MODAL */}
      {fixModalIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white border-2 border-slate-200 rounded-3xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <span className="text-xs font-mono text-emerald-600 font-bold uppercase">{fixModalIssue.areaName}</span>
                <h3 className="text-xl font-black text-slate-900">Mark Fixed: {fixModalIssue.itemName}</h3>
              </div>
              <button
                onClick={() => setFixModalIssue(null)}
                className="p-2 text-slate-400 hover:text-slate-800 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
              <strong>Reported Problem:</strong> {fixModalIssue.specificProblems.join(', ')}
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase font-mono">Resolution Notes (Optional):</label>
              <input
                type="text"
                value={fixNote}
                onChange={(e) => setFixNote(e.target.value)}
                placeholder="e.g. Light bulb replaced and tested OK"
                className="w-full bg-slate-50 text-slate-900 text-sm font-medium px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-emerald-500 min-h-[44px]"
              />
            </div>

            {/* Photo Attachment (Optional) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-600 uppercase font-mono">
                  Proof Photos (Optional) {fixPhotos.length > 0 && `(${fixPhotos.length})`}:
                </label>
                <button
                  type="button"
                  onClick={() => setIsPhotoModalOpen(true)}
                  className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>+ Take Photo</span>
                </button>
              </div>

              {fixPhotos.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  {fixPhotos.map((photo, idx) => (
                    <div key={idx} className="relative group rounded-xl overflow-hidden border border-emerald-400 bg-white shadow-2xs">
                      <img src={photo} alt={`Proof ${idx + 1}`} className="w-16 h-16 object-cover" />
                      <button
                        type="button"
                        onClick={() => setFixPhotos(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center text-xs shadow hover:bg-red-700 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <span className="absolute bottom-0 inset-x-0 bg-emerald-900/80 text-white text-[9px] text-center font-bold">
                        #{idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsPhotoModalOpen(true)}
                  className="w-full py-3 bg-slate-100 hover:bg-slate-200 border-2 border-dashed border-slate-300 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Take Photo with Tablet Camera</span>
                </button>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setFixModalIssue(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitFix}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow cursor-pointer min-h-[44px]"
              >
                Submit to Manager
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Done & Not Done Modals */}
      {taskToMarkDone && (
        <TaskDoneModal
          isOpen={true}
          task={taskToMarkDone}
          onClose={() => setTaskToMarkDone(null)}
        />
      )}

      {taskToMarkNotDone && (
        <TaskNotDoneModal
          isOpen={true}
          task={taskToMarkNotDone}
          onClose={() => setTaskToMarkNotDone(null)}
        />
      )}

      {/* Camera Capture Modal */}
      {isPhotoModalOpen && (
        <PhotoCaptureModal
          isOpen={true}
          title="Capture Proof Photo"
          onClose={() => setIsPhotoModalOpen(false)}
          onCapture={(photoData) => {
            setFixPhotos(prev => [...prev, photoData]);
            setIsPhotoModalOpen(false);
          }}
        />
      )}

      {/* Enlarged Photo Modal */}
      {enlargedPhotoUrl && (
        <div 
          onClick={() => setEnlargedPhotoUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 cursor-pointer"
        >
          <div className="max-w-4xl max-h-[90vh] relative">
            <img src={enlargedPhotoUrl} alt="Enlarged" className="max-h-[85vh] max-w-full object-contain rounded-2xl" />
            <button className="absolute top-4 right-4 p-2 bg-white text-slate-900 rounded-full font-bold shadow-lg">✕</button>
          </div>
        </div>
      )}
    </div>
  );
};
