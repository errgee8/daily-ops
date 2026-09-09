import React, { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import { formatDate } from '../utils/crypto';
import { X, Calendar, AlertCircle, CheckCircle, TrendingUp, Filter, History } from 'lucide-react';

interface ItemHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialAreaId?: string;
  initialItemId?: string;
}

export const ItemHistoryModal: React.FC<ItemHistoryModalProps> = ({
  isOpen,
  onClose,
  initialAreaId,
  initialItemId
}) => {
  const { template, inspections, issues } = useData();

  const [selectedAreaId, setSelectedAreaId] = useState<string>(
    initialAreaId || template.areas[0]?.id || ''
  );
  const [selectedItemId, setSelectedItemId] = useState<string>(
    initialItemId || template.areas.find(a => a.id === selectedAreaId)?.items[0]?.id || ''
  );

  const selectedArea = useMemo(() => {
    return template.areas.find(a => a.id === selectedAreaId) || template.areas[0];
  }, [template, selectedAreaId]);

  const selectedItem = useMemo(() => {
    return selectedArea?.items.find(it => it.id === selectedItemId) || selectedArea?.items[0];
  }, [selectedArea, selectedItemId]);

  // Aggregate historical records across all daily inspections for this specific item
  const itemHistory = useMemo(() => {
    if (!selectedItem) return [];

    return inspections.map(insp => {
      const itemResult = insp.itemResults[selectedItem.id];
      const matchingIssues = issues.filter(
        iss => iss.inspectionDate === insp.date && iss.itemId === selectedItem.id
      );

      return {
        date: insp.date,
        formattedDate: formatDate(insp.date),
        overallStatus: itemResult?.overallStatus || (matchingIssues.length > 0 ? 'NOT_READY' : 'READY'),
        criterionResults: itemResult?.criterionResults || [],
        issues: matchingIssues,
        inspectedByName: itemResult?.inspectedByName || insp.startedByName
      };
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [inspections, issues, selectedItem]);

  // Statistics for this item
  const stats = useMemo(() => {
    const totalDays = itemHistory.length;
    if (totalDays === 0) return { totalDays: 0, daysWithIssues: 0, failureRate: 0, topProblems: [] };

    const daysWithIssues = itemHistory.filter(h => h.issues.length > 0 || h.overallStatus === 'NOT_READY').length;
    const failureRate = Math.round((daysWithIssues / totalDays) * 100);

    const problemCounts: Record<string, number> = {};
    itemHistory.forEach(h => {
      h.issues.forEach(iss => {
        iss.specificProblems.forEach(p => {
          const key = `${iss.criterionName}: ${p}`;
          problemCounts[key] = (problemCounts[key] || 0) + 1;
        });
      });
    });

    const topProblems = Object.entries(problemCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);

    return { totalDays, daysWithIssues, failureRate, topProblems };
  }, [itemHistory]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 text-slate-900">
      <div 
        className="w-full max-w-4xl max-h-[90vh] bg-white border-2 border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-900"
        id="item-history-modal"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-100 text-orange-600 rounded-xl border border-orange-200">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">ITEM HISTORICAL RECURRENCE RECORD</h2>
              <p className="text-xs text-slate-500">Track recurring failures & maintenance patterns across dates</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Item Selector Dropdowns */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">Area:</span>
            <select
              value={selectedAreaId}
              onChange={(e) => {
                const newAreaId = e.target.value;
                setSelectedAreaId(newAreaId);
                const area = template.areas.find(a => a.id === newAreaId);
                if (area && area.items.length > 0) {
                  setSelectedItemId(area.items[0].id);
                }
              }}
              className="bg-white text-slate-900 font-bold border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-500 min-h-[40px] cursor-pointer"
            >
              {template.areas.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">Item:</span>
            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              className="bg-white text-slate-900 font-bold border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-500 min-h-[40px] cursor-pointer"
            >
              {selectedArea?.items.map(it => (
                <option key={it.id} value={it.id}>{it.name}</option>
              ))}
            </select>
          </div>

          {/* Quick Item Summary Chip */}
          <div className="ml-auto flex items-center gap-3">
            <div className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs flex items-center gap-2 shadow-2xs">
              <span className="text-slate-500 font-bold font-mono">Total Inspections:</span>
              <span className="font-bold text-slate-900 font-mono">{stats.totalDays}</span>
            </div>
            <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold font-mono flex items-center gap-1.5 shadow-2xs ${
              stats.failureRate > 25 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'
            }`}>
              <TrendingUp className="w-4 h-4" />
              <span>{stats.failureRate}% Failure Rate</span>
            </div>
          </div>
        </div>

        {/* Top Recurring Problems Pills */}
        {stats.topProblems.length > 0 && (
          <div className="px-4 py-2.5 bg-slate-50/50 border-b border-slate-200 flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">Frequent Issues:</span>
            {stats.topProblems.map(([prob, count]) => (
              <span key={prob} className="px-2.5 py-1 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-mono font-bold">
                {prob} <strong className="text-slate-900 ml-1">({count}x)</strong>
              </span>
            ))}
          </div>
        )}

        {/* History Timeline */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {itemHistory.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              No historical inspection records found for this item yet.
            </div>
          ) : (
            itemHistory.map((rec) => {
              const hasIssues = rec.issues.length > 0 || rec.overallStatus === 'NOT_READY';
              return (
                <div
                  key={rec.date}
                  className={`p-4 rounded-xl border transition-all ${
                    hasIssues
                      ? 'bg-red-50/30 border-red-200'
                      : 'bg-white border-slate-200 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-black text-slate-900 font-mono flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        {rec.formattedDate || rec.date}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${
                        hasIssues ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-green-100 text-green-800 border border-green-200'
                      }`}>
                        {hasIssues ? '🔴 NOT READY' : '🟢 READY'}
                      </span>
                    </div>

                    <span className="text-xs text-slate-500 font-mono">
                      Inspected by: <strong className="text-slate-800">{rec.inspectedByName || 'Manager'}</strong>
                    </span>
                  </div>

                  {/* Issues Detail */}
                  {hasIssues ? (
                    <div className="space-y-1.5 mt-2 pt-2 border-t border-red-100">
                      {rec.issues.map((iss) => (
                        <div key={iss.id} className="text-xs flex items-start gap-2 text-slate-800">
                          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-slate-900">{iss.criterionName}:</span>{' '}
                            <span className="text-red-700 font-mono font-bold">{iss.specificProblems.join(', ')}</span>
                            {iss.customNote && <span className="text-slate-600 ml-1">({iss.customNote})</span>}
                            <span className="ml-2 text-[11px] px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 font-mono">
                              Dept: {iss.departmentName}
                            </span>
                            <span className={`ml-1.5 text-[11px] px-2 py-0.5 rounded font-bold font-mono ${
                              iss.currentStatus === 'VERIFIED' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {iss.currentStatus}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-green-700 flex items-center gap-1.5 font-bold font-mono">
                      <CheckCircle className="w-4 h-4" /> All criteria passed inspection with 0 defects.
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-white hover:bg-slate-100 text-slate-800 font-black rounded-xl border border-slate-300 shadow-2xs min-h-[40px] cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
