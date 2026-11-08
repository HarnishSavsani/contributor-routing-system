import React, { useState } from 'react';
import { X, Sparkles, AlertTriangle, Send } from 'lucide-react';

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description: string;
    expertiseRequired: string;
    autoRoute: boolean;
    forceStuck: boolean;
  }) => Promise<void>;
}

const PRESET_EXPERTISE = [
  'Finance',
  'Healthcare',
  'Data Analysis',
  'Operations',
  'Legal',
  'Security',
];

export const NewTaskModal: React.FC<NewTaskModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [expertiseRequired, setExpertiseRequired] = useState('Finance');
  const [customExpertise, setCustomExpertise] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [autoRoute, setAutoRoute] = useState(true);
  const [forceStuck, setForceStuck] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalExpertise = isCustom ? customExpertise.trim() : expertiseRequired;
    if (!title.trim() || !finalExpertise) return;

    try {
      setSubmitting(true);
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        expertiseRequired: finalExpertise,
        autoRoute,
        forceStuck,
      });
      setTitle('');
      setDescription('');
      setExpertiseRequired('Finance');
      setCustomExpertise('');
      setIsCustom(false);
      setForceStuck(false);
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
            <div className="h-7 w-7 rounded-md bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground tracking-tight">Create New Task</h2>
              <p className="text-xs text-muted-foreground">
                Define required expertise domain and dispatch
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
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Task Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Q4 Hospital Revenue Cycle Audit"
              className="w-full px-3 py-2 rounded-lg bg-background border border-input focus:border-ring focus:ring-1 focus:ring-ring text-xs text-foreground placeholder:text-muted-foreground outline-none transition"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detail specific deliverables, constraints, or context..."
              className="w-full px-3 py-2 rounded-lg bg-background border border-input focus:border-ring focus:ring-1 focus:ring-ring text-xs text-foreground placeholder:text-muted-foreground outline-none transition resize-none"
            />
          </div>

          {/* Required Expertise Area */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Required Expertise Area *
            </label>
            <div className="grid grid-cols-3 gap-1.5 mb-2">
              {PRESET_EXPERTISE.map((exp) => {
                const selected = !isCustom && expertiseRequired === exp;
                return (
                  <button
                    key={exp}
                    type="button"
                    onClick={() => {
                      setIsCustom(false);
                      setExpertiseRequired(exp);
                    }}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-medium border transition text-left cursor-pointer ${
                      selected
                        ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                        : 'bg-background border-input text-muted-foreground hover:text-foreground hover:bg-accent'
                    }`}
                  >
                    {exp}
                  </button>
                );
              })}
            </div>

            {/* Custom Expertise option */}
            <div className="flex items-center space-x-2 mt-1.5">
              <input
                type="text"
                placeholder="Or specify custom expertise (e.g. Quantum Computing)..."
                value={customExpertise}
                onFocus={() => setIsCustom(true)}
                onChange={(e) => {
                  setIsCustom(true);
                  setCustomExpertise(e.target.value);
                }}
                className={`flex-1 px-3 py-1.5 rounded-lg text-xs bg-background border outline-none transition ${
                  isCustom
                    ? 'border-ring ring-1 ring-ring text-foreground'
                    : 'border-input text-muted-foreground'
                }`}
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              If no registered contributor matches this expertise, the engine reports "No match found".
            </p>
          </div>

          {/* Routing Options */}
          <div className="pt-2 border-t border-border space-y-2">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRoute}
                onChange={(e) => setAutoRoute(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-input bg-background text-primary focus:ring-ring"
              />
              <span className="text-xs text-foreground font-medium">
                Submit immediately to background routing engine (5–20s window)
              </span>
            </label>

            {/* Force Stuck Testing Option */}
            {autoRoute && (
              <label className="flex items-start space-x-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 cursor-pointer">
                <input
                  type="checkbox"
                  checked={forceStuck}
                  onChange={(e) => setForceStuck(e.target.checked)}
                  className="h-3.5 w-3.5 mt-0.5 rounded border-amber-500 text-amber-500 focus:ring-amber-500"
                />
                <div>
                  <span className="text-xs font-semibold text-amber-900 dark:text-amber-200 flex items-center space-x-1">
                    <AlertTriangle className="h-3 w-3 inline text-amber-500" />
                    <span>Explicitly Simulate 20% Hanging Edge Case</span>
                  </span>
                  <span className="text-[11px] text-amber-800/80 dark:text-amber-300/80 block leading-tight mt-0.5">
                    Request will hang indefinitely without returning, allowing immediate demonstration of operator intervention.
                  </span>
                </div>
              </label>
            )}
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-md text-xs font-medium border border-input bg-background hover:bg-accent text-foreground transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim()}
              className="flex items-center space-x-1.5 px-4 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs disabled:opacity-50 transition cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{submitting ? 'Creating...' : autoRoute ? 'Create & Route' : 'Create Draft'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
