import React, { useState, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { StaffAccount, AccountabilityPoint, StaffCall, UserRole } from '../types';
import { 
  Users, 
  UserPlus, 
  PhoneCall, 
  Award, 
  Plus, 
  Minus, 
  CheckCircle2, 
  Clock, 
  Shield, 
  KeyRound, 
  Search, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Building, 
  Briefcase,
  History,
  X,
  Send,
  Lock,
  ChevronRight,
  Filter,
  Camera,
  Upload,
  User,
  Check,
  AlertCircle,
  Sparkles,
  Info
} from 'lucide-react';

const COMMON_DIVISIONS = [
  'Floor Operations',
  'KTV Rooms & Service',
  'Bar & Beverage',
  'Kitchen & Food Prep',
  'Cashier & Reception',
  'Audio & Sound Control',
  'Housekeeping & Hygiene',
  'Security & Ingress',
  'Maintenance & Facilities'
];

export const StaffManagementView: React.FC = () => {
  const { currentUser, isManager, isAssistantManager, registerStaffProfile, refreshUsers } = useAuth();
  const { 
    staffProfiles, 
    accountabilityPoints, 
    staffCalls, 
    updateStaffProfile, 
    deleteStaffProfile,
    addAccountabilityPoint,
    sendStaffCall,
    dailyTasks,
    venues
  } = useData();

  // Active view tab for managers: 'team' | 'points' | 'calls'
  const [activeTab, setActiveTab] = useState<'team' | 'points' | 'calls'>('team');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');
  const [companyFilter, setCompanyFilter] = useState<'ALL' | 'luckycat' | 'JPE KTV'>('ALL');

  // Modal States
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [staffToResetPin, setStaffToResetPin] = useState<StaffAccount | null>(null);
  const [staffToCall, setStaffToCall] = useState<StaffAccount | null>(null);
  const [staffForPoints, setStaffForPoints] = useState<StaffAccount | null>(null);

  // Form States - Add Staff
  const [formName, setFormName] = useState('');
  const [formPhoto, setFormPhoto] = useState<string | null>(null);
  const [formCompany, setFormCompany] = useState<'luckycat' | 'JPE KTV'>('luckycat');
  const [formDivision, setFormDivision] = useState('Floor Operations');
  const [customDivision, setCustomDivision] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('STAFF');
  const [formVenueIds, setFormVenueIds] = useState<string[]>([]);
  const [formPin, setFormPin] = useState('');
  const [formConfirmPin, setFormConfirmPin] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live Camera state for Add Staff Modal
  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form States - Reset PIN
  const [newPin, setNewPin] = useState('');
  const [pinError, setPinError] = useState('');

  // Form States - Urgent Call
  const [callMessage, setCallMessage] = useState('');
  const [callError, setCallError] = useState('');

  // Form States - Accountability Points
  const [pointAmount, setPointAmount] = useState<number>(5);
  const [pointAction, setPointAction] = useState<'ADD' | 'REMOVE'>('ADD');
  const [pointReason, setPointReason] = useState('');
  const [pointTaskId, setPointTaskId] = useState('');
  const [pointError, setPointError] = useState('');

  // Filtered staff profiles for Manager View
  const filteredStaff = useMemo(() => {
    return staffProfiles.filter(staff => {
      if (selectedRoleFilter !== 'ALL' && staff.role !== selectedRoleFilter) return false;
      if (companyFilter !== 'ALL') {
        const co = (staff.company || '').toLowerCase();
        if (companyFilter === 'luckycat' && !co.includes('lucky')) return false;
        if (companyFilter === 'JPE KTV' && !co.includes('jpe') && !co.includes('ktv')) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = staff.name.toLowerCase().includes(q);
        const matchCompany = (staff.company || '').toLowerCase().includes(q);
        const matchDivision = (staff.division || '').toLowerCase().includes(q);
        const matchRole = staff.role.toLowerCase().includes(q);
        if (!matchName && !matchCompany && !matchDivision && !matchRole) return false;
      }
      return true;
    });
  }, [staffProfiles, selectedRoleFilter, companyFilter, searchQuery]);

  // Points calculation map (used by manager or for current user)
  const staffPointsMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const pt of accountabilityPoints) {
      const current = map[pt.staffId] || 0;
      map[pt.staffId] = current + (pt.actionType === 'ADD' ? pt.amount : -pt.amount);
    }
    return map;
  }, [accountabilityPoints]);

  // Current staff user's own points
  const myPoints = useMemo(() => {
    if (!currentUser) return 0;
    return staffPointsMap[currentUser.id] || 0;
  }, [currentUser, staffPointsMap]);

  // Current staff user's own points history
  const myPointsHistory = useMemo(() => {
    if (!currentUser) return [];
    return accountabilityPoints.filter(pt => pt.staffId === currentUser.id || pt.staffName === currentUser.name);
  }, [currentUser, accountabilityPoints]);

  // Camera cleanup
  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const startLiveCamera = async () => {
    try {
      setFormError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 640 }, facingMode: 'user' }
      });
      streamRef.current = stream;
      setIsLiveCameraOpen(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }
  };

  const capturePhotoFromVideo = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    const size = Math.min(videoRef.current.videoWidth || 400, videoRef.current.videoHeight || 400);
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const startX = ((videoRef.current.videoWidth || 400) - size) / 2;
      const startY = ((videoRef.current.videoHeight || 400) - size) / 2;
      ctx.drawImage(videoRef.current, startX, startY, size, size, 0, 0, 300, 300);
      setFormPhoto(canvas.toDataURL('image/jpeg', 0.85));
    }
    stopCameraStream();
    setIsLiveCameraOpen(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 300;
        canvas.height = 300;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const minEdge = Math.min(img.width, img.height);
          const sx = (img.width - minEdge) / 2;
          const sy = (img.height - minEdge) / 2;
          ctx.drawImage(img, sx, sy, minEdge, minEdge, 0, 0, 300, 300);
          setFormPhoto(canvas.toDataURL('image/jpeg', 0.85));
        } else {
          setFormPhoto(event.target?.result as string);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Open Add Staff Modal
  const handleOpenAddStaff = () => {
    setFormName('');
    setFormPhoto(null);
    setFormCompany('luckycat');
    setFormDivision('Floor Operations');
    setCustomDivision('');
    setFormRole('STAFF');
    setFormPin('');
    setFormConfirmPin('');
    setFormError('');
    setIsLiveCameraOpen(false);
    setIsAddStaffOpen(true);
  };

  // Submit Add Staff Form
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Staff name is required');
      return;
    }
    if (!formPin.trim() || formPin.trim().length !== 4 || !/^\d{4}$/.test(formPin.trim())) {
      setFormError('A 4-digit PIN is strictly required for tablet login');
      return;
    }
    if (formPin.trim() !== formConfirmPin.trim()) {
      setFormError('PIN confirmation does not match');
      return;
    }
    if (formRole !== 'MANAGER' && formVenueIds.length === 0) {
      setFormError('Select at least one venue for this staff member.');
      return;
    }

    const finalDivision = formDivision === 'OTHER' ? customDivision.trim() || 'General Operations' : formDivision;

    setIsSubmitting(true);
    setFormError('');
    try {
      // Registration is one server transaction.  The previous two-step flow
      // created mismatched profile and login ids.
      const registration = await registerStaffProfile({
        name: formName.trim(),
        photo: formPhoto || undefined,
        company: formCompany,
        division: finalDivision,
        role: formRole,
        pin: formPin.trim(),
        venueId: formVenueIds[0] || currentUser?.venueId || 'venue-default',
        assignedVenueIds: formRole === 'MANAGER' ? venues.map(venue => venue.id) : formVenueIds
      });

      if (registration.success) {
        setIsAddStaffOpen(false);
        stopCameraStream();
      } else {
        setFormError(registration.error || 'Failed to create staff profile');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset PIN
  const handleResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffToResetPin) return;
    if (!newPin.trim() || newPin.trim().length !== 4 || !/^\d{4}$/.test(newPin.trim())) {
      setPinError('Please enter a valid 4-digit numeric PIN');
      return;
    }

    setIsSubmitting(true);
    setPinError('');
    try {
      const res = await updateStaffProfile(staffToResetPin, newPin.trim());
      if (res.ok) {
        setStaffToResetPin(null);
        setNewPin('');
      } else {
        setPinError(res.error || 'Failed to update PIN');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Dispatch Urgent Staff Call
  const handleDispatchCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffToCall) return;

    setIsSubmitting(true);
    setCallError('');
    try {
      const message = callMessage.trim() || 'Report to Manager Station immediately for operational duty.';
      const res = await sendStaffCall({
        staffId: staffToCall.id,
        staffName: staffToCall.name,
        message
      });

      if (res.ok) {
        setStaffToCall(null);
        setCallMessage('');
        setActiveTab('calls');
      } else {
        setCallError(res.error || 'Failed to dispatch staff call');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Assign Accountability Points
  const handleAssignPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffForPoints) return;

    const trimmedReason = pointReason.trim();
    if (!trimmedReason || trimmedReason.length < 5) {
      setPointError('A clear, mandatory operational reason is required (minimum 5 characters).');
      return;
    }

    const selectedTask = dailyTasks.find(t => t.id === pointTaskId);

    setIsSubmitting(true);
    setPointError('');
    try {
      const res = await addAccountabilityPoint({
        staffId: staffForPoints.id,
        staffName: staffForPoints.name,
        amount: Math.abs(pointAmount) || 5,
        actionType: pointAction,
        reason: trimmedReason,
        relatedTaskId: pointTaskId || undefined,
        relatedTaskName: selectedTask?.title || undefined
      });

      if (res.ok) {
        setStaffForPoints(null);
        setPointReason('');
        setPointTaskId('');
        setPointAmount(5);
        setActiveTab('points');
      } else {
        setPointError(res.error || 'Failed to assign accountability points');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'MANAGER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-orange-100 text-orange-800 border border-orange-200">
            MANAGER
          </span>
        );
      case 'ASSISTANT_MANAGER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            ASST. MANAGER
          </span>
        );
      case 'STAFF':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            STAFF
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            {role}
          </span>
        );
    }
  };

  // =========================================================================
  // NON-MANAGER VIEW: EACH STAFF CAN ONLY SEE THEIR OWN POINTS!
  // =========================================================================
  if (!isManager) {
    const positivePoints = myPointsHistory
      .filter(p => p.actionType === 'ADD')
      .reduce((sum, p) => sum + p.amount, 0);

    const negativePoints = myPointsHistory
      .filter(p => p.actionType === 'REMOVE')
      .reduce((sum, p) => sum + p.amount, 0);

    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Personal Profile & Accountability Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
            {/* Photo Avatar */}
            <div className="relative shrink-0">
              {currentUser?.photo ? (
                <img 
                  src={currentUser.photo} 
                  alt={currentUser.name} 
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-slate-200 shadow-sm"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center font-black text-2xl text-emerald-700 shadow-sm">
                  {currentUser?.name?.substring(0, 2).toUpperCase() || 'ST'}
                </div>
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                  STAFF MEMBER
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  {currentUser?.company || 'luckycat'}
                </span>
                {currentUser?.division && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200">
                    {currentUser.division}
                  </span>
                )}
              </div>

              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {currentUser?.name}
              </h1>
              <p className="text-xs text-slate-500 mt-1 flex items-center justify-center sm:justify-start gap-1">
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                <span>Personal Accountability & Performance Record</span>
              </p>
            </div>
          </div>

          {/* Privacy Reassurance Pill */}
          <div className="px-3.5 py-2 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-2 text-xs font-bold text-slate-600">
            <Lock className="w-4 h-4 text-orange-500 shrink-0" />
            <span className="text-[11px] leading-tight">
              Confidential: Only you and venue management can see your points.
            </span>
          </div>
        </div>

        {/* My Score Hero Metric Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Net Score */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
              <span>My Current Points</span>
              <Award className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className={`text-4xl font-black font-mono ${
                myPoints > 0 ? 'text-emerald-600' : myPoints < 0 ? 'text-red-600' : 'text-slate-800'
              }`}>
                {myPoints > 0 ? `+${myPoints}` : myPoints}
              </span>
              <span className="text-sm font-bold text-slate-400">pts</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Net balance of all manager awards & deductions.
            </p>
          </div>

          {/* Positive Awards */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-emerald-700">
              <span>Points Earned</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-4xl font-black font-mono text-emerald-600">
                +{positivePoints}
              </span>
              <span className="text-sm font-bold text-emerald-600/70">pts</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Awarded for diligent shift checklist execution.
            </p>
          </div>

          {/* Deductions */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-red-700">
              <span>Deductions</span>
              <TrendingDown className="w-4 h-4 text-red-600" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-4xl font-black font-mono text-red-600">
                -{negativePoints}
              </span>
              <span className="text-sm font-bold text-red-600/70">pts</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Deductions logged for skipped or unresolved duties.
            </p>
          </div>
        </div>

        {/* My Personal Points Ledger */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-amber-600" />
                <span>My Points History ({myPointsHistory.length})</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Detailed audit trail of accountability points assigned to your profile
              </p>
            </div>
          </div>

          {myPointsHistory.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center">
              <Award className="w-12 h-12 text-slate-300 mb-2" />
              <h3 className="text-sm font-bold text-slate-700">No Point Adjustments Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                You currently have a clean accountability record. Complete opening/closing tasks and checklists diligently to build positive points!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {myPointsHistory.map(entry => {
                const isAdd = entry.actionType === 'ADD';
                const formattedDate = new Date(entry.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });

                return (
                  <div 
                    key={entry.id}
                    className="p-4 rounded-2xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-mono font-black px-2.5 py-0.5 rounded-lg ${
                          isAdd 
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                            : 'bg-red-100 text-red-800 border border-red-200'
                        }`}>
                          {isAdd ? `+${entry.amount} PTS` : `-${entry.amount} PTS`}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          {formattedDate}
                        </span>
                      </div>

                      <p className="text-sm font-bold text-slate-800 mt-1">
                        {entry.reason}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                        <span>Awarded by: <strong className="text-slate-700 font-bold">{entry.managerName}</strong></span>
                        {entry.relatedTaskName && (
                          <span>• Task: <strong className="text-slate-700 font-bold">{entry.relatedTaskName}</strong></span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Operational Guidance */}
        <div className="p-4 bg-orange-50/60 border border-orange-200 rounded-2xl flex items-start gap-3 text-xs text-orange-900">
          <Info className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">About Accountability Points</div>
            <p className="mt-0.5 text-orange-800/90 leading-relaxed">
              Points are assigned by Managers and Assistant Managers based on shift quality, safety adherence, on-time task resolution, and thorough area inspections.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // MANAGER VIEW: FULL POINT SYSTEM & WORKFORCE ROSTER
  // =========================================================================
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner Header */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-orange-100 text-orange-800 text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Management Oversight
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Multi-Staff Accountability System • luckycat & JPE KTV
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Users className="w-7 h-7 text-orange-600" />
            Team Directory & Accountability System
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Manage staff profiles, assign performance accountability points, reset tablet PINs, and dispatch urgent calls.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAddStaff}
          className="px-5 py-3 rounded-2xl bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-black text-sm shadow-md shadow-orange-600/20 flex items-center gap-2 transition-all cursor-pointer shrink-0"
          id="manager-add-staff-btn"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Staff Profile</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Staff</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{staffProfiles.length}</div>
          <div className="text-xs text-slate-500 mt-0.5">Profiles on roster</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Staff</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {staffProfiles.filter(s => s.status === 'ACTIVE').length}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">Ready for duty</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Points Ledger</span>
            <Award className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-600 mt-1">
            {accountabilityPoints.length}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">Recorded adjustments</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Urgent Calls</span>
            <PhoneCall className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-black text-red-600 mt-1">
            {staffCalls.length}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            {staffCalls.filter(c => c.status === 'ACKNOWLEDGED').length} acknowledged
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('team')}
          className={`px-4 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'team'
              ? 'bg-orange-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
          id="tab-team-directory"
        >
          <Users className="w-4 h-4" />
          <span>Staff Directory ({filteredStaff.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('points')}
          className={`px-4 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'points'
              ? 'bg-orange-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
          id="tab-points-ledger"
        >
          <Award className="w-4 h-4" />
          <span>Accountability Points Ledger ({accountabilityPoints.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('calls')}
          className={`px-4 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'calls'
              ? 'bg-orange-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
          id="tab-urgent-calls"
        >
          <PhoneCall className="w-4 h-4" />
          <span>Urgent Calls Log ({staffCalls.length})</span>
        </button>
      </div>

      {/* TAB 1: TEAM DIRECTORY */}
      {activeTab === 'team' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search staff, company, division..."
                className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Company Filter */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setCompanyFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    companyFilter === 'ALL' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setCompanyFilter('luckycat')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    companyFilter === 'luckycat' ? 'bg-orange-600 text-white shadow-xs' : 'text-orange-700 hover:bg-orange-50'
                  }`}
                >
                  luckycat
                </button>
                <button
                  type="button"
                  onClick={() => setCompanyFilter('JPE KTV')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    companyFilter === 'JPE KTV' ? 'bg-indigo-600 text-white shadow-xs' : 'text-indigo-700 hover:bg-indigo-50'
                  }`}
                >
                  JPE KTV
                </button>
              </div>

              {/* Role Filter */}
              <select
                value={selectedRoleFilter}
                onChange={e => setSelectedRoleFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="ALL">All Roles</option>
                <option value="MANAGER">Managers</option>
                <option value="ASSISTANT_MANAGER">Assistant Managers</option>
                <option value="STAFF">Staff</option>
              </select>
            </div>
          </div>

          {/* Staff Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStaff.map(staff => {
              const points = staffPointsMap[staff.id] || 0;
              const isKtv = (staff.company || '').toLowerCase().includes('jpe') || (staff.company || '').toLowerCase().includes('ktv');

              return (
                <div
                  key={staff.id}
                  className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:border-orange-300 transition-all flex flex-col justify-between"
                  id={`staff-card-${staff.id}`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        {/* Photo Thumbnail */}
                        {staff.photo ? (
                          <img 
                            src={staff.photo} 
                            alt={staff.name} 
                            className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0" 
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-slate-600 shrink-0 text-sm">
                            {staff.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}

                        <div>
                          <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                            {staff.name}
                          </h3>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                              isKtv 
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200' 
                                : 'bg-orange-50 text-orange-700 border-orange-200'
                            }`}>
                              {staff.company || 'luckycat'}
                            </span>
                            {staff.division && (
                              <span className="text-[10px] text-slate-500 font-medium bg-slate-100 px-1.5 py-0.5 rounded-md">
                                {staff.division}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {getRoleBadge(staff.role)}
                    </div>

                    {/* Points Metric Bar */}
                    <div className="my-3 p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-amber-500" />
                        <span className="text-xs font-bold text-slate-700">Accountability Score:</span>
                      </div>
                      <span className={`text-base font-black font-mono ${
                        points > 0 ? 'text-emerald-600' : points < 0 ? 'text-red-600' : 'text-slate-700'
                      }`}>
                        {points > 0 ? `+${points}` : points} pts
                      </span>
                    </div>
                  </div>

                  {/* Manager Action Buttons */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setStaffForPoints(staff);
                        setPointAmount(5);
                        setPointAction('ADD');
                        setPointReason('');
                        setPointTaskId('');
                        setPointError('');
                      }}
                      className="flex-1 py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-lg text-xs font-bold flex items-center justify-center gap-1 border border-amber-200 transition-colors cursor-pointer"
                      title="Award or deduct accountability points"
                    >
                      <Award className="w-3.5 h-3.5 text-amber-600" />
                      <span>Points (+/-)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setStaffToCall(staff);
                        setCallMessage('Report to Manager Station immediately for operational duty.');
                        setCallError('');
                      }}
                      className="py-1.5 px-2.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1 border border-red-200 transition-colors cursor-pointer"
                      title="Dispatch urgent call to tablet"
                    >
                      <PhoneCall className="w-3.5 h-3.5 text-red-600" />
                      <span>Call</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setStaffToResetPin(staff);
                        setNewPin('');
                        setPinError('');
                      }}
                      className="py-1.5 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1 border border-slate-200 transition-colors cursor-pointer"
                      title="Reset tablet login PIN"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                      <span>PIN</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredStaff.length === 0 && (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">No staff profiles found</h3>
              <p className="text-xs text-slate-500 mt-1">Try adjusting your filters or click Add Staff Profile.</p>
              <button
                type="button"
                onClick={handleOpenAddStaff}
                className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-xl text-xs font-black shadow cursor-pointer hover:bg-orange-500"
              >
                + Add Staff Profile
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ACCOUNTABILITY POINTS LEDGER (MANAGER ONLY) */}
      {activeTab === 'points' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-600" />
                <span>Accountability Points Audit Trail ({accountabilityPoints.length})</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Full chronological ledger of performance points awarded and deducted across all staff.
              </p>
            </div>
          </div>

          {accountabilityPoints.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 rounded-2xl border border-slate-200">
              <Award className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-700">No Points Recorded Yet</h3>
              <p className="text-xs text-slate-500 mt-1">
                Go to the Staff Directory tab and click "Points (+/-)" on any staff member to award or deduct points.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {accountabilityPoints.map(entry => {
                const isAdd = entry.actionType === 'ADD';
                const formattedDate = new Date(entry.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });

                return (
                  <div
                    key={entry.id}
                    className="p-4 rounded-2xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-mono font-black px-2.5 py-0.5 rounded-lg ${
                          isAdd 
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                            : 'bg-red-100 text-red-800 border border-red-200'
                        }`}>
                          {isAdd ? `+${entry.amount} PTS` : `-${entry.amount} PTS`}
                        </span>
                        <span className="text-sm font-black text-slate-900">
                          {entry.staffName}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          • {formattedDate}
                        </span>
                      </div>

                      <p className="text-sm font-bold text-slate-800 mt-1">
                        {entry.reason}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                        <span>Assigned by: <strong className="text-slate-700 font-bold">{entry.managerName}</strong></span>
                        {entry.relatedTaskName && (
                          <span>• Linked Task: <strong className="text-slate-700 font-bold">{entry.relatedTaskName}</strong></span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: URGENT CALLS LOG */}
      {activeTab === 'calls' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <PhoneCall className="w-5 h-5 text-red-600" />
                <span>Urgent Staff Calls Broadcast Log ({staffCalls.length})</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time tablet notifications dispatched to staff members.
              </p>
            </div>
          </div>

          {staffCalls.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 rounded-2xl border border-slate-200">
              <PhoneCall className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-700">No Urgent Calls Sent</h3>
              <p className="text-xs text-slate-500 mt-1">
                Dispatch an urgent call from the Staff Directory tab to summon a staff member to your station.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {staffCalls.map(call => {
                const formattedDate = new Date(call.sentAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });

                return (
                  <div
                    key={call.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-red-100 text-red-800 border border-red-200">
                          CALL DISPATCHED
                        </span>
                        <span className="text-sm font-black text-slate-900">
                          To: {call.staffName}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          • {formattedDate}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 font-medium mt-1">
                        "{call.message}"
                      </p>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Sent by: {call.managerName}
                      </div>
                    </div>

                    <div className="shrink-0">
                      {call.status === 'ACKNOWLEDGED' ? (
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Acknowledged
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-lg flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 animate-spin" />
                          Pending Response
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL: ADD STAFF PROFILE */}
      {isAddStaffOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900 my-6 animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-base font-black flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-orange-500" />
                Add New Staff Member
              </h3>
              <button 
                onClick={() => {
                  stopCameraStream();
                  setIsAddStaffOpen(false);
                }}
                className="p-1 rounded-xl text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Photo & Name Row */}
              <div className="flex flex-col sm:flex-row items-center gap-4 pb-3 border-b border-slate-100">
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <div className="relative w-20 h-20 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 overflow-hidden flex items-center justify-center">
                    {formPhoto ? (
                      <img src={formPhoto} alt="Staff" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-6 h-6 text-slate-400" />
                    )}
                    {formPhoto && (
                      <button
                        type="button"
                        onClick={() => setFormPhoto(null)}
                        className="absolute top-1 right-1 bg-slate-900 text-white p-1 rounded-full text-xs hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={startLiveCamera}
                      className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 rounded-md border border-slate-200 text-slate-700"
                    >
                      Camera
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 rounded-md border border-slate-200 text-slate-700"
                    >
                      Upload
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="user"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                </div>

                {isLiveCameraOpen && (
                  <div className="flex-1 bg-slate-900 p-2 rounded-xl flex flex-col items-center gap-2">
                    <video ref={videoRef} autoPlay playsInline muted className="w-32 h-32 object-cover rounded-lg" />
                    <button
                      type="button"
                      onClick={capturePhotoFromVideo}
                      className="px-3 py-1 bg-orange-600 text-white text-xs font-bold rounded-md"
                    >
                      Snap Photo
                    </button>
                  </div>
                )}

                {!isLiveCameraOpen && (
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Staff Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                      placeholder="e.g. Alex Tan"
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
                    />
                  </div>
                )}
              </div>

              {/* Company Selection (luckycat vs JPE KTV) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Company / Venue Unit *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormCompany('luckycat')}
                    className={`p-3 rounded-xl border-2 flex items-center gap-2.5 text-left cursor-pointer transition-all ${
                      formCompany === 'luckycat'
                        ? 'border-orange-500 bg-orange-50/50'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-orange-500 text-white flex items-center justify-center font-black text-xs">
                      LC
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-900">luckycat</div>
                      <div className="text-[10px] text-slate-500 font-medium">Bistro & Lounge</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormCompany('JPE KTV')}
                    className={`p-3 rounded-xl border-2 flex items-center gap-2.5 text-left cursor-pointer transition-all ${
                      formCompany === 'JPE KTV'
                        ? 'border-indigo-600 bg-indigo-50/50'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-xs">
                      KTV
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-900">JPE KTV</div>
                      <div className="text-[10px] text-slate-500 font-medium">Entertainment Rooms</div>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Venue access *</label>
                <div className="grid grid-cols-2 gap-2">
                  {venues.map(venue => <label key={venue.id} className="flex items-center gap-2 rounded-lg border p-2 text-xs font-semibold cursor-pointer">
                    <input type="checkbox" checked={formRole === 'MANAGER' || formVenueIds.includes(venue.id)} disabled={formRole === 'MANAGER'} onChange={() => setFormVenueIds(previous => previous.includes(venue.id) ? previous.filter(id => id !== venue.id) : [...previous, venue.id])} />
                    {venue.name}
                  </label>)}
                </div>
                <p className="mt-1 text-[10px] text-slate-500">Managers always receive all venues. Staff and assistant managers may have one or more.</p>
              </div>

              {/* Division & Role */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Division *
                  </label>
                  <select
                    value={formDivision}
                    onChange={e => setFormDivision(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {COMMON_DIVISIONS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                    <option value="OTHER">Custom Division...</option>
                  </select>
                  {formDivision === 'OTHER' && (
                    <input
                      type="text"
                      value={customDivision}
                      onChange={e => setCustomDivision(e.target.value)}
                      placeholder="Division name"
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl mt-1.5 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Role *
                  </label>
                  <select
                    value={formRole}
                    onChange={e => setFormRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="STAFF">STAFF (Floor Inspections)</option>
                    <option value="ASSISTANT_MANAGER">ASSISTANT MANAGER</option>
                    <option value="MANAGER">MANAGER</option>
                  </select>
                </div>
              </div>

              {/* 4-Digit Login PIN */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Initial 4-Digit Login PIN *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    required
                    value={formPin}
                    onChange={e => setFormPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="PIN (e.g. 1234)"
                    className="w-full px-3.5 py-2 text-center text-base tracking-widest font-mono font-bold bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    required
                    value={formConfirmPin}
                    onChange={e => setFormConfirmPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="Confirm PIN"
                    className="w-full px-3.5 py-2 text-center text-base tracking-widest font-mono font-bold bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Staff member will enter this 4-digit PIN on tablets to log into their shift.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    stopCameraStream();
                    setIsAddStaffOpen(false);
                  }}
                  className="px-4 py-2 rounded-xl text-slate-600 font-bold text-xs hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{isSubmitting ? 'Saving...' : 'Create Staff Profile'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RESET PIN */}
      {staffToResetPin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-orange-600" />
                Reset PIN: {staffToResetPin.name}
              </h3>
              <button 
                onClick={() => setStaffToResetPin(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPin} className="p-6 space-y-4">
              {pinError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-700">
                  {pinError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  New 4-Digit Numeric PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  required
                  value={newPin}
                  onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full px-4 py-3 text-center text-2xl tracking-widest font-mono font-bold bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setStaffToResetPin(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-bold text-xs hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || newPin.length !== 4}
                  className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Updating...' : 'Set New PIN'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DISPATCH URGENT STAFF CALL */}
      {staffToCall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border-2 border-red-400 overflow-hidden text-slate-900">
            <div className="px-6 py-4 bg-red-600 text-white flex items-center justify-between">
              <h3 className="text-base font-black flex items-center gap-2">
                <PhoneCall className="w-5 h-5 text-white" />
                Dispatch Urgent Call to {staffToCall.name}
              </h3>
              <button 
                onClick={() => setStaffToCall(null)}
                className="p-1 rounded-xl text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDispatchCall} className="p-6 space-y-4">
              {callError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-700">
                  {callError}
                </div>
              )}

              <p className="text-xs text-slate-600">
                This will trigger an immediate high-priority audio-visual broadcast on all tablets where{' '}
                <strong className="text-slate-900 font-bold">{staffToCall.name}</strong> is active.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Urgent Call Message / Preset:
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <button
                    type="button"
                    onClick={() => setCallMessage('Report to Manager Station immediately for operational duty.')}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium cursor-pointer"
                  >
                    Station Duty
                  </button>
                  <button
                    type="button"
                    onClick={() => setCallMessage('Urgent assistance required in current area inspection.')}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium cursor-pointer"
                  >
                    Inspection Help
                  </button>
                  <button
                    type="button"
                    onClick={() => setCallMessage('Shift Handover Briefing starting now.')}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium cursor-pointer"
                  >
                    Handover Standup
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={callMessage}
                  onChange={e => setCallMessage(e.target.value)}
                  placeholder="Type urgent instructions..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 font-medium text-slate-800"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setStaffToCall(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-bold text-xs hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Sending...' : 'Dispatch Alert'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ASSIGN ACCOUNTABILITY POINTS */}
      {staffForPoints && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900">
            <div className="px-6 py-4 bg-amber-500 text-white flex items-center justify-between">
              <h3 className="text-base font-black flex items-center gap-2">
                <Award className="w-5 h-5 text-white" />
                Accountability Points: {staffForPoints.name}
              </h3>
              <button 
                onClick={() => setStaffForPoints(null)}
                className="p-1 rounded-xl text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignPoints} className="p-6 space-y-4">
              {pointError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-700">
                  {pointError}
                </div>
              )}

              {/* Action Type Toggle */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Point Action:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPointAction('ADD')}
                    className={`py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                      pointAction === 'ADD'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    <span>Award (+ Points)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPointAction('REMOVE')}
                    className={`py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                      pointAction === 'REMOVE'
                        ? 'bg-red-600 text-white border-red-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Minus className="w-4 h-4" />
                    <span>Deduct (- Points)</span>
                  </button>
                </div>
              </div>

              {/* Amount Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Point Value:
                </label>
                <div className="flex items-center gap-2">
                  {[1, 3, 5, 10].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setPointAmount(amt)}
                      className={`flex-1 py-2 rounded-xl text-sm font-mono font-black transition-all cursor-pointer border ${
                        pointAmount === amt
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mandatory Reason */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Mandatory Operational Reason *
                </label>
                <textarea
                  rows={3}
                  required
                  value={pointReason}
                  onChange={e => setPointReason(e.target.value)}
                  placeholder="Explain why points are being awarded or deducted..."
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium text-slate-800"
                />
              </div>

              {/* Optional Linked Task */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Link to Task (Optional):
                </label>
                <select
                  value={pointTaskId}
                  onChange={e => setPointTaskId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">None (General Performance)</option>
                  {dailyTasks.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({t.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setStaffForPoints(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-bold text-xs hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Award className="w-4 h-4" />
                  <span>{isSubmitting ? 'Saving...' : 'Record Points'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
