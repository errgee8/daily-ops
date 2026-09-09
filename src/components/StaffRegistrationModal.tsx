import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Camera, 
  Upload, 
  User, 
  Building, 
  Briefcase, 
  Shield, 
  KeyRound, 
  Check, 
  AlertCircle, 
  RefreshCw,
  Sparkles,
  Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface StaffRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (registeredName: string) => void;
}

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

export const StaffRegistrationModal: React.FC<StaffRegistrationModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { registerStaffProfile } = useAuth();

  const [name, setName] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [company, setCompany] = useState<'luckycat' | 'JPE KTV'>('luckycat');
  const [division, setDivision] = useState('Floor Operations');
  const [customDivision, setCustomDivision] = useState('');
  const [role, setRole] = useState<UserRole>('STAFF');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live Camera state
  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset form on open
  useEffect(() => {
    if (isOpen) {
      setName('');
      setPhotoPreview(null);
      setCompany('luckycat');
      setDivision('Floor Operations');
      setCustomDivision('');
      setRole('STAFF');
      setPin('');
      setConfirmPin('');
      setErrorMessage('');
      setIsLiveCameraOpen(false);
    }
  }, [isOpen]);

  // Clean up camera stream if unmounting or closing
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const startLiveCamera = async () => {
    try {
      setErrorMessage('');
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
      console.warn('Could not access live camera, falling back to file picker:', err);
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
      // Center crop square
      const startX = ((videoRef.current.videoWidth || 400) - size) / 2;
      const startY = ((videoRef.current.videoHeight || 400) - size) / 2;
      ctx.drawImage(videoRef.current, startX, startY, size, size, 0, 0, 300, 300);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setPhotoPreview(dataUrl);
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
        const dim = 300;
        canvas.width = dim;
        canvas.height = dim;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Crop square to avatar
          const minEdge = Math.min(img.width, img.height);
          const sx = (img.width - minEdge) / 2;
          const sy = (img.height - minEdge) / 2;
          ctx.drawImage(img, sx, sy, minEdge, minEdge, 0, 0, dim, dim);
          setPhotoPreview(canvas.toDataURL('image/jpeg', 0.85));
        } else {
          setPhotoPreview(event.target?.result as string);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanName = name.trim();
    if (!cleanName) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      setErrorMessage('Your login PIN must be exactly 4 numbers (e.g. 1234).');
      return;
    }

    if (pin !== confirmPin) {
      setErrorMessage('The confirmation PIN does not match. Please re-enter.');
      return;
    }

    const finalDivision = division === 'OTHER' ? customDivision.trim() || 'General Operations' : division;

    setIsSubmitting(true);
    try {
      const result = await registerStaffProfile({
        name: cleanName,
        photo: photoPreview || undefined,
        company,
        division: finalDivision,
        role,
        pin
      });

      if (result.success) {
        if (onSuccess) {
          onSuccess(cleanName);
        }
        onClose();
      } else {
        setErrorMessage(result.error || 'Failed to create staff profile.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error occurred while saving profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 backdrop-blur-xs p-4 overflow-y-auto">
      <div 
        className="w-full max-w-xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150"
        id="staff-registration-modal"
      >
        {/* Header */}
        <div className="bg-slate-900 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/20 border border-orange-400/30 flex items-center justify-center text-orange-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Create Staff Profile</h2>
              <p className="text-xs text-slate-400">Individual login & personal accountability record</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCameraStream();
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            id="close-registration-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-700 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Section 1: Profile Photo & Name */}
          <div className="flex flex-col sm:flex-row items-center gap-5 pb-4 border-b border-slate-100">
            {/* Photo Avatar Box */}
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className="relative w-24 h-24 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 overflow-hidden flex items-center justify-center shadow-inner group">
                {photoPreview ? (
                  <img 
                    src={photoPreview} 
                    alt="Staff Preview" 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                    <Camera className="w-7 h-7 mb-1" />
                    <span className="text-[10px] font-bold uppercase">No Photo</span>
                  </div>
                )}
                {photoPreview && (
                  <button
                    type="button"
                    onClick={() => setPhotoPreview(null)}
                    className="absolute top-1 right-1 bg-slate-900/80 text-white rounded-full p-1 shadow hover:bg-red-600 transition-colors cursor-pointer"
                    title="Remove Photo"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Photo Actions */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={startLiveCamera}
                  className="px-2.5 py-1 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center gap-1 transition-colors cursor-pointer border border-slate-200"
                  title="Take photo using camera"
                >
                  <Camera className="w-3 h-3 text-orange-600" />
                  <span>Camera</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center gap-1 transition-colors cursor-pointer border border-slate-200"
                  title="Upload picture from files"
                >
                  <Upload className="w-3 h-3 text-blue-600" />
                  <span>Upload</span>
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

            {/* Live Camera Stream (if active) */}
            {isLiveCameraOpen && (
              <div className="flex-1 bg-slate-900 p-3 rounded-2xl flex flex-col items-center gap-2 border border-slate-700">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-40 h-40 object-cover rounded-xl bg-black"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={capturePhotoFromVideo}
                    className="px-4 py-1.5 bg-orange-600 text-white text-xs font-bold rounded-lg hover:bg-orange-500 cursor-pointer shadow flex items-center gap-1"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Snap Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      stopCameraStream();
                      setIsLiveCameraOpen(false);
                    }}
                    className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Name Input */}
            {!isLiveCameraOpen && (
              <div className="flex-1 w-full space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Staff Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Tan / Jessica Lim"
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white"
                  required
                  id="reg-staff-name-input"
                />
                <p className="text-[11px] text-slate-500">
                  This name identifies your checklist sign-offs and accountability ledger.
                </p>
              </div>
            )}
          </div>

          {/* Section 2: Company Selection (luckycat vs JPE KTV) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Company / Venue Unit <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* luckycat option */}
              <button
                type="button"
                onClick={() => setCompany('luckycat')}
                className={`p-3.5 rounded-2xl border-2 flex items-center gap-3 text-left transition-all cursor-pointer ${
                  company === 'luckycat'
                    ? 'border-orange-500 bg-orange-50/60 shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
                id="reg-company-luckycat-btn"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                  company === 'luckycat' ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  LC
                </div>
                <div>
                  <div className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                    <span>luckycat</span>
                    {company === 'luckycat' && <Check className="w-4 h-4 text-orange-600" />}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">Bistro & Lounge Operations</div>
                </div>
              </button>

              {/* JPE KTV option */}
              <button
                type="button"
                onClick={() => setCompany('JPE KTV')}
                className={`p-3.5 rounded-2xl border-2 flex items-center gap-3 text-left transition-all cursor-pointer ${
                  company === 'JPE KTV'
                    ? 'border-indigo-600 bg-indigo-50/60 shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
                id="reg-company-jpektv-btn"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                  company === 'JPE KTV' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  KTV
                </div>
                <div>
                  <div className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                    <span>JPE KTV</span>
                    {company === 'JPE KTV' && <Check className="w-4 h-4 text-indigo-600" />}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">Entertainment & Private Rooms</div>
                </div>
              </button>
            </div>
          </div>

          {/* Section 3: Division & Role */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Division */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Division / Department <span className="text-red-500">*</span>
              </label>
              <select
                value={division}
                onChange={(e) => setDivision(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                id="reg-division-select"
              >
                {COMMON_DIVISIONS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
                <option value="OTHER">Custom Division...</option>
              </select>

              {division === 'OTHER' && (
                <input
                  type="text"
                  value={customDivision}
                  onChange={(e) => setCustomDivision(e.target.value)}
                  placeholder="Enter division name"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl mt-1.5 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              )}
            </div>

            {/* Role */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                App Role <span className="text-red-500">*</span>
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                id="reg-role-select"
              >
                <option value="STAFF">Floor Staff</option>
                <option value="ASSISTANT_MANAGER">Assistant Manager</option>
                <option value="MANAGER">General Manager</option>
              </select>
              <p className="text-[11px] text-slate-500">
                {role === 'STAFF' 
                  ? 'Access daily checklists & personal points.' 
                  : role === 'MANAGER' 
                    ? 'Full point system ledger & staff oversight.' 
                    : 'Inspection follow-up & issues resolution.'}
              </p>
            </div>
          </div>

          {/* Section 4: 4-Digit Security PIN */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
              <Lock className="w-4 h-4 text-orange-600" />
              <span>Create Your 4-Digit Numeric Login PIN</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  4-Digit PIN <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="\d*"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full px-4 py-2.5 text-center text-lg font-mono font-bold tracking-widest bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                  id="reg-pin-input"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Confirm PIN <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="\d*"
                  maxLength={4}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full px-4 py-2.5 text-center text-lg font-mono font-bold tracking-widest bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                  id="reg-pin-confirm-input"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 text-center">
              Enter these 4 numbers every time you tap your profile card on the login screen.
            </p>
          </div>

          {/* Form Submit & Cancel Actions */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                stopCameraStream();
                onClose();
              }}
              className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 text-sm font-black bg-orange-600 hover:bg-orange-500 text-white rounded-xl shadow-md transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              id="submit-register-staff-btn"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving Profile...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Create Profile & Set PIN</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
