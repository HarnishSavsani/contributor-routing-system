import React, { useState } from 'react';
import { Task, Contributor } from '../types.js';
import {
  X,
  Zap,
  UserCheck,
  Ban,
  RotateCw,
  AlertCircle,
  Check,
} from 'lucide-react';

interface InterveneModalProps {
  task: Task | null;
  contributors: Contributor[];
  isOpen: boolean;
  onClose: () => void;
  onExecute: (
    action: 'manual_assign' | 'cancel_routing' | 'force_reroute',
    contributorId?: string,
    reason?: string
  ) => Promise<void>;
}

export const InterveneModal: React.FC<InterveneModalProps> = ({
  task,
  contributors,
  isOpen,
  onClose,
  onExecute,
}) => {
  const [selectedAction, setSelectedAction] = useState<
    'manual_assign' | 'cancel_routing' | 'force_reroute'
  >('manual_assign');
  const [selectedContributorId, setSelectedContributorId] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  if (!isOpen || !task) return null;

  const matchingContributors = contributors.filter((c) =>
    c.expertise.map((e) => e.toLowerCase()).includes(task.expertiseRequired.toLowerCase())
  );
  const otherContributors = contributors.filter(
    (c) =>
      !c.expertise.map((e) => e.toLowerCase()).includes(task.expertiseRequired.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAction === 'manual_assign' && !selectedContributorId) return;

    try {
      setSubmitting(true);
      await onExecute(selectedAction, selectedContributorId, reason.trim());
      setReason('');
      setSelectedContributorId('');
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-card text-card-foreground border border-border rounded-xl w-full max-w-lg shadow-lg overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center space-x-2.5">
            <div className="h-7 w-7 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Zap className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-semibold text-foreground tracking-tight">Operator Intervention</h2>
                <span className="font-mono text-[11px] text-muted-foreground bg-muted px-1.5 py-0.2 rounded border border-border">
                  {task.id}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Override active routing or manually reassign specialist
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Task Summary Banner */}
        <div className="px-5 py-2.5 bg-muted/30 border-b border-border flex items-center justify-between text-xs">
          <div className="truncate max-w-[260px]">
            <span className="text-muted-foreground">Task: </span>
            <span className="font-medium text-foreground">{task.title}</span>
          </div>
          <div className="flex items-center space-x-1.5 shrink-0">
            <span className="text-muted-foreground">Expertise: </span>
            <span className="font-medium text-primary px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
              {task.expertiseRequired}
            </span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Action Choice Tabs */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Select Action
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedAction('manual_assign')}
                className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
                  selectedAction === 'manual_assign'
                    ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                    : 'bg-background border-input text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                <UserCheck className="h-3.5 w-3.5 mb-1" />
                <div className="text-xs font-semibold">Manual Assign</div>
                <div className="text-[10px] opacity-80 mt-0.5">Pick specialist</div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedAction('cancel_routing')}
                className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
                  selectedAction === 'cancel_routing'
                    ? 'bg-destructive text-destructive-foreground border-destructive shadow-xs'
                    : 'bg-background border-input text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                <Ban className="h-3.5 w-3.5 mb-1" />
                <div className="text-xs font-semibold">Cancel Routing</div>
                <div className="text-[10px] opacity-80 mt-0.5">Abort request</div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedAction('force_reroute')}
                className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
                  selectedAction === 'force_reroute'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-background border-input text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                <RotateCw className="h-3.5 w-3.5 mb-1" />
                <div className="text-xs font-semibold">Force Re-route</div>
                <div className="text-[10px] opacity-80 mt-0.5">Restart engine</div>
              </button>
            </div>
          </div>

          {/* If Manual Assign selected: Contributor List */}
          {selectedAction === 'manual_assign' && (
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Choose Assignee (Enforces Max 1 Active Assignee)
              </label>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {matchingContributors.length > 0 && (
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1 pt-0.5">
                    Matching Skill: {task.expertiseRequired}
                  </div>
                )}
                {matchingContributors.map((c) => {
                  const isSelected = selectedContributorId === c.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedContributorId(c.id)}
                      className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer transition ${
                        isSelected
                          ? 'bg-accent border-primary text-foreground'
                          : 'bg-background border-input hover:bg-accent/40 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <img
                          src={c.avatar}
                          alt={c.name}
                          className="h-7 w-7 rounded-full object-cover border border-border"
                        />
                        <div>
                          <div className="text-xs font-medium text-foreground flex items-center space-x-1.5">
                            <span>{c.name}</span>
                            <span className="text-[10px] px-1 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                              Matches
                            </span>
                          </div>
                          <div className="text-[11px] text-muted-foreground">{c.title}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {c.activeTaskCount || 0} active
                        </span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                      </div>
                    </div>
                  );
                })}

                {/* Non-matching Contributors with Override label */}
                {otherContributors.length > 0 && (
                  <>
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1 pt-2">
                      Other Specialists (Operator Override)
                    </div>
                    {otherContributors.map((c) => {
                      const isSelected = selectedContributorId === c.id;
                      return (
                        <div
                          key={c.id}
                          onClick={() => setSelectedContributorId(c.id)}
                          className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer transition ${
                            isSelected
                              ? 'bg-accent border-amber-500 text-foreground'
                              : 'bg-background border-input hover:bg-accent/40 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5">
                            <img
                              src={c.avatar}
                              alt={c.name}
                              className="h-7 w-7 rounded-full object-cover border border-border"
                            />
                            <div>
                              <div className="text-xs font-medium text-foreground">{c.name}</div>
                              <div className="text-[11px] text-muted-foreground">
                                {c.expertise.join(', ')}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-[10px] text-amber-600 dark:text-amber-400">Override</span>
                            {isSelected && <Check className="h-3.5 w-3.5 text-amber-500" />}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </div>
          )}

          {/* If Cancel Routing selected */}
          {selectedAction === 'cancel_routing' && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              <div className="font-semibold flex items-center space-x-1.5 mb-1">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>Confirm Abort</span>
              </div>
              <p className="opacity-90 leading-relaxed text-[11px]">
                Cancels in-progress routing. The task transitions to <strong>cancelled</strong> and remains safely in queue until re-routed or recovered.
              </p>
            </div>
          )}

          {/* Reason / Operator Note */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Operator Reason / Audit Note
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Priority client override / Routing window exceeded threshold..."
              className="w-full px-3 py-1.5 rounded-lg bg-background border border-input focus:border-ring focus:ring-1 focus:ring-ring text-xs text-foreground placeholder:text-muted-foreground outline-none transition"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 border-t border-border flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-md text-xs font-medium border border-input bg-background hover:bg-accent text-foreground transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || (selectedAction === 'manual_assign' && !selectedContributorId)}
              className="px-4 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs disabled:opacity-50 transition cursor-pointer"
            >
              {submitting ? 'Applying...' : 'Apply Intervention'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
