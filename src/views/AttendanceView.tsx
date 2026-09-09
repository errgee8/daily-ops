import React, { useEffect, useMemo, useState } from 'react';
import { Camera, CheckCircle2, Clock, LogIn, LogOut, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { AttendanceRecord, InspectionItemResult } from '../types';
import { getAttendanceRecords, saveAttendanceRecord } from '../db/indexedDb';
import { fetchAttendanceRecordsFromCloud, saveAttendanceRecordToCloud } from '../services/supabaseDataService';
import { verifyVenueWifi } from '../services/venueWifi';
import { PhotoCaptureModal } from '../components/PhotoCaptureModal';
import { uploadPhotoDataUrl } from '../services/supabaseStorage';

const deviceId = () => {
  const key = 'daily_ops_attendance_device_id';
  let value = localStorage.getItem(key);
  if (!value) { value = `device-${crypto.randomUUID()}`; localStorage.setItem(key, value); }
  return value;
};

export const AttendanceView: React.FC = () => {
  const { currentUser, isManager } = useAuth();
  const { todayInspection, todayTasks, venues, settings } = useData();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [type, setType] = useState<'CHECK_IN' | 'CHECK_OUT' | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const local = await getAttendanceRecords();
      const cloud = await fetchAttendanceRecordsFromCloud();
      const merged = [...local, ...cloud]
        .filter((item, index, list) => list.findIndex(candidate => candidate.id === item.id) === index);
      setRecords(merged);
    };
    void load();
    return undefined;
  }, []);
  const venue = useMemo(() => {
    const assigned = currentUser?.assignedVenueIds?.[0];
    return venues.find(item => item.id === assigned) || venues.find(item => item.id === todayInspection?.venueId) || venues[0];
  }, [currentUser, venues, todayInspection]);

  const checklistError = () => {
    if (!todayInspection) return 'Start and complete your assigned checklist before attendance.';
    const criteria = (Object.values(todayInspection.itemResults) as InspectionItemResult[]).flatMap(item => item.criterionResults || []);
    if (criteria.length === 0 || criteria.some(item => item.status === 'NA')) return 'Every checklist item must be completed before attendance.';
    if (criteria.some(item => !(item.photos?.length || item.photoUrl))) return 'Every checklist item requires a proof photo before attendance.';
    return null;
  };

  const capture = async (selfieUrl: string) => {
    if (!currentUser || !venue || !type) return;
    const incomplete = checklistError();
    if (type === 'CHECK_IN' && incomplete) { setMessage(incomplete); return; }
    if (type === 'CHECK_OUT' && todayTasks.some(task => task.status === 'PENDING' || task.status === 'IN_PROGRESS')) {
      setMessage('Complete or formally close all of today’s tasks before checkout.'); return;
    }
    const wifi = await verifyVenueWifi(settings.attendanceWifiByVenue?.[venue.id] || []);
    if (!wifi.verified) { setMessage(wifi.reason || 'Approved venue Wi-Fi is required.'); return; }
    const id = `attendance-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const uploadedSelfie = await uploadPhotoDataUrl(`venues/${venue.id}/attendance/${new Date().toISOString().slice(0, 10)}/${id}.jpg`, selfieUrl);
    if (!uploadedSelfie) { setMessage('Selfie could not be safely uploaded. Connect to the internet and try again.'); return; }
    const record: AttendanceRecord = {
      id,
      type, staffUserId: currentUser.id, staffName: currentUser.name, staffRole: currentUser.role,
      venueId: venue.id, venueName: venue.name, areaIds: currentUser.assignedAreaIds || [],
      checklistInspectionId: todayInspection?.id || 'CHECKOUT', checklistCompletedAt: todayInspection?.completedAt || new Date().toISOString(),
      capturedAt: new Date().toISOString(), wifiSsid: wifi.ssid, wifiVerified: true,
      deviceId: deviceId(), selfieUrl: uploadedSelfie, syncStatus: 'PENDING_CLOUD'
    };
    await saveAttendanceRecord(record);
    const cloudRecord = await saveAttendanceRecordToCloud(record);
    if (cloudRecord) await saveAttendanceRecord(cloudRecord);
    setRecords(previous => [record, ...previous]);
    setType(null);
    setMessage(`${type === 'CHECK_IN' ? 'Check-in' : 'Checkout'} saved. It will be cloud-verified when connected.`);
  };

  const today = new Date().toISOString().slice(0, 10);
  const own = records.filter(item => item.staffUserId === currentUser?.id && item.capturedAt.startsWith(today));
  const checkedIn = own.some(item => item.type === 'CHECK_IN');
  const checkedOut = own.some(item => item.type === 'CHECK_OUT');

  return <div className="max-w-4xl mx-auto p-6 space-y-5">
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-3"><Clock className="text-orange-600" /><div><h1 className="text-2xl font-black">Attendance verification</h1><p className="text-sm text-slate-500">Checklist, approved Wi-Fi, live selfie, and timestamp are required.</p></div></div>
    </div>
    {message && <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-900">{message}</div>}
    {!isManager && <div className="grid sm:grid-cols-2 gap-4">
      <button disabled={checkedIn} onClick={() => setType('CHECK_IN')} className="disabled:opacity-40 rounded-2xl bg-emerald-600 text-white p-6 font-black flex items-center justify-center gap-2"><LogIn /> {checkedIn ? 'CHECKED IN' : 'CHECK IN'}</button>
      <button disabled={!checkedIn || checkedOut} onClick={() => setType('CHECK_OUT')} className="disabled:opacity-40 rounded-2xl bg-slate-800 text-white p-6 font-black flex items-center justify-center gap-2"><LogOut /> {checkedOut ? 'CHECKED OUT' : 'CHECK OUT'}</button>
    </div>}
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <div className="p-4 font-black">{isManager ? 'Today’s attendance' : 'My attendance today'}</div>
      {(isManager ? records.filter(item => item.capturedAt.startsWith(today)) : own).map(item => <div key={item.id} className="border-t p-4 flex items-center justify-between text-sm"><span><b>{item.staffName}</b> · {item.venueName} · {item.type.replace('_', ' ')}</span><span className="text-slate-500">{new Date(item.capturedAt).toLocaleTimeString()} · {item.wifiVerified ? 'Wi‑Fi verified' : 'Wi‑Fi failed'}</span></div>)}
      {records.length === 0 && <div className="border-t p-4 text-sm text-slate-500">No attendance records yet.</div>}
    </div>
    <PhotoCaptureModal isOpen={type !== null} title={type === 'CHECK_IN' ? 'Live check-in selfie' : 'Live checkout selfie'} cameraFacing="user" requireLiveCapture onClose={() => setType(null)} onPhotoSaved={capture} />
  </div>;
};
