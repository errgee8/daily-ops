import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { UserRole } from '../types';
import { 
  Settings, 
  Shield, 
  KeyRound, 
  Download, 
  Upload, 
  Database, 
  RefreshCw, 
  Smartphone, 
  FileSpreadsheet, 
  Check, 
  AlertTriangle,
  UserPlus,
  Trash2,
  Lock,
  Clock,
  X
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { users, currentUser, currentRole, updateUserPin, addNewUser, deleteUser } = useAuth();
  const { 
    settings, 
    updateAppSettings, 
    issues, 
    inspections, 
    exportBackupJson, 
    restoreBackupJson, 
    loadSampleDemo, 
    resetToFactory 
  } = useData();

  const isManager = currentRole === 'MANAGER';

  // Venue Settings form
  const [venueName, setVenueName] = useState(settings.venueName || 'Grand Plaza Hotel & Suites');
  const [autoLockMinutes, setAutoLockMinutes] = useState(settings.autoLockMinutes || 5);
  const [settingsSavedMessage, setSettingsSavedMessage] = useState('');

  // PIN Change Form
  const [targetUserId, setTargetUserId] = useState(users[0]?.id || 'user-manager');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinChangeMessage, setPinChangeMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // New User Form
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('ASSISTANT_MANAGER');
  const [newUserPin, setNewUserPin] = useState('');

  // Backup File Ref
  const backupInputRef = useRef<HTMLInputElement>(null);
  const [backupStatus, setBackupStatus] = useState<string | null>(null);

  // Modals state
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [pendingBackupFile, setPendingBackupFile] = useState<File | null>(null);
  const [userFormError, setUserFormError] = useState<string | null>(null);

  const handleSaveVenueSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateAppSettings({
      venueName: venueName.trim(),
      autoLockMinutes: Number(autoLockMinutes)
    });
    setSettingsSavedMessage('Settings successfully saved to local database.');
    setTimeout(() => setSettingsSavedMessage(''), 3000);
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinChangeMessage(null);

    if (newPin.length < 4) {
      setPinChangeMessage({ text: 'PIN must be at least 4 digits.', isError: true });
      return;
    }
    if (newPin !== confirmPin) {
      setPinChangeMessage({ text: 'PINs do not match.', isError: true });
      return;
    }

    const success = await updateUserPin(targetUserId, newPin);
    if (success) {
      setPinChangeMessage({ text: 'PIN successfully updated.', isError: false });
      setNewPin('');
      setConfirmPin('');
    } else {
      setPinChangeMessage({ text: 'Failed to update PIN.', isError: true });
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserFormError(null);
    if (!newUserName.trim()) {
      setUserFormError('Please provide a valid staff name.');
      return;
    }
    if (newUserPin.length < 4) {
      setUserFormError('PIN must be at least 4 digits.');
      return;
    }

    await addNewUser({
      name: newUserName.trim(),
      role: newUserRole,
      pin: newUserPin
    });

    setNewUserName('');
    setNewUserPin('');
    setIsAddingUser(false);
  };

  const handleDeleteUser = (userId: string) => {
    if (users.length <= 1) {
      setBackupStatus('Must maintain at least 1 authenticated user.');
      setTimeout(() => setBackupStatus(null), 3000);
      return;
    }
    setUserToDelete(userId);
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    await deleteUser(userToDelete);
    setUserToDelete(null);
  };

  // BACKUP & RESTORE
  const handleExportBackup = async () => {
    try {
      const backupJson = await exportBackupJson();
      const blob = new Blob([backupJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `DAILY_OPS_BACKUP_${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setBackupStatus('Backup exported successfully.');
      setTimeout(() => setBackupStatus(null), 4000);
    } catch (err) {
      setBackupStatus('Error exporting backup.');
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingBackupFile(file);
  };

  const handleConfirmRestoreBackup = async () => {
    if (!pendingBackupFile) return;
    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const content = evt.target?.result as string;
        const success = await restoreBackupJson(content);
        if (success) {
          window.location.reload();
        } else {
          setBackupStatus('Failed to parse or restore backup file.');
          setPendingBackupFile(null);
        }
      };
      reader.readAsText(pendingBackupFile);
    } catch (err) {
      setBackupStatus('Error reading backup file.');
      setPendingBackupFile(null);
    }
  };

  // EXPORT CSV SPREADSHEET
  const handleExportCsv = () => {
    let csv = 'ID,InspectionDate,Area,Item,Criterion,Problems,Notes,Department,Status,DiscoveredBy,DiscoveredAt,ResolvedBy,ResolvedAt,VerifiedBy,VerifiedAt\n';
    issues.forEach(i => {
      csv += `"${i.id}","${i.inspectionDate}","${i.areaName}","${i.itemName}","${i.criterionName}","${i.specificProblems.join('; ')}","${(i.customNote || '').replace(/"/g, '""')}","${i.departmentName}","${i.currentStatus}","${i.discoveredByName}","${i.discoveredAt}","${i.resolutionInfo?.resolvedByName || ''}","${i.resolutionInfo?.resolvedAt || ''}","${i.verificationInfo?.verifiedByName || ''}","${i.verificationInfo?.verifiedAt || ''}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `DAILY_OPS_ISSUES_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleConfirmResetToDemo = async () => {
    await resetToFactory(false);
    window.location.reload();
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 select-none animate-in fade-in duration-150 text-slate-900">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Settings className="w-8 h-8 text-orange-500" />
            SETTINGS & ADMINISTRATION
          </h1>
          <p className="text-xs md:text-sm text-slate-600">
            Local security controls, user PIN management, auto-lock timeouts, and database backups
          </p>
        </div>

        <div className="text-xs font-mono text-emerald-800 bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-2 font-bold shadow-2xs">
          <Database className="w-4 h-4 text-emerald-600" />
          <span>SUPABASE CLOUD LIVE</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Venue Information & Security Settings */}
        <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
            <Smartphone className="w-6 h-6 text-orange-500" />
            <div>
              <h2 className="text-lg font-black text-slate-900">Venue & Tablet Configuration</h2>
              <p className="text-xs text-slate-500">General preferences stored permanently in tablet database</p>
            </div>
          </div>

          <form onSubmit={handleSaveVenueSettings} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase font-mono">Venue Name</label>
              <input
                type="text"
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                className="w-full bg-slate-50 text-slate-900 text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-orange-500 min-h-[44px] font-medium"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase font-mono flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-orange-500" />
                <span>Auto-Lock Inactivity Timeout</span>
              </label>
              <select
                value={autoLockMinutes}
                onChange={(e) => setAutoLockMinutes(Number(e.target.value))}
                className="w-full bg-slate-50 text-slate-900 text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-orange-500 min-h-[44px] font-medium cursor-pointer"
              >
                <option value={1}>1 Minute (Strict testing)</option>
                <option value={3}>3 Minutes</option>
                <option value={5}>5 Minutes (Default recommended)</option>
                <option value={10}>10 Minutes</option>
                <option value={15}>15 Minutes</option>
                <option value={30}>30 Minutes</option>
              </select>
              <p className="text-[11px] text-slate-500 font-medium">
                Tablet will lock after inactivity to protect operational records.
              </p>
            </div>

            {settingsSavedMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-bold font-mono">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{settingsSavedMessage}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow min-h-[44px] cursor-pointer"
            >
              <span>SAVE CONFIGURATION</span>
            </button>
          </form>
        </div>

        {/* User PIN & Security Management */}
        <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <KeyRound className="w-6 h-6 text-orange-500" />
              <div>
                <h2 className="text-lg font-black text-slate-900">PIN & User Accounts</h2>
                <p className="text-xs text-slate-500">Cryptographically hashed local PIN authentication</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsAddingUser(!isAddingUser)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1 min-h-[36px] cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5 text-orange-500" />
              <span>Add User</span>
            </button>
          </div>

          {/* Add User Subform */}
          {isAddingUser && (
            <form onSubmit={handleCreateUser} className="p-4 bg-orange-50/50 border border-orange-200 rounded-2xl space-y-3">
              <h3 className="text-xs font-black text-orange-600 uppercase font-mono">Create New Authorized User</h3>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Full Name / Handle"
                  className="bg-white text-slate-900 text-xs px-3 py-2 rounded-xl border border-slate-300 min-h-[40px] font-medium"
                  required
                />
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                  className="bg-white text-slate-900 text-xs px-3 py-2 rounded-xl border border-slate-300 min-h-[40px] font-medium cursor-pointer"
                >
                  <option value="ASSISTANT_MANAGER">ASSISTANT MANAGER</option>
                  <option value="MANAGER">MANAGER</option>
                  <option value="STAFF">STAFF</option>
                </select>
              </div>
              <div>
                <input
                  type="password"
                  value={newUserPin}
                  onChange={(e) => setNewUserPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 4 to 6 digit numeric PIN"
                  className="w-full bg-white text-slate-900 text-xs px-3 py-2 rounded-xl border border-slate-300 min-h-[40px] font-mono"
                  maxLength={6}
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingUser(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-black rounded-lg cursor-pointer"
                >
                  Create User
                </button>
              </div>
            </form>
          )}

          {/* User List */}
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {users.map(u => (
              <div key={u.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 text-sm">{u.name}</div>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                    u.role === 'MANAGER' 
                      ? 'bg-orange-100 text-orange-800' 
                      : u.role === 'STAFF'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-blue-100 text-blue-800'
                  }`}>
                    {u.role}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetUserId(u.id)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg border cursor-pointer ${
                      targetUserId === u.id 
                        ? 'bg-orange-500 text-white border-orange-500' 
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    Select for PIN
                  </button>
                  {users.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteUser(u.id)}
                      className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Change PIN Form */}
          <form onSubmit={handleChangePin} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="text-xs font-bold text-slate-700 uppercase font-mono">
              Update PIN for: <span className="text-orange-600 font-bold">{users.find(u => u.id === targetUserId)?.name}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input
                type="password"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder="New 4-6 Digit PIN"
                className="bg-white text-slate-900 text-xs px-3 py-2.5 rounded-xl border border-slate-300 min-h-[44px] font-mono"
                maxLength={6}
                required
              />
              <input
                type="password"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Confirm PIN"
                className="bg-white text-slate-900 text-xs px-3 py-2.5 rounded-xl border border-slate-300 min-h-[44px] font-mono"
                maxLength={6}
                required
              />
            </div>

            {pinChangeMessage && (
              <div className={`p-2.5 rounded-xl text-xs font-bold font-mono ${
                pinChangeMessage.isError ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {pinChangeMessage.text}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs min-h-[40px] cursor-pointer"
            >
              Update User PIN
            </button>
          </form>
        </div>
      </div>

      {/* Offline Backup, Restore & Data Portability */}
      <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <Database className="w-6 h-6 text-emerald-600" />
            <div>
              <h2 className="text-lg font-black text-slate-900">Offline Local Storage, Backup & Export</h2>
              <p className="text-xs text-slate-500">
                100% On-Device IndexedDB Storage • Zero cloud dependency • Export anytime to tablet storage
              </p>
            </div>
          </div>
        </div>

        {backupStatus && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-bold font-mono">
            {backupStatus}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Export JSON Full Backup */}
          <button
            onClick={handleExportBackup}
            className="p-5 bg-slate-50 hover:bg-slate-100 border-2 border-slate-200 hover:border-slate-300 rounded-2xl flex flex-col items-center text-center gap-2 transition-all cursor-pointer min-h-[100px] shadow-2xs"
          >
            <Download className="w-8 h-8 text-orange-500" />
            <div className="font-black text-slate-900 text-sm">EXPORT FULL LOCAL BACKUP</div>
            <div className="text-[11px] text-slate-500">Downloads complete JSON snapshot file</div>
          </button>

          {/* Import JSON Restore */}
          <button
            onClick={() => backupInputRef.current?.click()}
            className="p-5 bg-slate-50 hover:bg-slate-100 border-2 border-slate-200 hover:border-slate-300 rounded-2xl flex flex-col items-center text-center gap-2 transition-all cursor-pointer min-h-[100px] shadow-2xs"
          >
            <Upload className="w-8 h-8 text-blue-600" />
            <div className="font-black text-slate-900 text-sm">RESTORE BACKUP FILE</div>
            <div className="text-[11px] text-slate-500">Restores database from .json backup</div>
          </button>
          <input
            type="file"
            accept=".json"
            ref={backupInputRef}
            onChange={handleImportBackup}
            className="hidden"
          />

          {/* Export CSV Spreadsheet */}
          <button
            onClick={handleExportCsv}
            className="p-5 bg-slate-50 hover:bg-slate-100 border-2 border-slate-200 hover:border-slate-300 rounded-2xl flex flex-col items-center text-center gap-2 transition-all cursor-pointer min-h-[100px] shadow-2xs"
          >
            <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
            <div className="font-black text-slate-900 text-sm">EXPORT SPREADSHEET (CSV)</div>
            <div className="text-[11px] text-slate-500">Tabular report of all defects & audits</div>
          </button>
        </div>

          {/* Factory Reset / Emergency Demo Reset */}
        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 font-mono">
            Database Status: {inspections.length} Inspection shifts archived • {issues.length} Issues logged
          </div>

          <button
            type="button"
            onClick={() => setIsResetConfirmOpen(true)}
            className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold flex items-center gap-1.5 min-h-[40px] cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset to Factory Demo Data</span>
          </button>
        </div>
      </div>

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border-2 border-red-200 animate-in zoom-in-95 duration-150">
            <div className="p-5 bg-red-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-white" />
                <h3 className="text-base font-black tracking-tight">Delete User Account</h3>
              </div>
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="text-white/70 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm font-bold text-slate-800">
                Are you sure you want to remove user &ldquo;{users.find(u => u.id === userToDelete)?.name}&rdquo;?
              </p>
            </div>
            <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUser}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black shadow cursor-pointer"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Backup Confirmation Modal */}
      {pendingBackupFile && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border-2 border-orange-300 animate-in zoom-in-95 duration-150">
            <div className="p-5 bg-orange-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-white" />
                <h3 className="text-base font-black tracking-tight">Restore Database Backup</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPendingBackupFile(null);
                  if (backupInputRef.current) backupInputRef.current.value = '';
                }}
                className="text-white/70 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-2">
              <p className="text-sm font-bold text-slate-900">
                Restore database from &ldquo;{pendingBackupFile.name}&rdquo;?
              </p>
              <p className="text-xs text-slate-600 bg-amber-50 p-3 rounded-xl border border-amber-200">
                WARNING: Restoring a backup will overwrite current local records, checklists, and active defects with the archive contents.
              </p>
            </div>
            <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setPendingBackupFile(null);
                  if (backupInputRef.current) backupInputRef.current.value = '';
                }}
                className="px-4 py-2 bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRestoreBackup}
                className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black shadow cursor-pointer"
              >
                Yes, Restore & Reload
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Factory Demo Reset Confirmation Modal */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border-2 border-red-200 animate-in zoom-in-95 duration-150">
            <div className="p-5 bg-red-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-white" />
                <h3 className="text-base font-black tracking-tight">Factory Demo Reset</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="text-white/70 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-2">
              <p className="text-sm font-bold text-slate-900">
                Are you sure you want to reset all data to default factory demo templates?
              </p>
              <p className="text-xs text-slate-600 bg-red-50 p-3 rounded-xl border border-red-200">
                This will clear custom inspections and restore default venue templates (Lucky Cat, JPE KTV, Ground Lobby).
              </p>
            </div>
            <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="px-4 py-2 bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmResetToDemo}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black shadow cursor-pointer"
              >
                Yes, Reset System
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
