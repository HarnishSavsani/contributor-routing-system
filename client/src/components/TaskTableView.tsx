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
} from 'lucide-react';

interface TaskTableViewProps {
  tasks: Task[];
  onInspectHistory: (task: Task) => void;
  onIntervene: (task: Task) => void;
  onRecover: (task: Task) => void;
  onContributorAccept: (taskId: string) => void;
  onContributorDecline: (taskId: string) => void;
}

export const TaskTableView: React.FC<TaskTableViewProps> = ({
  tasks,
  onInspectHistory,
  onIntervene,
  onRecover,
  onContributorAccept,
  onContributorDecline,
}) => {
  const [nowTime, setNowTime] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="rounded-xl border border-border bg-card text-card-foreground shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              <th className="py-3 px-4">Task</th>
              <th className="py-3 px-4">Expertise</th>
              <th className="py-3 px-4">Status & Routing</th>
              <th className="py-3 px-4">Assignee</th>
              <th className="py-3 px-4">Created</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 text-xs">
            {tasks.map((task) => {
              const badge = getStateBadgeConfig(task.state);

              // Calculate elapsed seconds if routing
              let elapsedSec = 0;
              if (task.state === 'routing' && task.routingStartedAt) {
                const start = new Date(task.routingStartedAt).getTime();
                elapsedSec = Math.max(0, Math.floor((nowTime - start) / 1000));
              }

              const isStuckWarning =
                task.state === 'routing' &&
                (task.isStuckSimulated || elapsedSec > 20);

              return (
                <tr
                  key={task.id}
                  className="hover:bg-muted/30 transition-colors group"
                >
                  {/* Task ID & Title */}
                  <td className="py-3 px-4 max-w-xs">
                    <div className="flex items-center space-x-2 mb-0.5">
                      <span className="font-mono text-[11px] font-semibold text-muted-foreground">
                        {task.id}
                      </span>
                      {task.routingAttempt > 1 && (
                        <span className="text-[10px] px-1 rounded bg-muted text-muted-foreground font-mono">
                          #{task.routingAttempt}
                        </span>
                      )}
                    </div>
                    <div className="font-medium text-foreground text-xs leading-snug line-clamp-1">
                      {task.title}
                    </div>
                  </td>

                  {/* Expertise */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-secondary text-secondary-foreground border border-border">
                      <Tag className="h-3 w-3 text-muted-foreground" />
                      <span>{task.expertiseRequired}</span>
                    </span>
                  </td>

                  {/* Status & Routing Details */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex flex-col space-y-1">
                      <span
                        className={`inline-flex items-center w-fit px-2 py-0.5 rounded-full text-[11px] font-medium border ${badge.bg}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full mr-1.5 ${badge.dot}`}
                        />
                        {badge.label}
                      </span>

                      {task.state === 'routing' && (
                        <div className="flex items-center space-x-1.5 text-[11px] text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin text-amber-500" />
                          <span className="font-mono font-medium">
                            {elapsedSec}s elapsed
                          </span>
                          {isStuckWarning && (
                            <span
                              className="text-amber-500 font-semibold"
                              title="Threshold exceeded (>20s)"
                            >
                              (Stuck?)
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Assignee */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    {task.activeAssignee ? (
                      <div className="flex items-center space-x-2">
                        <img
                          src={task.activeAssignee.avatar}
                          alt={task.activeAssignee.name}
                          className="h-6 w-6 rounded-full object-cover border border-border"
                        />
                        <div>
                          <div className="text-xs font-medium text-foreground">
                            {task.activeAssignee.name}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {task.activeAssignee.title}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs italic">
                        Unassigned
                      </span>
                    )}
                  </td>

                  {/* Age */}
                  <td className="py-3 px-4 whitespace-nowrap text-muted-foreground text-[11px]">
                    <span title={formatDateTime(task.createdAt)}>
                      {formatRelativeTime(task.createdAt)}
                    </span>
                  </td>

                  {/* Inline Actions */}
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end space-x-1.5">
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

                      {/* When Assigned: Accept / Decline */}
                      {task.state === 'assigned' && (
                        <>
                          <button
                            onClick={() => onContributorAccept(task.id)}
                            title="Simulate contributor accepting assignment"
                            className="h-7 px-2 rounded-md text-xs font-medium border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15 transition cursor-pointer flex items-center space-x-1"
                          >
                            <Check className="h-3 w-3" />
                            <span>Accept</span>
                          </button>
                          <button
                            onClick={() => onContributorDecline(task.id)}
                            title="Simulate contributor declining assignment"
                            className="h-7 px-2 rounded-md text-xs font-medium border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 hover:bg-rose-500/15 transition cursor-pointer flex items-center space-x-1"
                          >
                            <X className="h-3 w-3" />
                            <span>Decline</span>
                          </button>
                        </>
                      )}

                      {/* When Failed / Declined: Recover */}
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

                      {/* Timeline */}
                      <button
                        onClick={() => onInspectHistory(task)}
                        title="View Audit Log & Timeline"
                        className="h-7 px-2.5 rounded-md text-xs font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground text-foreground transition cursor-pointer flex items-center space-x-1"
                      >
                        <History className="h-3 w-3 text-muted-foreground" />
                        <span>Log ({task.history ? task.history.length : 0})</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

