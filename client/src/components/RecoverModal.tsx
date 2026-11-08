import React, { useState } from 'react';
import { Task, Contributor } from '../types.js';
import {
  X,
  RotateCw,
  UserCheck,
  RotateCcw,
  Check,
} from 'lucide-react';

interface RecoverModalProps {
  task: Task | null;
  contributors: Contributor[];
  isOpen: boolean;
  onClose: () => void;
  onRecover: (
    action: 'reroute' | 'manual',
    contributorId?: string,
    reason?: string
  ) => Promise<void>;
}

export const RecoverModal: React.FC<RecoverModalProps> = ({
  task,
  contributors,
  isOpen,
  onClose,
  onRecover,
}) => {
  const [method, setMethod] = useState<'reroute' | 'manual'>('reroute');
  const [selectedContributorId, setSelectedContributorId] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  if (!isOpen || !task) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (method === 'manual' && !selectedContributorId) return;

    try {
      setSubmitting(true);
      await onRecover(method, selectedContributorId, reason.trim());
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
      <div className="bg-card text-card-foreground border border-border rounded-xl w-full max-w-lg shadow-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center space-x-2.5">
            <div className="h-7 w-7 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-500/20">
              <RotateCw className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-semibold text-foreground tracking-tight">Recover Task</h2>
                <span className="font-mono text-[11px] text-muted-foreground bg-muted px-1.5 py-0.2 rounded border border-border">
                  {task.id}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Resume workflow from {task.state} status
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Recovery Strategy Selection */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Recovery Action
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMethod('reroute')}
                className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
                  method === 'reroute'
                    ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                    : 'bg-background border-input text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                <RotateCcw className="h-3.5 w-3.5 mb-1" />
                <div className="text-xs font-semibold">Route Again</div>
                <div className="text-[10px] opacity-80 mt-0.5">
                  Launch Attempt #{task.routingAttempt + 1}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMethod('manual')}
                className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
                  method === 'manual'
                    ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                    : 'bg-background border-input text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                <UserCheck className="h-3.5 w-3.5 mb-1" />
                <div className="text-xs font-semibold">Manual Assign</div>
                <div className="text-[10px] opacity-80 mt-0.5">Assign specialist directly</div>
              </button>
            </div>
          </div>

          {/* Manual Contributor selector if method === manual */}
          {method === 'manual' && (
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Select Specialist
              </label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {contributors.map((c) => {
                  const isMatch = c.expertise
                    .map((e) => e.toLowerCase())
                    .includes(task.expertiseRequired.toLowerCase());
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
                          className="h-6 w-6 rounded-full object-cover border border-border"
                        />
                        <div>
                          <div className="text-xs font-medium text-foreground">{c.name}</div>
                          <div className="text-[10px] text-muted-foreground">{c.title}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        {isMatch ? (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                            Matches
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">Override</span>
                        )}
                        {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Reason input */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Audit Note
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Workload capacity cleared / Re-queued for matching..."
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
              disabled={submitting || (method === 'manual' && !selectedContributorId)}
              className="px-4 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs disabled:opacity-50 transition cursor-pointer"
            >
              {submitting ? 'Recovering...' : method === 'reroute' ? 'Recover & Route Again' : 'Recover & Assign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
