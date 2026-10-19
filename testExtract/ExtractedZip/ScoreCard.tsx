import React, { useState } from 'react';
import { RestrictionReport } from '../../shared/types';
import { ShieldAlert, ShieldCheck, ChevronDown, ChevronUp, Lock, AlertTriangle, CheckCircle } from 'lucide-react';

interface Props {
  report: RestrictionReport | null;
}

export const ScoreCard: React.FC<Props> = ({ report }) => {
  const [expanded, setExpanded] = useState(false);

  if (!report) {
    return (
      <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl animate-pulse flex items-center justify-between">
        <div className="h-10 w-24 bg-slate-800 rounded-lg"></div>
        <div className="h-4 w-32 bg-slate-800 rounded"></div>
      </div>
    );
  }

  const { score, label, labelBadgeClass, checks } = report;
  const detectedChecks = checks.filter((c) => c.detected);

  return (
    <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3 shadow-lg backdrop-blur-md">
      <div className="flex items-center justify-between">
        {/* Left: Score Badge */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 font-extrabold text-xl tracking-tight shadow-inner">
            <span style={{ color: report.labelColor }}>{score}</span>
            <span className="absolute -top-1 -right-1 text-[9px] text-slate-500">/100</span>
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${labelBadgeClass}`}>
                {label} Restriction
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {detectedChecks.length === 0
                ? 'No active restrictions detected'
                : `${detectedChecks.length} protection constraint(s) active`}
            </p>
          </div>
        </div>

        {/* Right: Expand Toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-lg transition-all"
        >
          <span>Breakdown</span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Expanded Breakdown List */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2 text-xs">
          <h4 className="font-semibold text-slate-300 flex items-center justify-between">
            <span>Detected Protections & Rubric Points</span>
            <span className="text-[10px] text-slate-400 font-normal">Weighted Rubric</span>
          </h4>
          <div className="max-h-48 overflow-y-auto pr-1 space-y-1.5">
            {checks.map((check) => (
              <div
                key={check.id}
                className={`p-2 rounded-lg border flex items-start justify-between gap-2 ${
                  check.detected
                    ? 'bg-slate-950/80 border-amber-500/30 text-slate-200'
                    : 'bg-slate-950/40 border-slate-800/60 text-slate-500'
                }`}
              >
                <div className="flex items-start gap-2">
                  {check.detected ? (
                    check.category === 'drmIndicators' ? (
                      <Lock className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    )
                  ) : (
                    <CheckCircle className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-medium text-[11px] leading-tight">{check.name}</div>
                    <div className="text-[10px] opacity-75 mt-0.5">{check.description}</div>
                  </div>
                </div>

                <div className="shrink-0 font-mono font-semibold text-[11px]">
                  {check.detected ? `+${check.scoreImpact} pts` : '0 pts'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
