import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { OperationalIssue, IssueStatus } from '../types';
import { formatDateTime, formatDate } from '../utils/crypto';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  ShieldCheck, 
  RotateCcw, 
  Building2, 
  Camera, 
  FileText, 
  History, 
  User, 
  Filter, 
  Search, 
  Check, 
  X, 
  MessageSquare,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon
} from 'lucide-react';
import { PhotoCaptureModal } from '../components/PhotoCaptureModal';

interface OutstandingIssuesViewProps {
  initialStatusFilter?: IssueStatus | 'ALL';
}

export const OutstandingIssuesView: React.FC<OutstandingIssuesViewProps> = ({
  initialStatusFilter = 'ALL'
}) => {
  const { currentUser, currentRole } = useAuth();
  const { 
    template, 
    issues, 
    todayDate,
    startWorkOnIssue, 
    changeIssueDepartment, 
    addIssueNote, 
    attachPhotoToIssue, 
    removePhotoFromIssue,
    markIssueResolved, 
    verifyIssue, 
    reopenIssue 
  } = useData();

  const isManager = currentRole === 'MANAGER';
  const isAssistant = currentRole === 'ASSISTANT_MANAGER';

  // Filters
  const [statusFilter, setStatusFilter] = useState<IssueStatus | 'ALL'>(initialStatusFilter);
  const [areaFilter, setAreaFilter] = useState<string>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<'TODAY' | 'ALL'>('TODAY');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Expanded audit trails
  const [expandedAuditIds, setExpandedAuditIds] = useState<Record<string, boolean>>({});

  // Active modals
  const [activeNoteIssue, setActiveNoteIssue] = useState<OperationalIssue | null>(null);
  const [noteText, setNoteText] = useState('');

  const [activeDeptIssue, setActiveDeptIssue] = useState<OperationalIssue | null>(null);
  const [selectedDeptId, setSelectedDeptId] = useState('');

  const [activeReopenIssue, setActiveReopenIssue] = useState<OperationalIssue | null>(null);
  const [reopenReason, setReopenReason] = useState('');

  const [activeResolveIssue, setActiveResolveIssue] = useState<OperationalIssue | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [resolveProofPhotos, setResolveProofPhotos] = useState<string[]>([]);

  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [photoTargetIssueId, setPhotoTargetIssueId] = useState<string | null>(null);
  const [isResolutionPhoto, setIsResolutionPhoto] = useState(false);

  const [enlargedPhotoUrl, setEnlargedPhotoUrl] = useState<string | null>(null);

  // Filter issues
  const filteredIssues = useMemo(() => {
    return issues.filter(iss => {
      // Date filter
      if (dateFilter === 'TODAY' && iss.inspectionDate !== todayDate) return false;

      // Status filter
      if (statusFilter !== 'ALL' && iss.currentStatus !== statusFilter) return false;

      // Area filter
      if (areaFilter !== 'ALL' && iss.areaId !== areaFilter) return false;

      // Department filter
      if (departmentFilter !== 'ALL' && iss.departmentId !== departmentFilter) return false;

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = String(iss.itemName || '').toLowerCase().includes(q);
        const matchesArea = String(iss.areaName || '').toLowerCase().includes(q);
        const matchesCrit = String(iss.criterionName || '').toLowerCase().includes(q);
        const matchesProb = (iss.specificProblems || []).some(p => String(p || '').toLowerCase().includes(q));
        const matchesDept = String(iss.departmentName || '').toLowerCase().includes(q);
        if (!matchesName && !matchesArea && !matchesCrit && !matchesProb && !matchesDept) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      // Priority sorting: NOT_READY > IN_PROCESS > WAITING_VERIFICATION > VERIFIED
      const order: Record<IssueStatus, number> = {
        NOT_READY: 1,
        IN_PROCESS: 2,
        WAITING_VERIFICATION: 3,
        VERIFIED: 4
      };
      if (order[a.currentStatus] !== order[b.currentStatus]) {
        return order[a.currentStatus] - order[b.currentStatus];
      }
      return b.discoveredAt.localeCompare(a.discoveredAt);
    });
  }, [issues, dateFilter, todayDate, statusFilter, areaFilter, departmentFilter, searchQuery]);

  const toggleAuditTrail = (issueId: string) => {
    setExpandedAuditIds(prev => ({ ...prev, [issueId]: !prev[issueId] }));
  };

  // Actions
  const handleStartWork = async (issue: OperationalIssue) => {
    if (!currentUser) return;
    await startWorkOnIssue(issue.id, currentUser);
  };

  const handleOpenDepartmentModal = (issue: OperationalIssue) => {
    setActiveDeptIssue(issue);
    setSelectedDeptId(issue.departmentId);
  };

  const handleSaveDepartment = async () => {
    if (!activeDeptIssue || !currentUser || !selectedDeptId) return;
    await changeIssueDepartment(activeDeptIssue.id, selectedDeptId, currentUser);
    setActiveDeptIssue(null);
  };

  const handleOpenNoteModal = (issue: OperationalIssue) => {
    setActiveNoteIssue(issue);
    setNoteText('');
  };

  const handleSaveNote = async () => {
    if (!activeNoteIssue || !currentUser || !noteText.trim()) return;
    await addIssueNote(activeNoteIssue.id, noteText.trim(), currentUser);
    setActiveNoteIssue(null);
    setNoteText('');
  };

  const handleOpenPhoto = (issueId: string, isRes = false) => {
    setPhotoTargetIssueId(issueId);
    setIsResolutionPhoto(isRes);
    setPhotoModalOpen(true);
  };

  const handlePhotoSaved = async (photoDataUrl: string) => {
    if (activeResolveIssue && isResolutionPhoto) {
      setResolveProofPhotos(prev => [...prev, photoDataUrl]);
      return;
    }
    if (!photoTargetIssueId || !currentUser) return;
    await attachPhotoToIssue(photoTargetIssueId, photoDataUrl, isResolutionPhoto, currentUser);
  };

  const handleRemovePhoto = async (issueId: string, photoUrl: string, isRes: boolean) => {
    if (!currentUser) return;
    await removePhotoFromIssue(issueId, photoUrl, isRes, currentUser);
  };

  const handleOpenResolveModal = (issue: OperationalIssue) => {
    setActiveResolveIssue(issue);
    setResolutionNote('');
    setResolveProofPhotos([]);
  };

  const handleConfirmResolve = async () => {
    if (!activeResolveIssue || !currentUser) return;
    await markIssueResolved(
      activeResolveIssue.id, 
      currentUser, 
      resolutionNote.trim() || undefined,
      resolveProofPhotos.length > 0 ? resolveProofPhotos : undefined
    );
    setActiveResolveIssue(null);
    setResolveProofPhotos([]);
  };

  const handleVerify = async (issue: OperationalIssue) => {
    if (!currentUser) return;
    await verifyIssue(issue.id, currentUser);
  };

  const handleOpenReopenModal = (issue: OperationalIssue) => {
    setActiveReopenIssue(issue);
    setReopenReason('');
  };

  const handleConfirmReopen = async () => {
    if (!activeReopenIssue || !currentUser || !reopenReason.trim()) return;
    await reopenIssue(activeReopenIssue.id, currentUser, reopenReason.trim());
    setActiveReopenIssue(null);
  };

  // Metric counts for filter bar
  const totalCount = issues.length;
  const notReadyCount = issues.filter(i => i.currentStatus === 'NOT_READY').length;
  const inProcessCount = issues.filter(i => i.currentStatus === 'IN_PROCESS').length;
  const waitingCount = issues.filter(i => i.currentStatus === 'WAITING_VERIFICATION').length;
  const verifiedCount = issues.filter(i => i.currentStatus === 'VERIFIED').length;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 select-none animate-in fade-in duration-150 text-slate-900">
      {/* Title & Filter Overview */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <AlertTriangle className="w-8 h-8 text-red-600" />
            OPERATIONAL ISSUES & RESOLUTIONS
          </h1>
          <p className="text-xs md:text-sm text-slate-600">
            {isAssistant 
              ? 'Assistant Manager Queue: Coordinate division repairs, add notes, and submit for Manager verification' 
              : 'Manager Queue: Track discovered venue defects, verify completed repairs, or reopen incomplete fixes'}
          </p>
        </div>

        {/* Date Filter Toggle */}
        <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-2xs">
          <button
            onClick={() => setDateFilter('TODAY')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer min-h-[40px] ${
              dateFilter === 'TODAY' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            TODAY ONLY ({formatDate(todayDate)})
          </button>
          <button
            onClick={() => setDateFilter('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer min-h-[40px] ${
              dateFilter === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ALL DATES HISTORY
          </button>
        </div>
      </div>

      {/* Large Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setStatusFilter('ALL')}
          className={`px-5 py-3 rounded-2xl text-xs md:text-sm font-black flex items-center gap-2 border-2 transition-all min-h-[48px] cursor-pointer whitespace-nowrap ${
            statusFilter === 'ALL' 
              ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span>ALL ISSUES</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
            statusFilter === 'ALL' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            {filteredIssues.length}
          </span>
        </button>

        {/* 🔴 NOT READY */}
        <button
          onClick={() => setStatusFilter('NOT_READY')}
          className={`px-5 py-3 rounded-2xl text-xs md:text-sm font-black flex items-center gap-2 border-2 transition-all min-h-[48px] cursor-pointer whitespace-nowrap ${
            statusFilter === 'NOT_READY' 
              ? 'bg-red-600 text-white border-red-600 shadow-md' 
              : 'bg-white text-slate-700 border-slate-200 hover:bg-red-50'
          }`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span>NOT READY</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
            statusFilter === 'NOT_READY' ? 'bg-red-700 text-white' : 'bg-red-100 text-red-700'
          }`}>
            {notReadyCount}
          </span>
        </button>

        {/* 🟡 IN PROCESS */}
        <button
          onClick={() => setStatusFilter('IN_PROCESS')}
          className={`px-5 py-3 rounded-2xl text-xs md:text-sm font-black flex items-center gap-2 border-2 transition-all min-h-[48px] cursor-pointer whitespace-nowrap ${
            statusFilter === 'IN_PROCESS' 
              ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md' 
              : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50'
          }`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span>IN PROCESS</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
            statusFilter === 'IN_PROCESS' ? 'bg-amber-600 text-slate-950' : 'bg-amber-100 text-amber-800'
          }`}>
            {inProcessCount}
          </span>
        </button>

        {/* 🔵 WAITING VERIFICATION */}
        <button
          onClick={() => setStatusFilter('WAITING_VERIFICATION')}
          className={`px-5 py-3 rounded-2xl text-xs md:text-sm font-black flex items-center gap-2 border-2 transition-all min-h-[48px] cursor-pointer whitespace-nowrap ${
            statusFilter === 'WAITING_VERIFICATION' 
              ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
              : 'bg-white text-slate-700 border-slate-200 hover:bg-blue-50'
          }`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <span>WAITING VERIFY</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
            statusFilter === 'WAITING_VERIFICATION' ? 'bg-blue-700 text-white' : 'bg-blue-100 text-blue-800'
          }`}>
            {waitingCount}
          </span>
        </button>

        {/* ✅ VERIFIED */}
        <button
          onClick={() => setStatusFilter('VERIFIED')}
          className={`px-5 py-3 rounded-2xl text-xs md:text-sm font-black flex items-center gap-2 border-2 transition-all min-h-[48px] cursor-pointer whitespace-nowrap ${
            statusFilter === 'VERIFIED' 
              ? 'bg-green-600 text-white border-green-600 shadow-md' 
              : 'bg-white text-slate-700 border-slate-200 hover:bg-green-50'
          }`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
          <span>VERIFIED</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
            statusFilter === 'VERIFIED' ? 'bg-green-700 text-white' : 'bg-green-100 text-green-800'
          }`}>
            {verifiedCount}
          </span>
        </button>
      </div>

      {/* Secondary Quick Filters Bar (Area, Department, Search) */}
      <div className="p-4 bg-white border-2 border-slate-200 rounded-2xl flex flex-wrap gap-3 items-center shadow-sm">
        {/* Area dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase font-mono">Area:</span>
          <select
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
            className="bg-slate-50 text-slate-900 text-xs font-bold border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-orange-500 min-h-[40px] cursor-pointer"
          >
            <option value="ALL">All Areas</option>
            {template.areas.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>

        {/* Department dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase font-mono">Dept:</span>
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="bg-slate-50 text-slate-900 text-xs font-bold border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-orange-500 min-h-[40px] cursor-pointer"
          >
            <option value="ALL">All Departments</option>
            {template.departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        {/* Search input */}
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search room, defect, department..."
            className="w-full bg-slate-50 text-slate-900 text-xs pl-9 pr-4 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-orange-500 min-h-[40px]"
          />
        </div>
      </div>

      {/* Issues Card List */}
      <div className="space-y-4">
        {filteredIssues.length === 0 ? (
          <div className="bg-white border-2 border-slate-200 rounded-3xl p-12 text-center text-slate-500 space-y-3 shadow-sm">
            <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto" />
            <h3 className="text-lg font-black text-slate-900">No Issues Match Current Filter</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              All venue items in this category are either resolved, verified, or have zero defects.
            </p>
          </div>
        ) : (
          filteredIssues.map((issue) => {
            const isAuditExpanded = !!expandedAuditIds[issue.id];
            const isNotReady = issue.currentStatus === 'NOT_READY';
            const isInProcess = issue.currentStatus === 'IN_PROCESS';
            const isWaitingVerify = issue.currentStatus === 'WAITING_VERIFICATION';
            const isVerified = issue.currentStatus === 'VERIFIED';

            return (
              <div
                key={issue.id}
                className={`bg-white border-2 rounded-2xl p-5 md:p-6 shadow-sm transition-all ${
                  isNotReady ? 'border-red-300 bg-red-50/20' :
                  isInProcess ? 'border-amber-300 bg-amber-50/20' :
                  isWaitingVerify ? 'border-blue-300 bg-blue-50/20' :
                  'border-green-300 bg-green-50/20'
                }`}
                id={`issue-card-${issue.id}`}
              >
                {/* Top Card Info Row */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200 shadow-2xs">
                      {issue.areaName}
                    </span>
                    <h3 className="text-xl font-black text-slate-900">{issue.itemName}</h3>
                    <span className="text-sm font-semibold text-slate-500">• {issue.criterionName}</span>
                  </div>

                  {/* Status & Reopen Counter */}
                  <div className="flex items-center gap-2">
                    {issue.reopenCount > 0 && (
                      <span className="px-2.5 py-1 bg-red-100 border border-red-300 text-red-700 text-xs font-bold font-mono rounded-lg shadow-2xs">
                        REOPENED ({issue.reopenCount}x)
                      </span>
                    )}

                    <span className={`px-3 py-1.5 rounded-xl text-xs font-black font-mono tracking-wide border shadow-2xs ${
                      isNotReady ? 'bg-red-100 text-red-700 border-red-300' :
                      isInProcess ? 'bg-amber-100 text-amber-800 border-amber-300' :
                      isWaitingVerify ? 'bg-blue-100 text-blue-800 border-blue-300' :
                      'bg-green-100 text-green-800 border-green-300'
                    }`}>
                      {isNotReady ? '🔴 NOT READY' :
                       isInProcess ? '🟡 IN PROCESS' :
                       isWaitingVerify ? '🔵 WAITING FOR VERIFICATION' :
                       '✅ VERIFIED'}
                    </span>
                  </div>
                </div>

                {/* Main Issue Details & Specific Problems */}
                <div className="my-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Problems list & notes */}
                  <div className="lg:col-span-2 space-y-2">
                    <div className="text-xs font-mono text-slate-500 uppercase tracking-wider font-bold">
                      SPECIFIC DEFECTS IDENTIFIED:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {issue.specificProblems.map(p => (
                        <span key={p} className="px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold font-mono">
                          {p}
                        </span>
                      ))}
                    </div>

                    {issue.customNote && (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 whitespace-pre-line">
                        <strong className="text-slate-900">Notes / Log:</strong> {issue.customNote}
                      </div>
                    )}

                    {/* Discovery & Resolution Metadata */}
                    <div className="pt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-mono">
                      <span>Found: <strong className="text-slate-800">{formatDateTime(issue.discoveredAt)}</strong> by <strong className="text-slate-900">{issue.discoveredByName} ({issue.discoveredByRole})</strong></span>
                      {issue.resolutionInfo && (
                        <span>• Resolved: <strong className="text-blue-700">{formatDateTime(issue.resolutionInfo.resolvedAt)}</strong> by <strong className="text-slate-900">{issue.resolutionInfo.resolvedByName}</strong></span>
                      )}
                      {issue.verificationInfo && (
                        <span>• Verified: <strong className="text-green-700">{formatDateTime(issue.verificationInfo.verifiedAt)}</strong> by <strong className="text-slate-900">{issue.verificationInfo.verifiedByName}</strong></span>
                      )}
                    </div>
                  </div>

                  {/* Department & Photos Area */}
                  <div className="space-y-3.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 uppercase font-mono">Assigned Division:</span>
                      <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-slate-900 font-bold text-xs font-mono shadow-2xs">
                        {issue.departmentName}
                      </span>
                    </div>

                    {/* Defect Photos Gallery */}
                    {(() => {
                      const defectPhotos = Array.isArray(issue.photos) && issue.photos.length > 0
                        ? issue.photos
                        : (issue.photoUrl ? [issue.photoUrl] : []);

                      return (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 font-mono">
                            <span>DEFECT PHOTOS ({defectPhotos.length}):</span>
                            <button
                              type="button"
                              onClick={() => handleOpenPhoto(issue.id, false)}
                              className="text-blue-600 hover:text-blue-700 flex items-center gap-1 font-bold cursor-pointer"
                            >
                              <Camera className="w-3 h-3" />
                              <span>+ Add Photo</span>
                            </button>
                          </div>
                          {defectPhotos.length > 0 ? (
                            <div className="flex flex-wrap gap-2 items-center">
                              {defectPhotos.map((photo, pIdx) => (
                                <div key={pIdx} className="relative group rounded-xl overflow-hidden border border-slate-300 bg-white shadow-2xs">
                                  <img 
                                    src={photo} 
                                    alt={`Defect ${pIdx + 1}`} 
                                    onClick={() => setEnlargedPhotoUrl(photo)}
                                    className="w-14 h-14 object-cover cursor-pointer hover:opacity-90 transition-opacity" 
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleRemovePhoto(issue.id, photo, false)}
                                    title="Remove this photo"
                                    className="absolute top-1 right-1 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center text-xs shadow-md hover:bg-red-700 cursor-pointer"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                  <div className="absolute bottom-0 inset-x-0 bg-black/75 text-white text-[9px] text-center font-bold py-0.5 pointer-events-none">
                                    #{pIdx + 1}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-400 italic">No defect photos attached</div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Resolution Proof Photos Gallery */}
                    {(() => {
                      const resPhotos = Array.isArray(issue.resolutionPhotos) && issue.resolutionPhotos.length > 0
                        ? issue.resolutionPhotos
                        : (issue.resolutionPhotoUrl ? [issue.resolutionPhotoUrl] : []);

                      if (resPhotos.length === 0 && issue.currentStatus === 'NOT_READY') return null;

                      return (
                        <div className="space-y-1.5 pt-2 border-t border-slate-200">
                          <div className="flex items-center justify-between text-[11px] font-bold text-emerald-700 font-mono">
                            <span>RESOLUTION PROOF PHOTOS ({resPhotos.length}):</span>
                            <button
                              type="button"
                              onClick={() => handleOpenPhoto(issue.id, true)}
                              className="text-emerald-700 hover:text-emerald-800 flex items-center gap-1 font-bold cursor-pointer"
                            >
                              <Camera className="w-3 h-3" />
                              <span>+ Add Fix Photo</span>
                            </button>
                          </div>
                          {resPhotos.length > 0 ? (
                            <div className="flex flex-wrap gap-2 items-center">
                              {resPhotos.map((photo, pIdx) => (
                                <div key={pIdx} className="relative group rounded-xl overflow-hidden border border-emerald-400 bg-white shadow-2xs">
                                  <img 
                                    src={photo} 
                                    alt={`Fix Proof ${pIdx + 1}`} 
                                    onClick={() => setEnlargedPhotoUrl(photo)}
                                    className="w-14 h-14 object-cover cursor-pointer hover:opacity-90 transition-opacity" 
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleRemovePhoto(issue.id, photo, true)}
                                    title="Remove this resolution photo"
                                    className="absolute top-1 right-1 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center text-xs shadow-md hover:bg-red-700 cursor-pointer"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                  <div className="absolute bottom-0 inset-x-0 bg-emerald-800 text-white text-[9px] text-center font-bold py-0.5 pointer-events-none">
                                    Fix #{pIdx + 1}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-400 italic">No resolution proof photos attached</div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Audit Trail Toggle */}
                <div className="pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => toggleAuditTrail(issue.id)}
                    className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1.5 py-1 cursor-pointer font-mono"
                  >
                    <History className="w-3.5 h-3.5 text-blue-600" />
                    <span>AUDIT TRAIL ({issue.auditTrail.length} Events)</span>
                    {isAuditExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {isAuditExpanded && (
                    <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs font-mono">
                      {issue.auditTrail.map((ev, idx) => (
                        <div key={ev.id || idx} className="flex items-start justify-between border-b border-slate-200 pb-1.5 last:border-b-0">
                          <div>
                            <span className="text-orange-600 font-bold">[{formatDateTime(ev.timestamp)}]</span>{' '}
                            <span className="text-slate-900 font-bold">{ev.performedByName} ({ev.performedByRole}):</span>{' '}
                            <span className="text-slate-700">{ev.action}</span>
                            {ev.notes && <div className="text-slate-500 pl-4 mt-0.5">&ldquo;{ev.notes}&rdquo;</div>}
                          </div>
                          {ev.newStatus && (
                            <span className="text-[11px] px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                              {ev.newStatus}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Contextual Action Buttons Bar */}
                <div className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  {/* Left Side: General collaboration tools */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenDepartmentModal(issue)}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-300 text-xs font-bold flex items-center gap-1.5 min-h-[40px] cursor-pointer"
                    >
                      <Building2 className="w-3.5 h-3.5 text-blue-600" />
                      <span>Reassign Dept</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenNoteModal(issue)}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-300 text-xs font-bold flex items-center gap-1.5 min-h-[40px] cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-orange-600" />
                      <span>Add Note</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenPhoto(issue.id, !isNotReady)}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-300 text-xs font-bold flex items-center gap-1.5 min-h-[40px] cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Attach Photo</span>
                    </button>
                  </div>

                  {/* Right Side: Role & Status Progression Workflow */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* ASSISTANT MANAGER ACTIONS */}
                    {isAssistant && (
                      <>
                        {isNotReady && (
                          <button
                            type="button"
                            onClick={() => handleStartWork(issue)}
                            className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow min-h-[44px] cursor-pointer"
                            id={`start-work-btn-${issue.id}`}
                          >
                            <Clock className="w-4 h-4" />
                            <span>START WORK (IN PROCESS)</span>
                          </button>
                        )}

                        {isInProcess && (
                          <button
                            type="button"
                            onClick={() => handleOpenResolveModal(issue)}
                            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow min-h-[44px] cursor-pointer"
                            id={`mark-resolved-btn-${issue.id}`}
                          >
                            <Check className="w-4 h-4" />
                            <span>MARK RESOLVED (SUBMIT TO MANAGER)</span>
                          </button>
                        )}
                      </>
                    )}

                    {/* MANAGER ACTIONS */}
                    {isManager && (
                      <>
                        {isWaitingVerify && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenReopenModal(issue)}
                              className="px-4 py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow min-h-[44px] cursor-pointer"
                              id={`reopen-btn-${issue.id}`}
                            >
                              <RotateCcw className="w-4 h-4" />
                              <span>REOPEN ISSUE</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleVerify(issue)}
                              className="px-5 py-2.5 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow min-h-[44px] cursor-pointer"
                              id={`verify-btn-${issue.id}`}
                            >
                              <ShieldCheck className="w-4 h-4" />
                              <span>VERIFY FIXED</span>
                            </button>
                          </div>
                        )}

                        {isVerified && (
                          <button
                            type="button"
                            onClick={() => handleOpenReopenModal(issue)}
                            className="px-3.5 py-2 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 rounded-xl border border-slate-300 text-xs font-bold flex items-center gap-1.5 min-h-[40px] cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reopen Verified Issue</span>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Note Modal */}
      {activeNoteIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white border-2 border-slate-200 rounded-2xl p-6 space-y-4 text-slate-900 shadow-2xl">
            <h3 className="text-lg font-black text-slate-900">Add Operational Note</h3>
            <p className="text-xs text-slate-500">For {activeNoteIssue.itemName} ({activeNoteIssue.criterionName})</p>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="e.g. Technician arrived, waiting on replacement ballast..."
              className="w-full h-32 bg-slate-50 text-slate-900 text-sm p-3 rounded-xl border border-slate-300 focus:outline-none focus:border-orange-500"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setActiveNoteIssue(null)}
                className="px-4 py-2 bg-white text-slate-700 rounded-xl border border-slate-300 font-bold text-xs hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNote}
                disabled={!noteText.trim()}
                className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-xs disabled:opacity-40 cursor-pointer shadow"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Department Modal */}
      {activeDeptIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white border-2 border-slate-200 rounded-2xl p-6 space-y-4 text-slate-900 shadow-2xl">
            <h3 className="text-lg font-black text-slate-900">Reassign Responsible Division</h3>
            <p className="text-xs text-slate-500">Select department to handle {activeDeptIssue.itemName}</p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {template.departments.map(dept => (
                <button
                  key={dept.id}
                  onClick={() => setSelectedDeptId(dept.id)}
                  className={`w-full p-3 rounded-xl border text-left font-bold text-sm flex items-center justify-between cursor-pointer ${
                    selectedDeptId === dept.id
                      ? 'bg-orange-50 text-orange-800 border-orange-400'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>{dept.name}</span>
                  {selectedDeptId === dept.id && <Check className="w-4 h-4 text-orange-600" />}
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setActiveDeptIssue(null)}
                className="px-4 py-2 bg-white text-slate-700 rounded-xl border border-slate-300 font-bold text-xs hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDepartment}
                className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-xs cursor-pointer shadow"
              >
                Confirm Department
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark Resolved Modal (Assistant Manager) */}
      {activeResolveIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white border-2 border-slate-200 rounded-2xl p-6 space-y-4 text-slate-900 shadow-2xl">
            <h3 className="text-lg font-black text-slate-900">Mark Issue As Resolved</h3>
            <p className="text-xs text-slate-500">
              This will update status to <strong>WAITING FOR MANAGER VERIFICATION</strong>. The Manager will personally verify the fix.
            </p>
            <textarea
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              placeholder="Resolution details (e.g. Cleaned by housekeeper, restocked amenities)..."
              className="w-full h-24 bg-slate-50 text-slate-900 text-sm p-3 rounded-xl border border-slate-300 focus:outline-none focus:border-blue-500"
            />

            {/* Resolution Photos Selection */}
            <div className="space-y-2 pt-1 border-t border-slate-200">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Proof Photos (Optional): {resolveProofPhotos.length > 0 && `(${resolveProofPhotos.length} attached)`}</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsResolutionPhoto(true);
                    setPhotoModalOpen(true);
                  }}
                  className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>+ Add Proof Photo</span>
                </button>
              </div>

              {resolveProofPhotos.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {resolveProofPhotos.map((photo, idx) => (
                    <div key={idx} className="relative group rounded-xl overflow-hidden border border-emerald-400 bg-white shadow-2xs">
                      <img src={photo} alt={`Proof ${idx + 1}`} className="w-14 h-14 object-cover" />
                      <button
                        type="button"
                        onClick={() => setResolveProofPhotos(prev => prev.filter((_, i) => i !== idx))}
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
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setActiveResolveIssue(null);
                  setResolveProofPhotos([]);
                }}
                className="px-4 py-2 bg-white text-slate-700 rounded-xl border border-slate-300 font-bold text-xs hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmResolve}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow min-h-[40px]"
              >
                Submit Resolution
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reopen Issue Modal (Manager) */}
      {activeReopenIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white border-2 border-red-200 rounded-2xl p-6 space-y-4 text-slate-900 shadow-2xl">
            <div className="flex items-center gap-2 text-red-600">
              <RotateCcw className="w-6 h-6" />
              <h3 className="text-lg font-black text-slate-900">Reopen Defect</h3>
            </div>
            <p className="text-xs text-slate-500">
              Physical inspection showed problem still persists. Status will revert to <strong>NOT READY</strong>.
            </p>
            <textarea
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              placeholder="Reason for reopening (e.g. Floor still stained behind table, drain still gurgling)..."
              className="w-full h-28 bg-slate-50 text-slate-900 text-sm p-3 rounded-xl border border-slate-300 focus:outline-none focus:border-red-500"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setActiveReopenIssue(null)}
                className="px-4 py-2 bg-white text-slate-700 rounded-xl border border-slate-300 font-bold text-xs hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReopen}
                disabled={!reopenReason.trim()}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs disabled:opacity-40 cursor-pointer shadow"
              >
                Confirm Reopen
              </button>
            </div>
          </div>
        </div>
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

      {/* Camera Photo Modal */}
      <PhotoCaptureModal
        isOpen={photoModalOpen}
        title={isResolutionPhoto ? 'Attach Resolution Proof Photo' : 'Attach Issue Photo'}
        onClose={() => setPhotoModalOpen(false)}
        onPhotoSaved={handlePhotoSaved}
      />
    </div>
  );
};
