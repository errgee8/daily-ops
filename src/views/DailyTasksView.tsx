import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { DailyTask, TaskPriority, TaskStatus } from '../types';
import { DailyTaskModal } from '../components/DailyTaskModal';
import { TaskNotDoneModal } from '../components/TaskNotDoneModal';
import { TaskDoneModal } from '../components/TaskDoneModal';
import { 
  CheckSquare, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  PlayCircle, 
  Edit2, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  Flag, 
  User, 
  History, 
  ArrowRight,
  Info,
  Layers,
  Sparkles,
  Building2
} from 'lucide-react';

export const DailyTasksView: React.FC = () => {
  const { currentUser, isManager, isAssistantManager } = useAuth();
  const { 
    dailyTasks, 
    todayDate, 
    startDailyTask, 
    deleteDailyTaskById,
    venues,
    selectedVenueFilter,
    setSelectedVenueFilter
  } = useData();

  // Filters & State
  const [selectedDate, setSelectedDate] = useState<string>(todayDate);
  const [showAllDates, setShowAllDates] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'ALL'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedTaskHistory, setExpandedTaskHistory] = useState<Record<string, boolean>>({});

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<DailyTask | null>(null);
  const [taskToMarkDone, setTaskToMarkDone] = useState<DailyTask | null>(null);
  const [taskToMarkNotDone, setTaskToMarkNotDone] = useState<DailyTask | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<DailyTask | null>(null);

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    return dailyTasks.filter(task => {
      // Venue filter
      if (selectedVenueFilter !== 'ALL' && task.venueId && task.venueId !== selectedVenueFilter) {
        return false;
      }
      // Date filter
      if (!showAllDates && task.date !== selectedDate) {
        return false;
      }
      // Status filter
      if (statusFilter !== 'ALL' && task.status !== statusFilter) {
        return false;
      }
      // Priority filter
      if (priorityFilter !== 'ALL' && task.priority !== priorityFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = task.title.toLowerCase().includes(q);
        const matchNotes = task.notes ? task.notes.toLowerCase().includes(q) : false;
        const matchReason = task.completionReason ? task.completionReason.toLowerCase().includes(q) : false;
        const matchCreator = task.createdByName.toLowerCase().includes(q);
        const matchVenue = task.venueName ? task.venueName.toLowerCase().includes(q) : false;
        if (!matchTitle && !matchNotes && !matchReason && !matchCreator && !matchVenue) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      // Sort priority order: URGENT -> HIGH -> IMPORTANT -> NORMAL -> LOW, then status
      const priorityWeight: Record<TaskPriority, number> = { URGENT: 5, HIGH: 4, IMPORTANT: 3, NORMAL: 2, LOW: 1 };
      const statusWeight: Record<TaskStatus, number> = { 
        IN_PROGRESS: 6, 
        PENDING: 5, 
        ASSIGNED: 5, 
        OVERDUE: 4, 
        NOT_DONE: 3, 
        SKIPPED: 2, 
        DONE: 1, 
        COMPLETED: 1, 
        CANCELLED: 0 
      };
      
      const pDiff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
      if (pDiff !== 0) return pDiff;

      const sDiff = (statusWeight[b.status] || 0) - (statusWeight[a.status] || 0);
      if (sDiff !== 0) return sDiff;

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [dailyTasks, selectedDate, showAllDates, statusFilter, priorityFilter, searchQuery, selectedVenueFilter]);

  // Statistics for currently selected date or all dates (filtered by venue)
  const stats = useMemo(() => {
    const venueFiltered = selectedVenueFilter === 'ALL' 
      ? dailyTasks 
      : dailyTasks.filter(t => !t.venueId || t.venueId === selectedVenueFilter);
    const relevantTasks = showAllDates ? venueFiltered : venueFiltered.filter(t => t.date === selectedDate);
    const total = relevantTasks.length;
    const pending = relevantTasks.filter(t => t.status === 'PENDING').length;
    const inProgress = relevantTasks.filter(t => t.status === 'IN_PROGRESS').length;
    const done = relevantTasks.filter(t => t.status === 'DONE').length;
    const notDone = relevantTasks.filter(t => t.status === 'NOT_DONE').length;
    const open = pending + inProgress;
    return { total, pending, inProgress, done, notDone, open };
  }, [dailyTasks, selectedDate, showAllDates, selectedVenueFilter]);

  const toggleHistory = (taskId: string) => {
    setExpandedTaskHistory(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  const handleStartTask = async (task: DailyTask) => {
    if (!currentUser) return;
    await startDailyTask(task.id, currentUser);
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete || !currentUser) return;
    await deleteDailyTaskById(taskToDelete.id, currentUser);
    setTaskToDelete(null);
  };

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'URGENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black bg-red-100 text-red-700 border border-red-300">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
            URGENT
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-extrabold bg-orange-100 text-orange-800 border border-orange-300">
            <Flag className="w-3.5 h-3.5 fill-orange-600 text-orange-600" />
            HIGH
          </span>
        );
      case 'NORMAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            NORMAL
          </span>
        );
      case 'LOW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            LOW
          </span>
        );
    }
  };

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            PENDING
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-300">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            IN PROGRESS
          </span>
        );
      case 'DONE':
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            DONE
          </span>
        );
      case 'SKIPPED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-800 border border-purple-300">
            <XCircle className="w-3.5 h-3.5 text-purple-600" />
            SKIPPED
          </span>
        );
      case 'OVERDUE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <Clock className="w-3.5 h-3.5 text-rose-600" />
            OVERDUE
          </span>
        );
      case 'ASSIGNED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-300">
            <Clock className="w-3.5 h-3.5 text-indigo-600" />
            ASSIGNED
          </span>
        );
      case 'NOT_DONE':
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-800 border border-red-300">
            <XCircle className="w-3.5 h-3.5 text-red-600" />
            NOT DONE
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-orange-100 text-orange-800 text-xs font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Operations Duty Log
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {showAllDates ? 'All Historical Records' : selectedDate === todayDate ? "Today's Shift" : selectedDate}
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <CheckSquare className="w-7 h-7 text-orange-600" />
            Daily Manager → AM Tasks
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Direct shift assignments, operational focus items, and special instructions from the General Manager.
          </p>
        </div>

        {/* Manager Create Task Button */}
        {isManager && (
          <button
            onClick={() => {
              setTaskToEdit(null);
              setIsCreateModalOpen(true);
            }}
            className="px-5 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
            id="btn-new-daily-task"
          >
            <Plus className="w-5 h-5" />
            <span>Create New Task</span>
          </button>
        )}
      </div>

      {/* Metrics Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Tasks</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-slate-900">{stats.total}</span>
            <Layers className="w-5 h-5 text-slate-400" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200/80 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Pending</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-amber-700">{stats.pending}</span>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-blue-200/80 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">In Progress</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-blue-700">{stats.inProgress}</span>
            <PlayCircle className="w-5 h-5 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200/80 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Completed</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-emerald-700">{stats.done}</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-red-200/80 shadow-sm flex flex-col justify-between col-span-2 sm:col-span-1">
          <span className="text-xs font-bold text-red-700 uppercase tracking-wider">Not Done</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-red-700">{stats.notDone}</span>
            <XCircle className="w-5 h-5 text-red-500" />
          </div>
        </div>
      </div>

      {/* Venue Switcher Bar */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-2 overflow-x-auto">
        <div className="px-3 py-1 text-xs font-bold font-mono uppercase text-slate-400 flex items-center gap-1.5 shrink-0">
          <Layers className="w-4 h-4 text-slate-500" />
          <span>VENUE:</span>
        </div>
        <button
          type="button"
          onClick={() => setSelectedVenueFilter('ALL')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap min-h-[36px] flex items-center gap-1.5 ${
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
            onClick={() => setSelectedVenueFilter(v.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap min-h-[36px] flex items-center gap-1.5 ${
              selectedVenueFilter === v.id
                ? 'bg-orange-600 text-white shadow-sm font-extrabold'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <span>{v.name}</span>
          </button>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks, notes, reasons, or assigners..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              id="input-search-tasks"
            />
          </div>

          {/* Date Selector and View Toggle */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setShowAllDates(false);
                  setSelectedDate(todayDate);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  !showAllDates && selectedDate === todayDate
                    ? 'bg-white text-slate-900 shadow-sm font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Today
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowAllDates(true);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  showAllDates
                    ? 'bg-white text-slate-900 shadow-sm font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Dates
              </button>
            </div>

            {!showAllDates && (
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                <Calendar className="w-4 h-4 text-slate-500" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setShowAllDates(false);
                  }}
                  className="text-xs font-bold text-slate-800 bg-transparent border-none focus:outline-none cursor-pointer"
                />
              </div>
            )}
          </div>
        </div>

        {/* Status & Priority Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          {/* Status Filter */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Status:
            </span>
            {(['ALL', 'PENDING', 'IN_PROGRESS', 'DONE', 'NOT_DONE'] as const).map((status) => {
              const isActive = statusFilter === status;
              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white font-extrabold shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {status === 'ALL' ? 'All Statuses' : status.replace('_', ' ')}
                </button>
              );
            })}
          </div>

          {/* Priority Filter */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
              <Flag className="w-3.5 h-3.5" /> Priority:
            </span>
            {(['ALL', 'URGENT', 'HIGH', 'NORMAL', 'LOW'] as const).map((priority) => {
              const isActive = priorityFilter === priority;
              return (
                <button
                  key={priority}
                  onClick={() => setPriorityFilter(priority)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-orange-600 text-white font-extrabold shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {priority}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-4">
        {filteredTasks.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm space-y-3">
            <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
              <CheckSquare className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No tasks found</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              {searchQuery || statusFilter !== 'ALL' || priorityFilter !== 'ALL'
                ? 'No tasks match the active filters or search terms.'
                : showAllDates
                ? 'No tasks have been created in the system yet.'
                : `No tasks assigned for ${selectedDate === todayDate ? 'today' : selectedDate}.`}
            </p>
            {isManager && (
              <button
                onClick={() => {
                  setTaskToEdit(null);
                  setIsCreateModalOpen(true);
                }}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Task for this Date</span>
              </button>
            )}
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isHistoryOpen = !!expandedTaskHistory[task.id];
            const isUrgent = task.priority === 'URGENT';
            const isHigh = task.priority === 'HIGH';

            return (
              <div
                key={task.id}
                className={`bg-white rounded-2xl border transition-all shadow-sm overflow-hidden ${
                  isUrgent
                    ? 'border-red-300 ring-1 ring-red-200'
                    : isHigh
                    ? 'border-orange-200'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
                id={`task-card-${task.id}`}
              >
                <div className="p-5">
                  {/* Task Header: Badges and Date */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {getPriorityBadge(task.priority)}
                      {getStatusBadge(task.status)}
                      {task.venueName && (
                        <span className="text-xs font-bold text-orange-700 bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-orange-500" />
                          <span>{task.venueName}</span>
                        </span>
                      )}
                      <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md">
                        {task.date}
                      </span>
                    </div>

                    {/* Manager Actions: Edit & Delete */}
                    {isManager && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setTaskToEdit(task);
                            setIsCreateModalOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Edit Task"
                          aria-label="Edit Task"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setTaskToDelete(task)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Task"
                          aria-label="Delete Task"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Task Title */}
                  <h3 className="text-lg font-bold text-slate-900 mb-2 leading-snug">
                    {task.title}
                  </h3>

                  {/* Special Instructions / Notes */}
                  {task.notes && (
                    <div className="mb-4 p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-700">
                      <span className="text-xs font-bold text-slate-500 block mb-0.5 uppercase tracking-wider">
                        Manager Instructions
                      </span>
                      <p className="whitespace-pre-wrap">{task.notes}</p>
                    </div>
                  )}

                  {/* If NOT DONE: Alert callout with Reason and notes */}
                  {task.status === 'NOT_DONE' && (
                    <div className="mb-4 p-3.5 bg-red-50/90 border border-red-200 rounded-xl text-sm text-red-900 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-red-800">
                        <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                        <span>Reason Not Done: {task.completionReason || 'Unspecified'}</span>
                      </div>
                      {task.completionNote && (
                        <p className="text-xs text-red-700 pl-5 italic">
                          "{task.completionNote}"
                        </p>
                      )}
                      <div className="text-[11px] text-red-600 pl-5 pt-1">
                        Reported by {task.completedByName || 'Staff'} at{' '}
                        {task.completedAt ? new Date(task.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </div>
                    </div>
                  )}

                  {/* If DONE: Completion details callout */}
                  {task.status === 'DONE' && (
                    <div className="mb-4 p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-sm text-emerald-900 space-y-0.5">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Completed by {task.completedByName || 'Assistant Manager'}</span>
                        {task.completedAt && (
                          <span className="text-xs font-normal text-emerald-700">
                            • {new Date(task.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      {task.completionNote && (
                        <p className="text-xs text-emerald-700 pl-5 italic">
                          "{task.completionNote}"
                        </p>
                      )}
                    </div>
                  )}

                  {/* If IN_PROGRESS: Started info */}
                  {task.status === 'IN_PROGRESS' && task.startedByName && (
                    <div className="mb-4 p-2.5 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-center gap-2">
                      <PlayCircle className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>
                        Work in progress — Started by <strong>{task.startedByName}</strong> at{' '}
                        {task.startedAt ? new Date(task.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                  )}

                  {/* Meta Bar & Operational Action Buttons */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        Assigned by <strong className="text-slate-700 font-semibold">{task.createdByName}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Created {new Date(task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Duty Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* If PENDING: allow Starting */}
                      {task.status === 'PENDING' && (
                        <button
                          type="button"
                          onClick={() => handleStartTask(task)}
                          className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200 transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <PlayCircle className="w-3.5 h-3.5" />
                          <span>Start Working</span>
                        </button>
                      )}

                      {/* If PENDING or IN_PROGRESS: allow Mark Done & Not Done */}
                      {(task.status === 'PENDING' || task.status === 'IN_PROGRESS') && (
                        <>
                          <button
                            type="button"
                            onClick={() => setTaskToMarkDone(task)}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Mark Done</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setTaskToMarkNotDone(task)}
                            className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs border border-red-200 transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Mark Not Done</span>
                          </button>
                        </>
                      )}

                      {/* If already DONE or NOT_DONE: allow Assistant Manager or Manager to change status if needed */}
                      {(task.status === 'DONE' || task.status === 'NOT_DONE') && (
                        <button
                          type="button"
                          onClick={() => {
                            if (task.status === 'DONE') {
                              setTaskToMarkNotDone(task);
                            } else {
                              setTaskToMarkDone(task);
                            }
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer"
                        >
                          {task.status === 'DONE' ? 'Change to Not Done' : 'Change to Done'}
                        </button>
                      )}

                      {/* Expand Audit Log Button */}
                      <button
                        type="button"
                        onClick={() => toggleHistory(task.id)}
                        className="px-2.5 py-1.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        title="View audit history"
                      >
                        <History className="w-3.5 h-3.5" />
                        <span>History ({task.history?.length || 1})</span>
                        {isHistoryOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>

                  {/* Expandable Audit Log */}
                  {isHistoryOpen && (
                    <div className="mt-4 pt-4 border-t border-slate-100 bg-slate-50/70 -mx-5 -mb-5 p-5">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <History className="w-3.5 h-3.5 text-slate-500" />
                        Audit Log & Activity History
                      </h4>
                      <div className="space-y-2.5">
                        {(task.history || []).map((log, idx) => (
                          <div key={log.id || idx} className="flex items-start gap-2.5 text-xs text-slate-600">
                            <span className="w-2 h-2 rounded-full bg-slate-400 mt-1 shrink-0" />
                            <div className="flex-1">
                              <span className="font-bold text-slate-800">{log.performedByName}</span>
                              <span className="text-slate-500"> ({log.performedByRole.replace('_', ' ')})</span>:
                              <span className="ml-1 font-medium">{log.notes || log.action}</span>
                              <span className="text-slate-400 ml-2">
                                {new Date(log.timestamp).toLocaleString([], {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Manager / AM Modal Handlers */}
      {isCreateModalOpen && (
        <DailyTaskModal
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false);
            setTaskToEdit(null);
          }}
          taskToEdit={taskToEdit}
          defaultDate={selectedDate}
        />
      )}

      {taskToMarkDone && (
        <TaskDoneModal
          isOpen={!!taskToMarkDone}
          onClose={() => setTaskToMarkDone(null)}
          task={taskToMarkDone}
        />
      )}

      {taskToMarkNotDone && (
        <TaskNotDoneModal
          isOpen={!!taskToMarkNotDone}
          onClose={() => setTaskToMarkNotDone(null)}
          task={taskToMarkNotDone}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {taskToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Delete Daily Task?</h3>
              <p className="text-sm text-slate-500">
                Are you sure you want to permanently delete "{taskToDelete.title}"? This cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setTaskToDelete(null)}
                className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteTask}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 shadow-md transition-all cursor-pointer"
              >
                Delete Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
