import React, { useState } from 'react';
import { UserRole } from '../types';
import { Lock, Delete, ArrowRight, X, ShieldAlert, ShieldCheck } from 'lucide-react';
import { soundSynth } from '../utils/audio';

interface PinPadModalProps {
  isOpen: boolean;
  role: UserRole;
  roleTitle: string;
  userName?: string;
  onClose: () => void;
  onSubmitPin: (pin: string) => Promise<{ success: boolean; error?: string }>;
  onRegisterClick?: () => void;
}

export const PinPadModal: React.FC<PinPadModalProps> = ({
  isOpen,
  role,
  roleTitle,
  userName,
  onClose,
  onSubmitPin,
  onRegisterClick
}) => {
  const [pin, setPin] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const verifyAndSubmit = async (pinToTest: string) => {
    if (!pinToTest) return;
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const res = await onSubmitPin(pinToTest);
      if (!res.success) {
        setErrorMessage(res.error || 'Incorrect PIN. Try again.');
        setPin('');
      }
    } catch {
      setErrorMessage('Authentication error');
      setPin('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDigit = (digit: string) => {
    if (isSubmitting) return;
    soundSynth.playTap();
    if (pin.length < 8) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setErrorMessage('');

      // Auto-authenticate when reaching 4 digits
      if (nextPin.length === 4) {
        setTimeout(() => {
          verifyAndSubmit(nextPin);
        }, 60);
      }
    }
  };

  const handleBackspace = () => {
    soundSynth.playTap();
    setPin(prev => prev.slice(0, -1));
    setErrorMessage('');
  };

  const handleClear = () => {
    soundSynth.playTap();
    setPin('');
    setErrorMessage('');
  };

  const handleAuthenticate = async () => {
    if (!pin) {
      setErrorMessage('Please enter your PIN.');
      return;
    }
    await verifyAndSubmit(pin);
  };

  const isManager = role === 'MANAGER';
  const isStaff = role === 'STAFF';

  const themeIconBox = isManager 
    ? 'bg-orange-100 text-orange-600 border-orange-200' 
    : isStaff 
      ? 'bg-emerald-100 text-emerald-600 border-emerald-200' 
      : 'bg-blue-100 text-blue-600 border-blue-200';

  const themeDot = isManager 
    ? 'bg-orange-500 shadow-sm' 
    : isStaff 
      ? 'bg-emerald-600 shadow-sm' 
      : 'bg-blue-600 shadow-sm';

  const themeSubmitBtn = isManager 
    ? 'bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white' 
    : isStaff 
      ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white' 
      : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div 
        className="w-full max-w-md bg-white border-2 border-slate-200 rounded-2xl shadow-2xl p-6 flex flex-col items-center animate-in fade-in zoom-in-95 duration-150 text-slate-900"
        id="pin-pad-modal"
      >
        {/* Header */}
        <div className="w-full flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${themeIconBox}`}>
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                {userName ? userName : `${roleTitle} LOGIN`}
              </h2>
              <p className="text-xs text-slate-500">
                {userName ? `${roleTitle} • Enter 4 to 8 digit PIN` : 'Enter secure 4 to 8 digit local PIN'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
            id="close-pin-modal-btn"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* PIN Display Dots */}
        <div className="w-full my-5 py-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col items-center justify-center">
          <div className="flex items-center gap-3 h-8">
            {pin.length === 0 ? (
              <span className="text-xs text-slate-500 font-mono tracking-wider font-bold">TAP NUMBERS ON KEYPAD</span>
            ) : (
              Array.from({ length: Math.max(4, pin.length) }).map((_, idx) => (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full transition-all ${
                    idx < pin.length
                      ? `${themeDot} scale-110`
                      : 'border-2 border-slate-300 bg-white'
                  }`}
                />
              ))
            )}
          </div>

          {errorMessage && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600 font-bold font-mono">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Large Tactile Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              type="button"
              onClick={() => handleDigit(num)}
              className="h-16 text-2xl font-black bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-900 rounded-xl border border-slate-200 shadow-2xs transition-all active:scale-95 flex items-center justify-center font-mono select-none cursor-pointer"
              id={`pin-btn-${num}`}
            >
              {num}
            </button>
          ))}

          <button
            type="button"
            onClick={handleClear}
            className="h-16 text-xs font-bold tracking-wider text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-xl border border-slate-200 transition-all flex items-center justify-center uppercase select-none cursor-pointer"
            id="pin-btn-clear"
          >
            Clear
          </button>

          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-16 text-2xl font-black bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-900 rounded-xl border border-slate-200 shadow-2xs transition-all active:scale-95 flex items-center justify-center font-mono select-none cursor-pointer"
            id="pin-btn-0"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleBackspace}
            className="h-16 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-xl border border-slate-200 transition-all flex items-center justify-center select-none cursor-pointer"
            id="pin-btn-backspace"
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>

        {/* Submit Button */}
        <button
          type="button"
          onClick={handleAuthenticate}
          disabled={isSubmitting || pin.length === 0}
          className={`w-full mt-5 h-14 rounded-xl font-black text-sm md:text-base tracking-wide flex items-center justify-center gap-2 shadow transition-all active:scale-[0.98] cursor-pointer ${themeSubmitBtn} disabled:opacity-40 disabled:cursor-not-allowed`}
          id="pin-submit-btn"
        >
          {isSubmitting ? (
            <span>VERIFYING...</span>
          ) : (
            <>
              <ShieldCheck className="w-5 h-5" />
              <span>AUTHENTICATE & ENTER</span>
              <ArrowRight className="w-5 h-5 ml-1" />
            </>
          )}
        </button>

        {isStaff && onRegisterClick && (
          <div className="mt-4 pt-3 border-t border-slate-100 w-full text-center">
            <button
              type="button"
              onClick={() => {
                onClose();
                onRegisterClick();
              }}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer inline-flex items-center gap-1.5"
            >
              <span>Don't have a staff account yet?</span>
              <span className="font-extrabold text-emerald-600">Register Profile &rarr;</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
