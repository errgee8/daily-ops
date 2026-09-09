import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { 
  Shield, 
  UserCheck, 
  Smartphone, 
  UserPlus, 
  CheckCircle2,
  KeyRound,
  Users,
  Briefcase,
  ArrowRight,
  Lock,
  Sparkles
} from 'lucide-react';
import { PinPadModal } from './PinPadModal';
import { StaffRegistrationModal } from './StaffRegistrationModal';

export const LoginScreen: React.FC = () => {
  const { 
    loginModalOpen, 
    targetRoleForLogin, 
    targetUserForLogin,
    openLoginModal, 
    closeLoginModal, 
    attemptLogin 
  } = useAuth();

  const { settings, outstandingIssues, todayInspection, todayDate } = useData();

  // Registration modal state
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const handlePinSubmit = async (pin: string) => {
    if (!targetRoleForLogin && !targetUserForLogin) return { success: false, error: 'No role selected' };
    return await attemptLogin(targetUserForLogin || targetRoleForLogin!, pin);
  };

  const handleRegistrationSuccess = (registeredName: string) => {
    setSuccessToast(`Account created for ${registeredName}! Now click the green STAFF button and enter your 4-digit PIN.`);
    setTimeout(() => {
      setSuccessToast(null);
    }, 7000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 md:p-8 text-slate-900 relative overflow-hidden select-none">
      {/* Background Subtle Operational Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a0a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a0a_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      <div className="w-full max-w-3xl relative z-10 flex flex-col items-center">
        {/* Venue & System Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-mono text-emerald-700 tracking-wider mb-2.5 shadow-2xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            STANDALONE LOCAL & CLOUD-SYNCHRONIZED • PIN SECURED
          </div>
          
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 flex items-center gap-3 font-sans">
            <Shield className="w-10 h-10 text-orange-500 shrink-0" />
            HANDOVER.
          </h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">by Ryan Gerrit</p>
          <p className="text-slate-600 mt-1 text-sm md:text-base font-semibold">
            {settings.venueName || 'Luckycat Bistro & JPE KTV Operations'}
          </p>
          <div className="mt-1.5 text-xs font-mono font-bold text-slate-500">
            DATE: {todayDate} • MULTI-STAFF ACCOUNTABILITY SYSTEM
          </div>
        </div>

        {/* Success Toast Banner */}
        {successToast && (
          <div className="w-full mb-5 p-4 bg-emerald-50 border-2 border-emerald-400 rounded-2xl flex items-center gap-3 text-emerald-900 text-sm font-bold shadow-md animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            <span className="flex-1">{successToast}</span>
          </div>
        )}

        {/* Operational Status Preview Box */}
        <div className="w-full bg-white border-2 border-slate-200 rounded-2xl p-4 md:p-5 mb-6 shadow-sm">
          <div className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-2.5 flex items-center justify-between font-bold">
            <span>Today's Shift Status</span>
            <span className="text-slate-700 font-bold">
              {todayInspection?.isHandedOver 
                ? '✅ Inspection Handed Over' 
                : todayInspection 
                  ? '⚡ Inspection In Progress' 
                  : '⏳ Inspection Not Started'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-2xl font-black text-red-600 font-mono">
                {outstandingIssues.filter(i => i.currentStatus === 'NOT_READY').length}
              </div>
              <div className="text-[11px] font-bold text-slate-500 uppercase mt-0.5 font-mono">Not Ready</div>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-2xl font-black text-amber-600 font-mono">
                {outstandingIssues.filter(i => i.currentStatus === 'IN_PROCESS').length}
              </div>
              <div className="text-[11px] font-bold text-slate-500 uppercase mt-0.5 font-mono">In Process</div>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-2xl font-black text-blue-600 font-mono">
                {outstandingIssues.filter(i => i.currentStatus === 'WAITING_VERIFICATION').length}
              </div>
              <div className="text-[11px] font-bold text-slate-500 uppercase mt-0.5 font-mono">Waiting Verify</div>
            </div>
          </div>
        </div>

        {/* Primary Staff Entry Area (1 Green Button Workflow) */}
        <div className="w-full bg-white border-2 border-slate-200 rounded-3xl p-6 md:p-7 shadow-sm flex flex-col gap-6">
          <div className="text-center sm:text-left">
            <div className="text-xs font-black text-slate-400 tracking-wider uppercase font-mono mb-1">
              FLOOR STAFF ACCESS • 1 BUTTON PIN ENTRY
            </div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              Sign In to Your Staff Profile
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Click the STAFF button below and enter your unique 4-digit PIN. The system will automatically detect your account, company (luckycat or JPE KTV), and your personal accountability point score.
            </p>
          </div>

          {/* THE GREEN BUTTON: Single staff entry point */}
          <button
            type="button"
            onClick={() => openLoginModal('STAFF')}
            className="group w-full p-6 md:p-7 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-2xl shadow-md hover:shadow-lg transition-all active:scale-[0.99] cursor-pointer flex flex-col sm:flex-row items-center justify-between gap-4 border-2 border-emerald-500"
            id="staff-login-btn"
          >
            <div className="flex items-center gap-4 text-center sm:text-left">
              <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 border border-white/30 shadow-inner group-hover:scale-105 transition-transform">
                <Users className="w-9 h-9 text-white" />
              </div>
              <div>
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="text-2xl md:text-3xl font-black tracking-tight font-sans">
                    STAFF
                  </span>
                  <span className="px-2 py-0.5 text-[11px] font-extrabold bg-white text-emerald-800 rounded-md uppercase tracking-wider shadow-2xs">
                    GREEN BUTTON
                  </span>
                </div>
                <p className="text-emerald-100 text-xs md:text-sm font-medium mt-1">
                  Enter your unique PIN &rarr; Opens your personal staff account & score
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-emerald-700/60 px-5 py-3 rounded-xl border border-white/20 text-sm font-black tracking-wider uppercase shrink-0 group-hover:bg-emerald-700 transition-colors">
              <KeyRound className="w-4 h-4 text-emerald-200" />
              <span>Input PIN</span>
              <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* Account Registration Card for New Staff */}
          <div className="p-4 md:p-5 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 text-center sm:text-left">
              <div className="w-11 h-11 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 border border-orange-200">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  New Staff? Create Your Account
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set up your profile, photo, division, company (luckycat / JPE KTV), and 4-digit PIN.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsRegisterModalOpen(true)}
              className="w-full sm:w-auto px-5 py-2.5 bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98] cursor-pointer shrink-0"
              id="open-register-staff-modal-btn"
            >
              <UserPlus className="w-4 h-4" />
              <span>Register Account</span>
            </button>
          </div>

          {/* Separator */}
          <div className="relative my-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-slate-400 font-mono font-bold">
                Management & Supervisory Roles
              </span>
            </div>
          </div>

          {/* Management Role Quick Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* General Manager */}
            <button
              type="button"
              onClick={() => openLoginModal('MANAGER')}
              className="group bg-white border-2 border-slate-200 hover:border-orange-500 hover:bg-orange-50/20 rounded-2xl p-4 text-left transition-all active:scale-[0.98] cursor-pointer flex items-center justify-between shadow-2xs"
              id="manager-login-btn"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-black text-slate-900">General Manager</span>
                    <span className="text-[10px] font-extrabold bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded border border-orange-200">
                      MGR
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">PIN secured</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-orange-600 group-hover:translate-x-1 transition-all shrink-0" />
            </button>

            {/* Assistant Manager */}
            <button
              type="button"
              onClick={() => openLoginModal('ASSISTANT_MANAGER')}
              className="group bg-white border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50/20 rounded-2xl p-4 text-left transition-all active:scale-[0.98] cursor-pointer flex items-center justify-between shadow-2xs"
              id="asst-manager-login-btn"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-black text-slate-900">Assistant Manager</span>
                    <span className="text-[10px] font-extrabold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded border border-blue-200">
                      ASST
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">PIN secured</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all shrink-0" />
            </button>
          </div>
        </div>

        {/* Footer device reassurance */}
        <div className="mt-8 text-center text-xs text-slate-500 flex items-center gap-2 font-mono">
          <Smartphone className="w-4 h-4 text-slate-400" />
          <span>Samsung Galaxy Tab A8 Optimized • Standalone Local Database (Zero Internet Required)</span>
        </div>

        <div className="mt-2 text-center text-xs text-slate-400 font-mono tracking-wide">
          made by : Ryan Gerrit
        </div>
      </div>

      {/* Tactile PIN Entry Modal */}
      {targetRoleForLogin && (
        <PinPadModal
          isOpen={loginModalOpen}
          role={targetRoleForLogin}
          roleTitle={
            targetRoleForLogin === 'MANAGER' 
              ? 'GENERAL MANAGER' 
              : targetRoleForLogin === 'ASSISTANT_MANAGER' 
                ? 'ASSISTANT MANAGER' 
                : 'STAFF'
          }
          userName={targetUserForLogin?.name}
          onClose={closeLoginModal}
          onSubmitPin={handlePinSubmit}
          onRegisterClick={() => setIsRegisterModalOpen(true)}
        />
      )}

      {/* Staff Registration Modal */}
      <StaffRegistrationModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onSuccess={handleRegistrationSuccess}
      />
    </div>
  );
};
