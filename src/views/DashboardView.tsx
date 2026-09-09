import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { formatDate, formatDateTime } from '../utils/crypto';
import { DailyTask } from '../types';
import { DailyTaskModal } from '../components/DailyTaskModal';
import { TaskDoneModal } from '../components/TaskDoneModal';
import { TaskNotDoneModal } from '../components/TaskNotDoneModal';
import { 
  ClipboardCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  ShieldCheck, 
  PlayCircle, 
  CheckCircle, 
  Layers,
  Building2,
  Calendar,
  Sparkles,
  RefreshCw,
  CheckSquare,
  Plus,
  Flag,
  XCircle,
  User,
  History as HistoryIcon
} from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (tab: string, filterStatus?: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { currentUser, currentRole } = useAuth();
  const { 
    settings, 
    template, 
    todayDate, 
    todayInspection, 
    todayIssues, 
    todayTasks,
    todayOpenTasksCount,
    todayDoneTasksCount,
    todayNotDoneTasksCount,
    startTodayInspection,
    startDailyTask
  } = useData();

  const isManager = currentRole === 'MANAGER';

  // Task modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskToMarkDone, setTaskToMarkDone] = useState<DailyTask | null>(null);
  const [taskToMarkNotDone, setTaskToMarkNotDone] = useState<DailyTask | null>(null);

  // Calculate metrics
  const totalTemplateItems = template.areas.reduce((acc, a) => acc + a.items.length, 0);
  const totalInspected = todayInspection ? (todayInspection.readyItems + todayInspection.notReadyItems) : 0;
  const readyCount = todayInspection?.readyItems || 0;

  const notReadyCount = todayIssues.filter(i => i.currentStatus === 'NOT_READY').length;
  const inProcessCount = todayIssues.filter(i => i.currentStatus === 'IN_PROCESS').length;
  const waitingVerificationCount = todayIssues.filter(i => i.currentStatus === 'WAITING_VERIFICATION').length;
  const verifiedCount = todayIssues.filter(i => i.currentStatus === 'VERIFIED').length;

  const handleStartOrContinueInspection = async () => {
    if (!currentUser) return;
    if (!todayInspection) {
      await startTodayInspection(currentUser);
    }
    onNavigate('inspection');
  };

  // Department breakdown of issues
  const issuesByDepartment = template.departments.map(dept => {
    const count = todayIssues.filter(i => i.departmentId === dept.id && i.currentStatus !== 'VERIFIED').length;
    return { ...dept, count };
  }).filter(d => d.count > 0);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 select-none animate-in fade-in duration-150">
      {/* Top Header: Shift Summary & Inspection Status */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-500 uppercase tracking-wider mb-1">
            <Calendar className="w-3.5 h-3.5 text-orange-500" />
            <span>OPERATIONAL SHIFT: {formatDate(todayDate)}</span>
            <span className="text-slate-400">•</span>
            <span>VENUE: {settings.venueName}</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
            DAILY SUMMARY
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            {todayInspection?.isHandedOver ? (
              <span className="text-green-700 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                Inspection Completed by Manager ({formatDateTime(todayInspection.completedAt)}) • Handed over to Assistant Manager
              </span>
            ) : todayInspection ? (
              <span className="text-yellow-800 font-semibold flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-yellow-600" />
                Inspection In Progress ({todayInspection.readyItems + todayInspection.notReadyItems} / {todayInspection.totalItems} Items Checked)
              </span>
            ) : (
              <span className="text-slate-500">Today's daily walkthrough inspection has not been initiated yet.</span>
            )}
          </p>
        </div>

        {/* Primary Action Button */}
        <div className="flex items-center gap-3">
          {isManager ? (
            <button
              onClick={handleStartOrContinueInspection}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-xl font-black shadow-lg uppercase tracking-wide flex items-center gap-3 transition-all active:scale-[0.98] cursor-pointer min-w-[240px] justify-center"
              id="dashboard-start-inspection-btn"
            >
              {!todayInspection ? (
                <>
                  <PlayCircle className="w-5 h-5 shrink-0" />
                  <span>Start Today's Inspection</span>
                </>
              ) : todayInspection.isHandedOver ? (
                <>
                  <ClipboardCheck className="w-5 h-5 shrink-0 text-white" />
                  <span>View Today's Checklist</span>
                </>
              ) : (
                <>
                  <PlayCircle className="w-5 h-5 shrink-0" />
                  <span>Continue Today's Inspection</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={() => onNavigate('today-issues')}
              className="bg-red-600 hover:bg-red-700 text-white px-8 py-3.5 rounded-xl font-black shadow-lg uppercase tracking-wide flex items-center gap-3 transition-all active:scale-[0.98] cursor-pointer min-w-[240px] justify-center"
              id="dashboard-asst-work-btn"
            >
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>Work On Issues ({notReadyCount + inProcessCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Sleek Summary Metric Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* TOTAL INSPECTED */}
        <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Inspected</p>
          <div className="my-2">
            <p className="text-3xl md:text-4xl font-black text-slate-900">
              {totalInspected} <span className="text-lg font-normal text-slate-400">/ {totalTemplateItems}</span>
            </p>
            <div className="w-full bg-slate-100 h-2 mt-2 rounded-full overflow-hidden">
              <div 
                className="bg-blue-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${totalTemplateItems > 0 ? (totalInspected / totalTemplateItems) * 100 : 0}%` }}
              />
            </div>
          </div>
          <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5" /> Across {template.areas.length} Areas
          </p>
        </div>

        {/* 🟢 READY */}
        <div 
          onClick={() => isManager && onNavigate('inspection')}
          className="bg-green-50 border-2 border-green-200 rounded-2xl p-4 flex flex-col justify-between shadow-sm hover:border-green-300 transition-all cursor-pointer"
        >
          <p className="text-xs font-bold text-green-700 uppercase tracking-wider flex items-center justify-between">
            <span>🟢 Ready</span>
            <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
          </p>
          <div className="my-2">
            <p className="text-3xl md:text-4xl font-black text-green-600 font-mono">
              {readyCount}
            </p>
            <p className="text-xs text-green-700/80 font-mono mt-0.5">
              {totalInspected > 0 ? `${Math.round((readyCount / totalInspected) * 100)}% Passing` : 'Pending Walk'}
            </p>
          </div>
          <p className="text-[11px] font-bold text-green-700/90 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" /> Ready for Guests
          </p>
        </div>

        {/* 🔴 NOT READY */}
        <div 
          onClick={() => onNavigate(isManager ? 'outstanding' : 'today-issues', 'NOT_READY')}
          className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex flex-col justify-between shadow-sm hover:border-red-300 transition-all cursor-pointer"
        >
          <p className="text-xs font-bold text-red-700 uppercase tracking-wider flex items-center justify-between">
            <span>🔴 Not Ready</span>
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          </p>
          <div className="my-2">
            <p className="text-3xl md:text-4xl font-black text-red-600 font-mono">
              {notReadyCount}
            </p>
            <p className="text-xs text-red-700/80 font-mono mt-0.5">
              Identified Defects
            </p>
          </div>
          <p className="text-[11px] font-bold text-red-700/90 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Needs Attention &rarr;
          </p>
        </div>

        {/* 🟡 IN PROCESS */}
        <div 
          onClick={() => onNavigate(isManager ? 'outstanding' : 'in-process', 'IN_PROCESS')}
          className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-4 flex flex-col justify-between shadow-sm hover:border-yellow-300 transition-all cursor-pointer"
        >
          <p className="text-xs font-bold text-yellow-700 uppercase tracking-wider flex items-center justify-between">
            <span>🟡 In Process</span>
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
          </p>
          <div className="my-2">
            <p className="text-3xl md:text-4xl font-black text-yellow-600 font-mono">
              {inProcessCount}
            </p>
            <p className="text-xs text-yellow-700/80 font-mono mt-0.5">
              Divisions Working
            </p>
          </div>
          <p className="text-[11px] font-bold text-yellow-700/90 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Active Correction &rarr;
          </p>
        </div>

        {/* 🔵 WAITING VERIFICATION */}
        <div 
          onClick={() => onNavigate(isManager ? 'outstanding' : 'waiting-verification', 'WAITING_VERIFICATION')}
          className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 flex flex-col justify-between shadow-sm hover:border-blue-300 transition-all cursor-pointer"
        >
          <p className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center justify-between">
            <span>🔵 Verification</span>
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          </p>
          <div className="my-2">
            <p className="text-3xl md:text-4xl font-black text-blue-600 font-mono">
              {waitingVerificationCount}
            </p>
            <p className="text-xs text-blue-700/80 font-mono mt-0.5">
              Reported Resolved
            </p>
          </div>
          <p className="text-[11px] font-bold text-blue-700/90 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Manager Check &rarr;
          </p>
        </div>

        {/* ✅ VERIFIED */}
        <div 
          onClick={() => onNavigate(isManager ? 'outstanding' : 'today-issues', 'VERIFIED')}
          className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4 flex flex-col justify-between shadow-sm hover:border-emerald-300 transition-all cursor-pointer"
        >
          <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center justify-between">
            <span>✅ Verified</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </p>
          <div className="my-2">
            <p className="text-3xl md:text-4xl font-black text-emerald-600 font-mono">
              {verifiedCount}
            </p>
            <p className="text-xs text-emerald-700/80 font-mono mt-0.5">
              Closed & Verified
            </p>
          </div>
          <p className="text-[11px] font-bold text-emerald-700/90 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed Ready
          </p>
        </div>
      </div>

      {/* NEW: MANAGER → ASSISTANT MANAGER DAILY TASKS WIDGET */}
      <div className="bg-white border-2 border-orange-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-slate-900">
                  Manager → AM Daily Tasks
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-orange-600 text-white">
                  {todayOpenTasksCount} Open
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Direct operational assignments and shift duties for Assistant Manager
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isManager && (
              <button
                type="button"
                onClick={() => setIsTaskModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                id="dashboard-btn-create-task"
              >
                <Plus className="w-4 h-4" />
                <span>Assign Task</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onNavigate('daily-tasks')}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all flex items-center gap-1 cursor-pointer"
              id="dashboard-btn-view-all-tasks"
            >
              <span>View All ({todayTasks.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {todayTasks.length === 0 ? (
          <div className="bg-orange-50/40 border border-orange-100 rounded-xl p-6 text-center text-slate-500">
            <p className="text-sm font-semibold text-slate-700">No Manager Tasks Assigned for Today</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {isManager ? 'Click "Assign Task" to create shift assignments for the Assistant Manager.' : 'No additional duties assigned by the General Manager yet.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {todayTasks.slice(0, 6).map((task) => {
              const isUrgent = task.priority === 'URGENT';
              const isHigh = task.priority === 'HIGH';

              return (
                <div
                  key={task.id}
                  className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 transition-all ${
                    task.status === 'DONE'
                      ? 'bg-emerald-50/40 border-emerald-200'
                      : task.status === 'NOT_DONE'
                      ? 'bg-red-50/40 border-red-200'
                      : isUrgent
                      ? 'bg-red-50/20 border-red-300 ring-1 ring-red-200'
                      : isHigh
                      ? 'bg-orange-50/30 border-orange-200'
                      : 'bg-slate-50/70 border-slate-200'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                        isUrgent ? 'bg-red-100 text-red-800' :
                        isHigh ? 'bg-orange-100 text-orange-800' :
                        task.priority === 'NORMAL' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {task.priority}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        task.status === 'DONE' ? 'bg-emerald-100 text-emerald-800' :
                        task.status === 'NOT_DONE' ? 'bg-red-100 text-red-800' :
                        task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2">
                      {task.title}
                    </h4>

                    {task.notes && (
                      <p className="text-xs text-slate-600 line-clamp-2 italic">
                        "{task.notes}"
                      </p>
                    )}

                    {task.status === 'NOT_DONE' && task.completionReason && (
                      <p className="text-xs font-bold text-red-700 bg-red-50 p-1.5 rounded-lg border border-red-100">
                        Not Done: {task.completionReason}
                      </p>
                    )}
                  </div>

                  {/* Actions for Assistant Manager or Manager */}
                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-400">
                      By {task.createdByName}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {task.status === 'PENDING' && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (currentUser) await startDailyTask(task.id, currentUser);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200 transition-colors cursor-pointer"
                        >
                          Start
                        </button>
                      )}

                      {(task.status === 'PENDING' || task.status === 'IN_PROGRESS') && (
                        <>
                          <button
                            type="button"
                            onClick={() => setTaskToMarkDone(task)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                          >
                            Done
                          </button>
                          <button
                            type="button"
                            onClick={() => setTaskToMarkNotDone(task)}
                            className="px-2 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs border border-red-200 transition-colors cursor-pointer"
                          >
                            Not Done
                          </button>
                        </>
                      )}

                      {(task.status === 'DONE' || task.status === 'NOT_DONE') && (
                        <span className="text-[11px] font-semibold text-slate-500">
                          {task.status === 'DONE' ? '✓ Completed' : '✕ Not Done'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Content Grid: Outstanding Issues & Side Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Outstanding Issues */}
        <div className="lg:col-span-8 bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold flex items-center text-slate-900">
              <span className="mr-2">🚨</span> OUTSTANDING ISSUES
            </h3>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-slate-100 rounded-full text-xs font-bold text-slate-700">
                {todayIssues.length} TOTAL
              </span>
              <button
                onClick={() => onNavigate(isManager ? 'outstanding' : 'today-issues')}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 px-2 py-1 cursor-pointer"
              >
                <span>View Full List</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {todayIssues.length === 0 ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-slate-500">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <h4 className="text-base font-bold text-slate-800">No Outstanding Issues Today</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {todayInspection 
                  ? 'All inspected areas are clean, operational, and verified ready for guests.' 
                  : 'Start the daily inspection walkthrough to log operational statuses.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayIssues.slice(0, 5).map((iss) => (
                <div
                  key={iss.id}
                  onClick={() => onNavigate(isManager ? 'outstanding' : 'today-issues')}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-all cursor-pointer gap-3 ${
                    iss.currentStatus === 'NOT_READY' 
                      ? 'bg-red-50 border-red-100 hover:border-red-200' 
                      : iss.currentStatus === 'IN_PROCESS'
                        ? 'bg-yellow-50 border-yellow-100 hover:border-yellow-200'
                        : iss.currentStatus === 'WAITING_VERIFICATION'
                          ? 'bg-blue-50 border-blue-100 hover:border-blue-200'
                          : 'bg-emerald-50 border-emerald-100 hover:border-emerald-200'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white text-lg font-bold shrink-0 shadow-sm ${
                      iss.currentStatus === 'NOT_READY' ? 'bg-red-500' :
                      iss.currentStatus === 'IN_PROCESS' ? 'bg-yellow-500' :
                      iss.currentStatus === 'WAITING_VERIFICATION' ? 'bg-blue-500' : 'bg-emerald-500'
                    }`}>
                      {iss.currentStatus === 'NOT_READY' ? '❌' :
                       iss.currentStatus === 'IN_PROCESS' ? '⚒️' :
                       iss.currentStatus === 'WAITING_VERIFICATION' ? '🔎' : '✓'}
                    </div>

                    <div className="space-y-0.5">
                      <p className="font-black text-slate-900 text-sm md:text-base">
                        {iss.areaName.toUpperCase()} - {iss.itemName}
                      </p>
                      <p className={`text-xs font-semibold ${
                        iss.currentStatus === 'NOT_READY' ? 'text-red-700' :
                        iss.currentStatus === 'IN_PROCESS' ? 'text-yellow-800' :
                        iss.currentStatus === 'WAITING_VERIFICATION' ? 'text-blue-800' : 'text-emerald-800'
                      }`}>
                        Problem: {iss.specificProblems.join(', ')} {iss.customNote && `• ${iss.customNote}`}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Logged at {formatDateTime(iss.discoveredAt)} by {iss.discoveredByName}
                      </p>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-1 shrink-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Department</span>
                    <span className="text-xs font-bold bg-white px-2.5 py-1 border border-slate-200 rounded text-slate-800 shadow-2xs">
                      {iss.departmentName}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column (4 cols): Quick Actions & Department Task Load */}
        <div className="lg:col-span-4 flex flex-col space-y-6">
          {/* Quick Actions Card */}
          <div className="bg-[#0F172A] text-white rounded-2xl p-6 shadow-lg">
            <h3 className="text-xs font-bold mb-4 uppercase tracking-wider text-slate-400">
              Quick Actions
            </h3>
            <div className="space-y-3">
              {isManager ? (
                <button 
                  onClick={() => onNavigate('inspection')}
                  className="w-full bg-[#1E293B] hover:bg-slate-800 p-3.5 rounded-xl border border-slate-700 flex items-center justify-between font-bold text-sm text-white transition-colors cursor-pointer"
                >
                  <span>Daily Inspection</span>
                  <span className="text-orange-400">➔</span>
                </button>
              ) : (
                <button 
                  onClick={() => onNavigate('today-issues')}
                  className="w-full bg-[#1E293B] hover:bg-slate-800 p-3.5 rounded-xl border border-slate-700 flex items-center justify-between font-bold text-sm text-white transition-colors cursor-pointer"
                >
                  <span>View Department Tasks</span>
                  <span className="text-orange-400">➔</span>
                </button>
              )}

              <button 
                onClick={() => onNavigate('daily-tasks')}
                className="w-full bg-[#1E293B] hover:bg-slate-800 p-3.5 rounded-xl border border-slate-700 flex items-center justify-between font-bold text-sm text-orange-400 transition-colors cursor-pointer"
              >
                <span>Manager → AM Tasks</span>
                <span>📋</span>
              </button>

              <button 
                onClick={() => onNavigate('history')}
                className="w-full bg-[#1E293B] hover:bg-slate-800 p-3.5 rounded-xl border border-slate-700 flex items-center justify-between font-bold text-sm text-white transition-colors cursor-pointer"
              >
                <span>Export Daily Report</span>
                <span className="text-slate-400">⎙</span>
              </button>

              {isManager && (
                <button 
                  onClick={() => onNavigate('settings')}
                  className="w-full bg-[#1E293B] hover:bg-slate-800 p-3.5 rounded-xl border border-slate-700 flex items-center justify-between font-bold text-sm text-orange-400 transition-colors cursor-pointer"
                >
                  <span>Backup Local Database</span>
                  <span>☁️</span>
                </button>
              )}
            </div>
          </div>

          {/* Department Task Load Card */}
          <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span>Department Task Load</span>
            </h3>

            {issuesByDepartment.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                No active department task assignments today.
              </div>
            ) : (
              <div className="space-y-2">
                {issuesByDepartment.map(dept => (
                  <div key={dept.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: dept.color || '#3b82f6' }} />
                      <span className="text-xs font-bold text-slate-800">{dept.name}</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-lg bg-white text-red-600 font-bold font-mono text-xs border border-slate-200 shadow-2xs">
                      {dept.count} {dept.count === 1 ? 'Task' : 'Tasks'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="pt-6 pb-2 text-center text-xs text-slate-400 font-mono tracking-wide">
        made by : Ryan Gerrit
      </div>

      {/* Task Creation and Status Modals */}
      {isTaskModalOpen && (
        <DailyTaskModal
          isOpen={isTaskModalOpen}
          onClose={() => setIsTaskModalOpen(false)}
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
    </div>
  );
};
