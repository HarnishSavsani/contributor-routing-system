import React from 'react';
import { Task } from '../types.js';
import {
  getStateBadgeConfig,
  getActorConfig,
  formatDateTime,
  formatRelativeTime,
} from '../utils.js';
import {
  X,
  Bot,
  UserCheck,
  User,
  Cpu,
  ArrowRight,
  Clock,
  Tag,
  ShieldCheck,
} from 'lucide-react';

interface TaskHistoryModalProps {
  task: Task | null;
  onClose: () => void;
  onIntervene?: (task: Task) => void;
  onRecover?: (task: Task) => void;
}

export const TaskHistoryModal: React.FC<TaskHistoryModalProps> = ({
  task,
  onClose,
}) => {
  if (!task) return null;

  const currentBadge = getStateBadgeConfig(task.state);

  const renderActorIcon = (actor: string) => {
    switch (actor) {
      case 'routing_engine':
        return <Bot className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />;
      case 'operator':
        return <UserCheck className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />;
      case 'contributor':
        return <User className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />;
      default:
        return <Cpu className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-card text-card-foreground border border-border rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-lg overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-border flex items-start justify-between bg-muted/20">
          <div>
            <div className="flex items-center space-x-2 mb-1.5">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                {task.id}
              </span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${currentBadge.bg}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${currentBadge.dot}`} />
                {currentBadge.label}
              </span>
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-xs bg-secondary text-secondary-foreground border border-border">
                <Tag className="h-3 w-3 text-muted-foreground" />
                <span>{task.expertiseRequired}</span>
              </span>
            </div>
            <h2 className="text-base font-semibold text-foreground tracking-tight">
              {task.title}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Created {formatDateTime(task.createdAt)} ({formatRelativeTime(task.createdAt)})
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body: Task Context & Timeline */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Active Assignee summary if assigned */}
          {task.activeAssignee && (
            <div className="p-3.5 rounded-lg bg-muted/30 border border-border flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <img
                  src={task.activeAssignee.avatar}
                  alt={task.activeAssignee.name}
                  className="h-8 w-8 rounded-full object-cover border border-border"
                />
                <div>
                  <div className="text-xs font-semibold text-foreground flex items-center space-x-1.5">
                    <span>{task.activeAssignee.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                      Active Assignee (Max 1)
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {task.activeAssignee.title} • {task.activeAssignee.email}
                  </div>
                </div>
              </div>

              {task.assignedAt && (
                <div className="text-right text-[11px] text-muted-foreground">
                  <div className="font-medium text-foreground">Assigned</div>
                  <div>{formatDateTime(task.assignedAt)}</div>
                </div>
              )}
            </div>
          )}

          {/* Audit Log / Timeline Section */}
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center space-x-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                <span>Audit Trail & State History</span>
              </h3>
              <span className="text-[11px] text-muted-foreground font-mono">
                {task.history ? task.history.length : 0} event(s)
              </span>
            </div>

            {/* Timeline Tree */}
            <div className="relative pl-5 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-px before:bg-border">
              {task.history && task.history.length > 0 ? (
                task.history.map((entry, index) => {
                  const actorConfig = getActorConfig(entry.actor);
                  const isLatest = index === task.history.length - 1;

                  return (
                    <div key={entry.id || index} className="relative group">
                      {/* Timeline Dot */}
                      <div
                        className={`absolute -left-5 top-1 h-5 w-5 rounded-full border flex items-center justify-center bg-card ${
                          isLatest
                            ? 'border-primary shadow-xs'
                            : 'border-border'
                        }`}
                      >
                        {renderActorIcon(entry.actor)}
                      </div>

                      {/* Event Card */}
                      <div className="bg-card border border-border rounded-lg p-3 hover:border-border/80 transition shadow-xs">
                        {/* Header: Actor, Action, State transition */}
                        <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1.5">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${actorConfig.badge}`}
                            >
                              {entry.actorName || actorConfig.name}
                            </span>
                            <span className="text-xs font-mono font-medium text-foreground">
                              {entry.action}
                            </span>
                          </div>

                          {/* State Transition Badge */}
                          <div className="flex items-center space-x-1 text-[11px] font-mono">
                            {entry.previousState && (
                              <>
                                <span className="text-muted-foreground">{entry.previousState}</span>
                                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                              </>
                            )}
                            <span className="font-semibold text-primary px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20">
                              {entry.newState}
                            </span>
                          </div>
                        </div>

                        {/* Event Narrative Details */}
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {entry.details}
                        </p>

                        {/* Metadata tags if present */}
                        {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                          <div className="mt-2 pt-1.5 border-t border-border/60 flex flex-wrap gap-1.5 text-[10px] font-mono text-muted-foreground">
                            {Object.entries(entry.metadata).map(([k, v]) => (
                              <span
                                key={k}
                                className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border"
                              >
                                {k}: {typeof v === 'boolean' ? (v ? 'true' : 'false') : String(v)}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Timestamp */}
                        <div className="mt-1.5 text-[10px] text-muted-foreground flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatDateTime(entry.timestamp)}</span>
                          <span>•</span>
                          <span>{formatRelativeTime(entry.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-xs text-muted-foreground italic">No history records found.</div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-border bg-muted/20 flex items-center justify-between">
          <div className="text-[11px] text-muted-foreground">
            Audit logs are immutable and sequentially verified.
          </div>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-md text-xs font-medium border border-input bg-background hover:bg-accent text-foreground transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
