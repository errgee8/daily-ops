import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, Camera, CheckCircle2, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { AttendanceRecord } from '../types';
import { getAttendanceRecords } from '../db/indexedDb';
import { fetchAttendanceRecordsFromCloud } from '../services/supabaseDataService';

export const ReportsView: React.FC = () => {
  const { isManager, isAssistantManager } = useAuth();
  const { dailyTasks } = useData();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  useEffect(() => { void (async () => {
    const local = await getAttendanceRecords(); const cloud = await fetchAttendanceRecordsFromCloud();
    setAttendance([...local, ...cloud].filter((x, i, a) => a.findIndex(y => y.id === x.id) === i));
  })(); }, []);
  const tasks = useMemo(() => dailyTasks.filter(t => t.date === date && (t.status === 'DONE' || t.status === 'COMPLETED')), [dailyTasks, date]);
  const records = useMemo(() => attendance.filter(r => r.capturedAt.startsWith(date)), [attendance, date]);
  if (!isManager && !isAssistantManager) return <div className="p-8 text-center font-bold">Reports are for managers.</div>;
  return <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-5">
    <div className="flex items-center justify-between gap-3"><div><h1 className="text-2xl font-black flex gap-2 items-center"><BarChart3 className="text-orange-600" /> REPORT</h1><p className="text-sm text-slate-500">Tasks completed and attendance proof in one place.</p></div><input type="date" value={date} onChange={e => setDate(e.target.value)} className="border rounded-lg px-3 py-2" /></div>
    <section className="bg-white rounded-2xl border overflow-hidden"><h2 className="p-4 font-black flex gap-2 items-center"><CheckCircle2 className="text-emerald-600" /> TASKS DONE ({tasks.length})</h2>{tasks.map(t => <div key={t.id} className="border-t p-3 flex items-center justify-between gap-3 text-sm"><span><b>{t.title}</b><br /><span className="text-slate-500">{t.completedByName || t.assignedToName || 'Team'} · {t.venueName || 'All venues'}</span></span><span className="text-right text-slate-500">{t.completedAt ? new Date(t.completedAt).toLocaleTimeString() : ''}{t.completionPhotoUrl && <a href={t.completionPhotoUrl} target="_blank" rel="noreferrer" className="ml-2 text-orange-700 underline"><Camera className="inline w-4 h-4" /> photo</a>}</span></div>)}{tasks.length === 0 && <p className="border-t p-4 text-sm text-slate-500">No completed tasks for this date.</p>}</section>
    <section className="bg-white rounded-2xl border overflow-hidden"><h2 className="p-4 font-black flex gap-2 items-center"><Clock className="text-orange-600" /> ATTENDANCE ({records.length})</h2>{records.map(r => <div key={r.id} className="border-t p-3 flex items-center justify-between gap-3 text-sm"><span><b>{r.staffName}</b> · {r.venueName} · {r.type.replace('_', ' ')}</span><span className="text-right text-slate-500">{new Date(r.capturedAt).toLocaleTimeString()} · {r.wifiVerified ? 'Wi‑Fi OK' : 'Wi‑Fi failed'} {r.selfieUrl && <a href={r.selfieUrl} target="_blank" rel="noreferrer" className="ml-2 text-orange-700 underline"><Camera className="inline w-4 h-4" /> selfie</a>}</span></div>)}{records.length === 0 && <p className="border-t p-4 text-sm text-slate-500">No attendance records for this date.</p>}</section>
  </div>;
};
