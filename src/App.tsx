import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';
import { LoginScreen } from './components/LoginScreen';
import { Header } from './components/Header';
import { ReminderBanner } from './components/ReminderBanner';
import { TodayView } from './views/TodayView';
import { NotesView } from './views/NotesView';
import { DashboardView } from './views/DashboardView';
import { DailyInspectionView } from './views/DailyInspectionView';
import { OutstandingIssuesView } from './views/OutstandingIssuesView';
import { DailyTasksView } from './views/DailyTasksView';
import { HistoryView } from './views/HistoryView';
import { ChecklistTemplateView } from './views/ChecklistTemplateView';
import { SettingsView } from './views/SettingsView';
import { StaffManagementView } from './views/StaffManagementView';
import { AttendanceView } from './views/AttendanceView';
import { StaffCallAlertModal } from './components/StaffCallAlertModal';
import { IssueStatus } from './types';
import { ActionableReminder } from './utils/reminderEngine';
import { Shield, Loader2 } from 'lucide-react';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading, currentRole } = useAuth();
  const { isLoading: dataLoading, activeReminders, dismissReminder } = useData();

  // Navigation tab state
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [initialStatusFilter, setInitialStatusFilter] = useState<IssueStatus | 'ALL'>('ALL');

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center text-white p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center font-bold text-2xl text-white shadow-lg">
            DO
          </div>
          <h1 className="text-xl font-black tracking-tight text-white">DAILY OPS</h1>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
            <span>Initializing Local Tablet Database...</span>
          </div>
        </div>
      </div>
    );
  }

  // If user is locked or not logged in, show PIN login screen
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // Navigation helper for child views
  const handleNavigate = (tab: string, filterStatus?: string) => {
    if (filterStatus) {
      setInitialStatusFilter(filterStatus as IssueStatus);
    } else {
      setInitialStatusFilter('ALL');
    }
    setCurrentTab(tab);
  };

  const handleSelectReminder = (reminder: ActionableReminder) => {
    if (reminder.sourceType === 'TASK') {
      setCurrentTab('daily-tasks');
    } else {
      // Issue
      if (currentRole === 'MANAGER') {
        setInitialStatusFilter(reminder.status === 'OVERDUE' ? 'NOT_READY' : 'ALL');
        setCurrentTab('outstanding');
      } else {
        setCurrentTab('dashboard');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] flex flex-col">
      {/* Top Header */}
      <Header 
        currentTab={currentTab} 
        onSelectTab={(tab) => {
          setInitialStatusFilter('ALL');
          setCurrentTab(tab);
        }} 
      />

      {/* Real-time Reminder Banner */}
      <ReminderBanner 
        reminders={activeReminders} 
        onSelectReminder={handleSelectReminder}
        onDismiss={dismissReminder}
      />

      {/* Real-time Urgent Staff Call Alert Modal */}
      <StaffCallAlertModal />

      {/* Main View Container */}
      <main className="flex-1 w-full pb-16">
        {currentTab === 'dashboard' && (
          <TodayView onNavigate={handleNavigate} />
        )}

        {currentTab === 'inspection' && (
          <DailyInspectionView onNavigateToIssues={() => handleNavigate(currentRole === 'MANAGER' ? 'outstanding' : 'today-issues')} />
        )}

        {(currentTab === 'outstanding' || currentTab === 'today-issues') && (
          <OutstandingIssuesView 
            initialStatusFilter={initialStatusFilter}
            key={`issues-${initialStatusFilter}`}
          />
        )}

        {currentTab === 'daily-tasks' && (
          <DailyTasksView />
        )}

        {currentTab === 'notes' && (
          <NotesView />
        )}

        {currentTab === 'in-process' && (
          <OutstandingIssuesView 
            initialStatusFilter="IN_PROCESS" 
            key="issues-in-process"
          />
        )}

        {currentTab === 'waiting-verification' && (
          <OutstandingIssuesView 
            initialStatusFilter="WAITING_VERIFICATION" 
            key="issues-waiting-verify"
          />
        )}

        {currentTab === 'history' && (
          <HistoryView />
        )}

        {currentTab === 'checklist' && (
          <ChecklistTemplateView />
        )}

        {currentTab === 'team' && (
          <StaffManagementView />
        )}

        {currentTab === 'attendance' && (
          <AttendanceView />
        )}

        {currentTab === 'settings' && currentRole === 'MANAGER' && (
          <SettingsView />
        )}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </AuthProvider>
  );
}
