'use client';

import React, { useState } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { AssessmentSummary, DomainScore } from '@/lib/wizard/security-scoring';

interface GapAnalysisCardProps {
  summary: AssessmentSummary;
  onNavigateToAssessment: () => void;
}

function scoreColorClass(score: number) {
  if (score >= 75) return 'text-emerald-600';
  if (score >= 40) return 'text-amber-500';
  return 'text-red-500';
}

function scoreBarClass(score: number) {
  if (score >= 75) return 'bg-emerald-500';
  if (score >= 40) return 'bg-amber-400';
  return 'bg-red-500';
}

function scoreLabel(score: number) {
  if (score >= 75) return 'Ready';
  if (score >= 40) return 'Needs Work';
  return 'Not Ready';
}

function ReadinessRing({ score }: { score: number }) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const strokeColor = score >= 75 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative flex items-center justify-center">
      <svg width="100" height="100" viewBox="0 0 100 100" className="-rotate-90">
        <circle cx="50" cy="50" r={radius} stroke="currentColor" strokeWidth="9" fill="none" className="text-secondary" />
        <circle
          cx="50" cy="50" r={radius}
          stroke={strokeColor} strokeWidth="9" fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="absolute text-center">
        <p className={cn('text-2xl font-bold tabular-nums leading-none', scoreColorClass(score))}>{score}</p>
        <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">/ 100</p>
      </div>
    </div>
  );
}

function DomainCard({ domain, onNavigate }: { domain: DomainScore; onNavigate: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const hasGaps = domain.gaps.length > 0;

  return (
    <div className="rounded-2xl border border-border bg-white p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold text-foreground">{domain.label}</p>
          <div className="flex flex-wrap gap-1">
            {domain.tscCriteria.map((code) => (
              <Badge key={code} variant="secondary" className="px-1.5 py-0 text-[10px]">{code}</Badge>
            ))}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className={cn('text-xl font-bold tabular-nums leading-none', scoreColorClass(domain.score))}>{domain.score}%</p>
          <p className={cn('mt-0.5 text-[10px] font-semibold uppercase tracking-wide', scoreColorClass(domain.score))}>{scoreLabel(domain.score)}</p>
        </div>
      </div>

      <div className="space-y-1">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div className={cn('h-full rounded-full transition-all duration-500', scoreBarClass(domain.score))} style={{ width: `${domain.score}%` }} />
        </div>
        <p className="text-xs text-muted-foreground">{domain.answered} of {domain.total} controls met</p>
      </div>

      {hasGaps ? (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex w-full items-center justify-between text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="h-3 w-3 text-amber-500" />
              {domain.gaps.length} gap{domain.gaps.length !== 1 ? 's' : ''} — click to expand
            </span>
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {expanded && (
            <div className="space-y-2">
              {domain.gaps.map((gap, i) => (
                <div key={i} className="rounded-xl bg-secondary/60 p-3 space-y-1">
                  <p className="text-xs font-medium text-red-600">{gap}</p>
                  <p className="text-xs text-muted-foreground">{domain.recommendations[i]}</p>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className="w-full text-xs" onClick={onNavigate}>
                Fix in Security Assessment
                <ArrowRight className="ml-1.5 h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-xs text-emerald-600">
          <CheckCircle2 className="h-3.5 w-3.5" />
          All controls met
        </div>
      )}
    </div>
  );
}

export function GapAnalysisCard({ summary, onNavigateToAssessment }: GapAnalysisCardProps) {
  const topGaps = summary.domains
    .flatMap((d) => d.gaps.map((g, i) => ({ domain: d.label, gap: g, rec: d.recommendations[i], score: d.score })))
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Security Readiness Gap Analysis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall score */}
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-secondary/40 p-5 sm:flex-row">
          <ReadinessRing score={summary.overallScore} />
          <div className="text-center sm:text-left">
            <p className={cn('text-xl font-bold', scoreColorClass(summary.overallScore))}>
              {scoreLabel(summary.overallScore)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {summary.overallAnswered} of {summary.overallTotal} security controls met across {summary.totalDomains} assessment domains
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {summary.completedDomains} of {summary.totalDomains} domains started
            </p>
          </div>
        </div>

        {/* Top priority actions */}
        {topGaps.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Top priority actions</p>
            <div className="space-y-2">
              {topGaps.map((item, i) => (
                <div key={i} className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-400 text-[10px] font-bold text-white">{i + 1}</span>
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-xs font-medium text-foreground">{item.gap}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{item.rec}</p>
                    <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">{item.domain}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Per-domain grid */}
        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">Domain breakdown</p>
          <div className="grid gap-3 md:grid-cols-2">
            {summary.domains.map((domain) => (
              <DomainCard key={domain.key} domain={domain} onNavigate={onNavigateToAssessment} />
            ))}
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground/70">
          Scores reflect security assessment responses only. Governance, infrastructure, and operational controls are captured in earlier steps and validated at generation time.
        </p>
      </CardContent>
    </Card>
  );
}
