import React, { useEffect, useState } from 'react';
import { Task } from '../types.js';
import {
  getStateBadgeConfig,
  formatRelativeTime,
  formatDateTime,
} from '../utils.js';
import {
  Clock,
  User,
  Zap,
  RotateCw,
  Check,
  X,
  History,
  AlertTriangle,
  Loader2,
  Tag,
  ShieldAlert,
} from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onInspectHistory: (task: Task) => void;
  onIntervene: (task: Task) => void;
  onRecover: (task: Task) => void;
  onContributorAccept: (taskId: string) => void;
  onContributorDecline: (taskId: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onInspectHistory,
  onIntervene,
  onRecover,
  onContributorAccept,
  onContributorDecline,
}) => {
  const badge = getStateBadgeConfig(task.state);
  const [elapsedSec, setElapsedSec] = useState<number>(0);

  // Live timer for tasks in routing
  useEffect(() => {
    if (task.state !== 'routing' || !task.routingStartedAt) {
      setElapsedSec(0);
      return;
    }

    const calcElapsed = () => {
      const start = new Date(task.routingStartedAt!).getTime();
      const now = Date.now();
      return Math.max(0, Math.floor((now - start) / 1000));
    };

    setElapsedSec(calcElapsed());
    const interval = setInterval(() => {
      setElapsedSec(calcElapsed());
    }, 1000);

    return () => clearInterval(interval);
  }, [task.state, task.routingStartedAt]);

  const isStuckWarning =
    task.state === 'routing' && (task.isStuckSimulated || elapsedSec > 20);

  return (
    <div
      className={`rounded-xl border bg-card text-card-foreground p-4 transition-all flex flex-col justify-between shadow-xs hover:shadow-sm ${
        isStuckWarning
          ? 'border-amber-500/40 ring-1 ring-amber-500/20'
          : 'border-border hover:border-border/80'
      }`}
    >
      <div>
        {/* Top Header: ID, Time & Status Badge */}
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="flex items-center space-x-2">
            <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
              {task.id}
            </span>
            <span
              className="text-xs text-muted-foreground flex items-center space-x-1"
              title={`Created: ${formatDateTime(task.createdAt)}`}
            >
              <Clock className="h-3 w-3" />
              <span>{formatRelativeTime(task.createdAt)}</span>
            </span>
          </div>

          {/* State Badge */}
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${badge.bg}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${badge.dot}`} />
            {badge.label}
          </span>
        </div>

        {/* Title & Description */}
        <h3 className="font-semibold text-foreground text-sm leading-snug mb-1 line-clamp-1">
          {task.title}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3.5 leading-relaxed">
          {task.description || 'No description provided.'}
        </p>

        {/* Required Expertise Pill */}
        <div className="flex items-center space-x-2 mb-3.5">
          <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
            Expertise:
          </span>
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-xs font-medium bg-secondary text-secondary-foreground border border-border">
            <Tag className="h-3 w-3 text-muted-foreground" />
            <span>{task.expertiseRequired}</span>
          </span>
          {task.routingAttempt > 1 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
              Attempt #{task.routingAttempt}
            </span>
          )}
        </div>

        {/* Routing In-Progress Banner */}
        {task.state === 'routing' && (
          <div
            className={`rounded-lg p-3 mb-3.5 border text-xs ${
              isStuckWarning
                ? 'bg-amber-500/10 border-amber-500/25 text-amber-900 dark:text-amber-200'
                : 'bg-muted/50 border-border text-foreground'
            }`}
          >
            <div className="flex items-center justify-between font-medium mb-1.5">
              <span className="flex items-center space-x-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />
                <span>Matching Eligible Contributors</span>
              </span>
              <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-background/80 border border-border font-semibold">
                {elapsedSec}s elapsed
              </span>
            </div>

            {isStuckWarning && (
              <div className="mt-2 text-[11px] leading-tight text-amber-800 dark:text-amber-300 flex items-start space-x-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Threshold Exceeded (&gt;20s):</strong> Request remains unresolved. In this operating environment, unresolved requests do not throw errors; operator intervention is recommended.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Active Assignee Banner */}
        {task.activeAssignee && (
          <div className="rounded-lg p-2.5 bg-muted/40 border border-border mb-3.5 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <img
                src={task.activeAssignee.avatar}
                alt={task.activeAssignee.name}
                className="h-7 w-7 rounded-full object-cover border border-border"
              />
              <div>
                <div className="text-xs font-semibold text-foreground flex items-center space-x-1.5">
                  <span>{task.activeAssignee.name}</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">
                    (Assignee)
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                  {task.activeAssignee.title}
                </div>
              </div>
            </div>
            {task.assignedAt && (
              <span className="text-[10px] text-muted-foreground font-mono">
                {formatRelativeTime(task.assignedAt)}
              </span>
            )}
          </div>
        )}

        {/* Declined / Failed Banner */}
        {(task.state === 'declined' || task.state === 'failed') && (
          <div className="rounded-lg p-2.5 bg-rose-500/10 border border-rose-500/25 text-rose-900 dark:text-rose-200 text-xs mb-3.5">
            <div className="flex items-center space-x-1.5 font-semibold text-rose-700 dark:text-rose-300 mb-0.5">
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>
                {task.state === 'declined'
                  ? 'Assignment Declined by Contributor'
                  : 'No Matching Contributor Found'}
              </span>
            </div>
            <p className="text-[11px] text-rose-700/80 dark:text-rose-300/80">
              {task.state === 'declined'
                ? 'Task was declined. Ready for operator recovery to re-route or manually assign.'
                : `No contributors registered with '${task.expertiseRequired}'. Operator recovery required.`}
            </p>
          </div>
        )}

        {/* Accepted Banner */}
        {task.state === 'accepted' && (
          <div className="rounded-lg p-2 bg-emerald-500/10 border border-emerald-500/25 text-emerald-800 dark:text-emerald-300 text-xs mb-3.5 flex items-center space-x-1.5">
            <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <span className="text-[11px] font-medium">
              Assignment accepted. Routing finished.
            </span>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-border flex flex-wrap items-center justify-between gap-2">
        {/* Left side actions based on state */}
        <div className="flex items-center space-x-1.5">
          {/* While Routing: Intervene */}
          {task.state === 'routing' && (
            <button
              onClick={() => onIntervene(task)}
              className="flex items-center space-x-1 h-7 px-2.5 rounded-md text-xs font-medium border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/15 transition cursor-pointer"
            >
              <Zap className="h-3 w-3 text-amber-500" />
              <span>Intervene</span>
            </button>
          )}

          {/* When Assigned: Contributor Accept / Decline Simulation */}
          {task.state === 'assigned' && (
            <div className="flex items-center space-x-1">
              <button
                onClick={() => onContributorAccept(task.id)}
                title="Simulate contributor accepting assignment"
                className="flex items-center space-x-1 h-7 px-2.5 rounded-md text-xs font-medium border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15 transition cursor-pointer"
              >
                <Check className="h-3 w-3 text-emerald-500" />
                <span>Accept</span>
              </button>
              <button
                onClick={() => onContributorDecline(task.id)}
                title="Simulate contributor declining assignment"
                className="flex items-center space-x-1 h-7 px-2.5 rounded-md text-xs font-medium border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 hover:bg-rose-500/15 transition cursor-pointer"
              >
                <X className="h-3 w-3 text-rose-500" />
                <span>Decline</span>
              </button>
              <button
                onClick={() => onIntervene(task)}
                title="Operator Reassign"
                className="h-7 w-7 flex items-center justify-center rounded-md border border-input text-muted-foreground hover:text-foreground hover:bg-accent transition cursor-pointer"
              >
                <User className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* When Failed / Declined / Cancelled: Recover */}
          {(task.state === 'failed' ||
            task.state === 'declined' ||
            task.state === 'cancelled') && (
            <button
              onClick={() => onRecover(task)}
              className="flex items-center space-x-1 h-7 px-2.5 rounded-md text-xs font-medium border border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300 hover:bg-sky-500/15 transition cursor-pointer"
            >
              <RotateCw className="h-3 w-3 text-sky-500" />
              <span>Recover</span>
            </button>
          )}
        </div>

        {/* View Timeline / Audit Log */}
        <button
          onClick={() => onInspectHistory(task)}
          className="flex items-center space-x-1 h-7 px-2.5 rounded-md text-xs font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground text-foreground transition cursor-pointer ml-auto"
        >
          <History className="h-3 w-3 text-muted-foreground" />
          <span>Timeline ({task.history ? task.history.length : 0})</span>
        </button>
      </div>
    </div>
  );
};
