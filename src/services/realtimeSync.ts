import { supabase } from './supabase';
import { flushCloudOutbox } from './cloudSync';

const TABLES = ['daily_tasks', 'inspections', 'issues', 'shift_notes', 'attendance_records'];

/**
 * Keeps a connected device current without polling. The callback must reload
 * only records the signed-in profile is allowed to read (RLS enforces that).
 */
export function startRealtimeSync(onRemoteChange: () => Promise<void>): () => void {
  if (!supabase) return () => undefined;

  let channel: ReturnType<typeof supabase.channel> | undefined;
  const start = async () => {
    if (channel) await supabase.removeChannel(channel);
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    await flushCloudOutbox();
    channel = supabase.channel('daily-ops-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_tasks' }, () => void onRemoteChange())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inspections' }, () => void onRemoteChange())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'issues' }, () => void onRemoteChange())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shift_notes' }, () => void onRemoteChange())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_records' }, () => void onRemoteChange())
      .subscribe();
  };

  const { data: listener } = supabase.auth.onAuthStateChange(() => { void start(); });
  void start();
  return () => {
    listener.subscription.unsubscribe();
    if (channel) void supabase.removeChannel(channel);
  };
}
