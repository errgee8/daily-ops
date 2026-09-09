import React, { useEffect, useState, useRef } from 'react';
import { Camera, Upload, X, Check, RefreshCw, Image as ImageIcon } from 'lucide-react';

interface PhotoCaptureModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  onPhotoSaved: (dataUrl: string) => void;
  cameraFacing?: 'user' | 'environment';
  /** Attendance proof must originate from the active camera, not the gallery. */
  requireLiveCapture?: boolean;
}

export const PhotoCaptureModal: React.FC<PhotoCaptureModalProps> = ({
  isOpen,
  title,
  onClose,
  onPhotoSaved,
  cameraFacing = 'environment',
  requireLiveCapture = false
}) => {
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!isOpen || !requireLiveCapture) return;
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: { ideal: cameraFacing } }, audio: false })
      .then(stream => { streamRef.current = stream; if (videoRef.current) videoRef.current.srcObject = stream; })
      .catch(() => undefined);
    return () => { streamRef.current?.getTracks().forEach(track => track.stop()); streamRef.current = null; };
  }, [isOpen, requireLiveCapture, cameraFacing]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Compress image to max 1280px on longest edge to optimize local tablet storage
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1200;

        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
          setPhotoPreview(compressedDataUrl);
        } else {
          setPhotoPreview(event.target?.result as string);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (photoPreview) {
      onPhotoSaved(photoPreview);
      onClose();
    }
  };

  const takeLivePhoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    setPhotoPreview(canvas.toDataURL('image/jpeg', 0.85));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div 
        className="w-full max-w-lg bg-white border-2 border-slate-300 rounded-2xl shadow-2xl p-6 flex flex-col items-center text-slate-900"
        id="photo-capture-modal"
      >
        <div className="w-full flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl border border-blue-200">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">{title}</h2>
              <p className="text-xs text-slate-500">{requireLiveCapture ? 'Use the live camera for attendance proof' : 'Attach local photo from tablet camera or gallery'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
            id="close-photo-modal-btn"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Hidden Camera File Input with environment capture */}
        <input
          type="file"
          accept="image/*"
          capture={cameraFacing}
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          id="camera-file-input"
        />

        {/* Preview Area */}
        <div className="w-full my-5 min-h-[260px] bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center overflow-hidden relative">
          {photoPreview ? (
            <div className="w-full h-full relative group flex items-center justify-center bg-slate-900/10">
              <img
                src={photoPreview}
                alt="Captured issue"
                className="max-h-[320px] max-w-full object-contain rounded-xl"
              />
              <button
                type="button"
                onClick={() => setPhotoPreview(null)}
                className="absolute top-3 right-3 p-2 bg-white text-red-600 border border-slate-300 hover:bg-slate-50 rounded-xl flex items-center gap-1.5 text-xs font-bold shadow-md cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" /> Retake
              </button>
            </div>
          ) : requireLiveCapture ? (
            <div className="w-full h-full flex flex-col items-center gap-3 p-3">
              <video ref={videoRef} autoPlay playsInline muted className="max-h-[300px] rounded-xl bg-slate-900" />
              <button type="button" onClick={takeLivePhoto} className="py-3 px-5 bg-blue-600 text-white font-black rounded-xl flex items-center gap-2"><Camera className="w-5 h-5" /> Take live selfie</button>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center p-6 gap-3">
              <div className="p-4 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                <Camera className="w-10 h-10 text-slate-600" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-800">Tap below to capture tablet photo</p>
                <p className="text-xs text-slate-500 mt-0.5">Stored locally in device database (0 internet required)</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-2 w-full max-w-xs">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-black rounded-xl flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                  id="launch-camera-btn"
                >
                  <Camera className="w-5 h-5" /> Take Photo
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="w-full flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl border border-slate-300 text-center cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={!photoPreview}
            className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-xl flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            id="save-photo-btn"
          >
            <Check className="w-5 h-5" /> Attach Photo
          </button>
        </div>
      </div>
    </div>
  );
};
