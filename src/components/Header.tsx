import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { formatDate } from '../utils/crypto';
import { 
  Shield, 
  UserCheck, 
  Lock, 
  ClipboardCheck, 
  AlertTriangle, 
  History, 
  Layers, 
  Settings, 
  LayoutDashboard,
  Clock,
  Clock3,
  CheckCircle2,
  Calendar,
  CheckSquare,
  StickyNote,
  Users,
  Award
  ,BarChart3
} from 'lucide-react';

interface HeaderProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, onSelectTab }) => {
  const { currentUser, currentRole, logout } = useAuth();
  const { 
    settings, 
    outstandingIssues, 
    allWaitingVerificationIssues, 
    todayDate, 
    todayOpenTasksCount, 
    shiftNotes,
    cloudSyncStatus,
    lastCloudSyncTime,
    syncWithCloud
  } = useData();

  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setCurrentTime(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const isManager = currentRole === 'MANAGER';
  const isLeadership = isManager || currentRole === 'ASSISTANT_MANAGER';
  const totalOutstanding = outstandingIssues.length;
  const waitingVerificationCount = allWaitingVerificationIssues.length;
  const openNotesCount = shiftNotes.filter(n => n.status === 'OPEN' || n.status === 'IN_PROGRESS').length;

  return (
    <header className="bg-[#0F172A] text-white select-none shadow-md sticky top-0 z-30">
      {/* Top Header Bar */}
      <div className="px-4 md:px-8 py-3 bg-[#0F172A] border-b border-slate-800 flex items-center justify-between gap-4">
        {/* Left: Brand & Venue */}
        <div className="flex items-center gap-3">
          <div className="bg-orange-500 w-10 h-10 flex items-center justify-center rounded-xl font-black text-xl text-white shadow-md shrink-0 tracking-tight">
            H.
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-white font-sans">HANDOVER.</h1>
              <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">by Ryan Gerrit</span>
              <button 
                onClick={() => syncWithCloud()}
                title={lastCloudSyncTime ? `Last synced: ${lastCloudSyncTime}. Click to sync.` : 'Click to sync with Supabase'}
                className={`hidden sm:inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-md border ml-1 cursor-pointer transition-colors ${
                  cloudSyncStatus === 'CONNECTED'
                    ? 'text-emerald-400 bg-emerald-950/40 border-emerald-800/60 hover:bg-emerald-900/50'
                    : cloudSyncStatus === 'SYNCING'
                    ? 'text-blue-400 bg-blue-950/40 border-blue-800/60 hover:bg-blue-900/50'
                    : 'text-amber-400 bg-amber-950/40 border-amber-800/60 hover:bg-amber-900/50'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${
                  cloudSyncStatus === 'CONNECTED' ? 'bg-emerald-400' : cloudSyncStatus === 'SYNCING' ? 'bg-blue-400 animate-ping' : 'bg-amber-400'
                }`} />
                {cloudSyncStatus === 'CONNECTED' ? 'CLOUD LIVE' : cloudSyncStatus === 'SYNCING' ? 'SYNCING...' : 'CONNECTING'}
              </button>
            </div>
            <p className="text-xs text-slate-400 uppercase tracking-widest truncate max-w-xs md:max-w-md font-mono">
              {settings.venueName || 'Hospitality Venue Management'}
            </p>
          </div>
        </div>

        {/* Right: User Role Info, Live Time & Lock Button */}
        <div className="flex items-center gap-4 md:gap-6">
          <div className="text-right hidden sm:block">
            <p className="text-xs md:text-sm font-semibold uppercase text-white tracking-wide">
              {isManager ? 'MANAGER' : currentRole === 'STAFF' ? 'STAFF' : 'ASST MANAGER'}: {currentUser?.name || 'Authorized'}
            </p>
            <p className="text-xs text-slate-300 font-mono">
              {formatDate(todayDate)} • {currentTime}
            </p>
          </div>

          {/* Lock System Button */}
          <button
            onClick={logout}
            className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-bold text-sm border border-slate-500 flex items-center gap-2 shadow transition-colors cursor-pointer min-h-[40px]"
            title="Lock application and require PIN"
            id="lock-app-btn"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>LOCK SYSTEM</span>
          </button>

        </div>
      </div>

      {/* Navigation Sub-header Bar */}
      <div className="px-4 md:px-8 py-2.5 bg-[#1E293B] border-b border-slate-800/80 flex items-center justify-between overflow-x-auto scrollbar-none gap-2">
        <nav className="flex items-center gap-2">
          {/* DASHBOARD / TODAY TAB */}
          <button
            onClick={() => onSelectTab('dashboard')}
            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all min-h-[40px] cursor-pointer whitespace-nowrap ${
              currentTab === 'dashboard'
                ? 'bg-orange-600 text-white shadow-md font-extrabold'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
            id="nav-tab-dashboard"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>TODAY</span>
          </button>

          {isLeadership && <button onClick={() => onSelectTab('report')} className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all min-h-[40px] cursor-pointer whitespace-nowrap ${currentTab === 'report' ? 'bg-orange-600 text-white shadow-md font-extrabold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`} id="nav-tab-report"><BarChart3 className="w-4 h-4" /><span>REPORT</span></button>}

          <button
            onClick={() => onSelectTab('attendance')}
            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all min-h-[40px] cursor-pointer whitespace-nowrap ${
              currentTab === 'attendance' ? 'bg-orange-600 text-white shadow-md font-extrabold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
            id="nav-tab-attendance"
          >
            <Clock3 className="w-4 h-4" />
            <span>ATTENDANCE</span>
          </button>

          {/* MANAGER TABS */}
          {isLeadership ? (
            <>
              {isManager && <button
                onClick={() => onSelectTab('inspection')}
                className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all min-h-[40px] cursor-pointer whitespace-nowrap ${
                  currentTab === 'inspection'
                    ? 'bg-orange-600 text-white shadow-md font-extrabold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
                id="nav-tab-inspection"
              >
                <ClipboardCheck className="w-4 h-4" />
                <span>INSPECTION</span>
              </button>}

              <button
                onClick={() => onSelectTab('outstanding')}
                className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all min-h-[40px] cursor-pointer whitespace-nowrap ${
                  currentTab === 'outstanding'
                    ? 'bg-orange-600 text-white shadow-md font-extrabold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
                id="nav-tab-outstanding"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>ISSUES</span>
                {totalOutstanding > 0 && (
                  <span className="ml-1 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                    {totalOutstanding}
                  </span>
                )}
              </button>

              <button
                onClick={() => onSelectTab('daily-tasks')}
                className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all min-h-[40px] cursor-pointer whitespace-nowrap ${
                  currentTab === 'daily-tasks'
                    ? 'bg-orange-600 text-white shadow-md font-extrabold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
                id="nav-tab-daily-tasks"
              >
                <CheckSquare className="w-4 h-4" />
                <span>TASKS</span>
                {todayOpenTasksCount > 0 && (
                  <span className="ml-1 bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                    {todayOpenTasksCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => onSelectTab('notes')}
                className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all min-h-[40px] cursor-pointer whitespace-nowrap ${
                  currentTab === 'notes'
                    ? 'bg-orange-600 text-white shadow-md font-extrabold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
                id="nav-tab-notes"
              >
                <StickyNote className="w-4 h-4" />
                <span>NOTES</span>
                {openNotesCount > 0 && (
                  <span className="ml-1 bg-amber-500 text-slate-950 text-xs px-2 py-0.5 rounded-full font-bold">
                    {openNotesCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => onSelectTab('history')}
                className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all min-h-[40px] cursor-pointer whitespace-nowrap ${
                  currentTab === 'history'
                    ? 'bg-orange-600 text-white shadow-md font-extrabold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
                id="nav-tab-history"
              >
                <History className="w-4 h-4" />
                <span>HISTORY</span>
              </button>

              <button
                onClick={() => onSelectTab('checklist')}
                className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all min-h-[40px] cursor-pointer whitespace-nowrap ${
                  currentTab === 'checklist'
                    ? 'bg-orange-600 text-white shadow-md font-extrabold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
                id="nav-tab-checklist"
              >
                <Layers className="w-4 h-4" />
                <span>TEMPLATES</span>
              </button>

              <button
                onClick={() => onSelectTab('team')}
                className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all min-h-[40px] cursor-pointer whitespace-nowrap ${
                  currentTab === 'team'
                    ? 'bg-orange-600 text-white shadow-md font-extrabold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
                id="nav-tab-team"
              >
                <Users className="w-4 h-4" />
                <span>TEAM & POINTS</span>
              </button>

              <button
                onClick={() => onSelectTab('settings')}
                className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all min-h-[40px] cursor-pointer whitespace-nowrap ${
                  currentTab === 'settings'
                    ? 'bg-orange-600 text-white shadow-md font-extrabold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
                id="nav-tab-settings"
              >
                <Settings className="w-4 h-4" />
                <span>SETTINGS</span>
              </button>
            </>
          ) : (
            /* NON-MANAGER TABS */
            <>
              {currentRole === 'STAFF' && (
                <button
                  onClick={() => onSelectTab('inspection')}
                  className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all min-h-[40px] cursor-pointer whitespace-nowrap ${
                    currentTab === 'inspection'
                      ? 'bg-orange-600 text-white shadow-md font-extrabold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                  id="nav-tab-inspection"
                >
                  <ClipboardCheck className="w-4 h-4" />
                  <span>INSPECTION</span>
                </button>
              )}

              <button
                onClick={() => onSelectTab('daily-tasks')}
                className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all min-h-[40px] cursor-pointer whitespace-nowrap ${
                  currentTab === 'daily-tasks'
                    ? 'bg-orange-600 text-white shadow-md font-extrabold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
                id="nav-tab-daily-tasks"
              >
                <CheckSquare className="w-4 h-4" />
                <span>TASKS</span>
                {todayOpenTasksCount > 0 && (
                  <span className="ml-1 bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                    {todayOpenTasksCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => onSelectTab('notes')}
                className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all min-h-[40px] cursor-pointer whitespace-nowrap ${
                  currentTab === 'notes'
                    ? 'bg-orange-600 text-white shadow-md font-extrabold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
                id="nav-tab-notes"
              >
                <StickyNote className="w-4 h-4" />
                <span>NOTES</span>
                {openNotesCount > 0 && (
                  <span className="ml-1 bg-amber-500 text-slate-950 text-xs px-2 py-0.5 rounded-full font-bold">
                    {openNotesCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => onSelectTab('history')}
                className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all min-h-[40px] cursor-pointer whitespace-nowrap ${
                  currentTab === 'history'
                    ? 'bg-orange-600 text-white shadow-md font-extrabold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
                id="nav-tab-history"
              >
                <History className="w-4 h-4" />
                <span>HISTORY</span>
              </button>

              <button
                onClick={() => onSelectTab('team')}
                className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all min-h-[40px] cursor-pointer whitespace-nowrap ${
                  currentTab === 'team'
                    ? 'bg-orange-600 text-white shadow-md font-extrabold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
                id="nav-tab-team"
              >
                <Award className="w-4 h-4 text-amber-400" />
                <span>MY POINTS</span>
              </button>
            </>
          )}
        </nav>

        {/* Small device system tag */}
        <div className="hidden lg:flex items-center text-xs text-slate-400 font-mono">
          <span>Local DB v3.0 • Offline</span>
        </div>
      </div>
    </header>
  );
};
