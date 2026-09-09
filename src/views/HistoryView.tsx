import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { formatDate, formatDateTime } from '../utils/crypto';
import { 
  History, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp, 
  TrendingUp, 
  Building2, 
  Layers, 
  FileSpreadsheet, 
  Printer,
  Sparkles,
  Download
} from 'lucide-react';
import { ItemHistoryModal } from '../components/ItemHistoryModal';

export const HistoryView: React.FC = () => {
  const { inspections, issues, template, todayDate } = useData();

  const [selectedInspectionDate, setSelectedInspectionDate] = useState<string>(
    inspections[0]?.date || todayDate
  );
  const [historyTab, setHistoryTab] = useState<'DAILY_LOGS' | 'RECURRING_PROBLEMS'>('DAILY_LOGS');

  // Item history drilldown modal
  const [drilldownTarget, setDrilldownTarget] = useState<{ areaId: string; itemId: string } | null>(null);

  // Selected Daily Inspection Detail
  const selectedInspection = useMemo(() => {
    return inspections.find(i => i.date === selectedInspectionDate);
  }, [inspections, selectedInspectionDate]);

  const selectedDayIssues = useMemo(() => {
    return issues.filter(i => i.inspectionDate === selectedInspectionDate);
  }, [issues, selectedInspectionDate]);

  // Analytics on Recurring Problems (Section 14)
  const recurringStats = useMemo(() => {
    const itemIssueMap: Record<string, {
      areaName: string;
      itemName: string;
      areaId: string;
      itemId: string;
      totalFailures: number;
      problems: Record<string, number>;
      recentDates: string[];
    }> = {};

    issues.forEach(iss => {
      const key = `${iss.areaId}_${iss.itemId}`;
      if (!itemIssueMap[key]) {
        itemIssueMap[key] = {
          areaName: iss.areaName,
          itemName: iss.itemName,
          areaId: iss.areaId,
          itemId: iss.itemId,
          totalFailures: 0,
          problems: {},
          recentDates: []
        };
      }
      itemIssueMap[key].totalFailures += 1;
      if (!itemIssueMap[key].recentDates.includes(iss.inspectionDate)) {
        itemIssueMap[key].recentDates.push(iss.inspectionDate);
      }
      iss.specificProblems.forEach(p => {
        itemIssueMap[key].problems[p] = (itemIssueMap[key].problems[p] || 0) + 1;
      });
    });

    const sortedByFailures = Object.values(itemIssueMap).sort((a, b) => b.totalFailures - a.totalFailures);
    return sortedByFailures;
  }, [issues]);

  // Export Daily Inspection as clean Text / CSV format locally
  const handleExportDailyReport = () => {
    if (!selectedInspection) return;

    let content = `DAILY OPS OPERATIONAL INSPECTION REPORT\n`;
    content += `Date: ${formatDate(selectedInspection.date)}\n`;
    content += `Inspector: ${selectedInspection.completedByName || selectedInspection.startedByName}\n`;
    content += `Completion Time: ${formatDateTime(selectedInspection.completedAt)}\n`;
    content += `Total Inspected: ${selectedInspection.readyItems + selectedInspection.notReadyItems}\n`;
    content += `Ready Items: ${selectedInspection.readyItems}\n`;
    content += `Defects Logged: ${selectedDayIssues.length}\n\n`;
    content += `DEFECT LOG:\n`;
    content += `----------------------------------------\n`;

    selectedDayIssues.forEach((iss, idx) => {
      content += `${idx + 1}. [${iss.areaName}] ${iss.itemName} - ${iss.criterionName}\n`;
      content += `   Defects: ${iss.specificProblems.join(', ')}\n`;
      content += `   Department: ${iss.departmentName}\n`;
      content += `   Status: ${iss.currentStatus}\n`;
      if (iss.customNote) content += `   Notes: ${iss.customNote}\n`;
      if (iss.resolutionInfo) content += `   Resolved By: ${iss.resolutionInfo.resolvedByName} at ${formatDateTime(iss.resolutionInfo.resolvedAt)}\n`;
      if (iss.verificationInfo) content += `   Verified By: ${iss.verificationInfo.verifiedByName} at ${formatDateTime(iss.verificationInfo.verifiedAt)}\n`;
      content += `\n`;
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `DAILY_OPS_REPORT_${selectedInspection.date}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 select-none animate-in fade-in duration-150 text-slate-900">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <History className="w-8 h-8 text-orange-500" />
            OPERATIONAL HISTORY & ANALYTICS
          </h1>
          <p className="text-xs md:text-sm text-slate-600">
            Immutable offline archive of all daily inspections, repair records, and recurring problem analytics
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-2xs">
          <button
            onClick={() => setHistoryTab('DAILY_LOGS')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer min-h-[40px] ${
              historyTab === 'DAILY_LOGS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            DAILY INSPECTION LOGS
          </button>
          <button
            onClick={() => setHistoryTab('RECURRING_PROBLEMS')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer min-h-[40px] ${
              historyTab === 'RECURRING_PROBLEMS' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            RECURRING DEFECT PATTERNS
          </button>
        </div>
      </div>

      {historyTab === 'DAILY_LOGS' ? (
        /* DAILY INSPECTIONS BROWSER */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Date List */}
          <div className="space-y-3">
            <h2 className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider">
              SAVED INSPECTION DATES ({inspections.length})
            </h2>

            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {inspections.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-sm">
                  No previous inspections archived yet.
                </div>
              ) : (
                inspections.map((insp) => {
                  const isSelected = insp.date === selectedInspectionDate;
                  const dayIssues = issues.filter(i => i.inspectionDate === insp.date);
                  const isAllResolved = dayIssues.length === 0 || dayIssues.every(i => i.currentStatus === 'VERIFIED');

                  return (
                    <button
                      key={insp.id}
                      onClick={() => setSelectedInspectionDate(insp.date)}
                      className={`w-full p-4 rounded-2xl border-2 text-left transition-all min-h-[56px] flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-orange-50 border-orange-500 shadow-sm text-slate-900'
                          : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-800'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span className="font-bold text-slate-900 text-sm font-mono">
                            {formatDate(insp.date)}
                          </span>
                          {insp.date === todayDate && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold font-mono">
                              TODAY
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-500">
                          {insp.readyItems} Ready • {dayIssues.length} Defects Found
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`text-[11px] font-bold font-mono px-2 py-0.5 rounded-full ${
                          isAllResolved ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {isAllResolved ? '🟢 100% Resolved' : `🔴 ${dayIssues.filter(i => i.currentStatus !== 'VERIFIED').length} Open`}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right 2 Cols: Selected Day Inspection Snapshot */}
          <div className="lg:col-span-2 space-y-4">
            {selectedInspection ? (
              <div className="bg-white border-2 border-slate-200 rounded-3xl p-5 md:p-6 space-y-5 shadow-sm">
                {/* Snapshot Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
                  <div>
                    <div className="text-xs font-mono text-orange-600 font-bold uppercase tracking-wider">
                      HISTORICAL SNAPSHOT:
                    </div>
                    <h2 className="text-2xl font-black text-slate-900">{formatDate(selectedInspection.date)}</h2>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Inspected by: <strong className="text-slate-900">{selectedInspection.completedByName || selectedInspection.startedByName}</strong>
                      {selectedInspection.completedAt && ` • Completed at ${formatDateTime(selectedInspection.completedAt)}`}
                    </div>
                  </div>

                  <button
                    onClick={handleExportDailyReport}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-300 text-xs font-bold flex items-center gap-2 shadow-2xs min-h-[40px] cursor-pointer"
                    title="Export local text report"
                  >
                    <Download className="w-4 h-4 text-emerald-600" />
                    <span>Export Local Report</span>
                  </button>
                </div>

                {/* Scorecards */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-2xl font-black text-slate-900 font-mono">{selectedInspection.readyItems + selectedInspection.notReadyItems}</div>
                    <div className="text-xs text-slate-500 font-bold">Total Items</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-2xl font-black text-green-600 font-mono">{selectedInspection.readyItems}</div>
                    <div className="text-xs text-green-700 font-bold">Passed Initial Walk</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-2xl font-black text-red-600 font-mono">{selectedDayIssues.length}</div>
                    <div className="text-xs text-red-700 font-bold">Issues Handed Over</div>
                  </div>
                </div>

                {/* Defect Log for that Day */}
                <div className="space-y-3">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    Defects & Resolutions for this Day ({selectedDayIssues.length})
                  </h3>

                  {selectedDayIssues.length === 0 ? (
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center text-green-700 text-xs font-bold font-mono">
                      Zero operational defects were logged on this day.
                    </div>
                  ) : (
                    selectedDayIssues.map((iss) => (
                      <div
                        key={iss.id}
                        className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900">[{iss.areaName}]</span>
                            <span className="font-bold text-slate-900 text-sm">{iss.itemName}</span>
                            <span className="text-slate-500">• {iss.criterionName}</span>
                          </div>
                          <span className={`px-2.5 py-1 rounded-lg font-mono font-bold text-[11px] ${
                            iss.currentStatus === 'VERIFIED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {iss.currentStatus}
                          </span>
                        </div>

                        <div className="text-red-700 font-mono font-bold">
                          Defects: {iss.specificProblems.join(', ')}
                        </div>

                        {iss.customNote && (
                          <div className="text-slate-600 font-medium">Note: {iss.customNote}</div>
                        )}

                        <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center gap-3 text-slate-500 text-[11px] font-mono">
                          <span>Dept: <strong className="text-slate-800">{iss.departmentName}</strong></span>
                          {iss.resolutionInfo && <span>• Resolved by: <strong className="text-slate-800">{iss.resolutionInfo.resolvedByName}</strong></span>}
                          {iss.verificationInfo && <span>• Verified by: <strong className="text-slate-800">{iss.verificationInfo.verifiedByName}</strong></span>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-500 bg-white rounded-3xl border-2 border-slate-200 shadow-sm">
                Select an inspection date from the list to view report.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* RECURRING DEFECT PATTERNS & ITEM DRILLDOWN */
        <div className="space-y-4">
          <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange-500" />
                HIGH-FREQUENCY RECURRING DEFECTS
              </h2>
              <p className="text-xs text-slate-600">
                Identifies chronic room defects, equipment breakdowns, and cleanliness failures across historical shifts
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recurringStats.map((stat) => (
                <div
                  key={`${stat.areaId}_${stat.itemId}`}
                  className="bg-white border-2 border-slate-200 hover:border-slate-300 rounded-2xl p-4 space-y-3 flex flex-col justify-between shadow-sm"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-slate-700 px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                        {stat.areaName}
                      </span>
                      <span className="text-xs font-mono font-black text-red-700 px-2 py-0.5 rounded bg-red-50 border border-red-200">
                        {stat.totalFailures} Defect Events
                      </span>
                    </div>

                    <h3 className="text-lg font-black text-slate-900">{stat.itemName}</h3>

                    <div className="text-xs text-slate-700 font-mono space-y-0.5 pt-1">
                      <div className="text-slate-500 text-[11px] font-bold">Frequent issues:</div>
                      {Object.entries(stat.problems).slice(0, 3).map(([prob, count]) => (
                        <div key={prob} className="flex items-center justify-between text-red-700 font-bold">
                          <span>• {prob}</span>
                          <span className="text-slate-900 font-mono font-black">({count}x)</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setDrilldownTarget({ areaId: stat.areaId, itemId: stat.itemId })}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-colors min-h-[40px] cursor-pointer"
                  >
                    <History className="w-3.5 h-3.5 text-blue-600" />
                    <span>View Date-by-Date Pattern</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Item History Drilldown Modal */}
      {drilldownTarget && (
        <ItemHistoryModal
          isOpen={!!drilldownTarget}
          initialAreaId={drilldownTarget.areaId}
          initialItemId={drilldownTarget.itemId}
          onClose={() => setDrilldownTarget(null)}
        />
      )}
    </div>
  );
};
