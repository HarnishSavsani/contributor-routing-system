import React, { useState, useEffect } from 'react';
import { SimulationConfig } from '../types.js';
import {
  X,
  Sliders,
  RotateCcw,
  Check,
} from 'lucide-react';

interface SimulationConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResetDatabase: () => void;
}

export const SimulationConfigModal: React.FC<SimulationConfigModalProps> = ({
  isOpen,
  onClose,
  onResetDatabase,
}) => {
  const [minSec, setMinSec] = useState<number>(5);
  const [maxSec, setMaxSec] = useState<number>(20);
  const [probPercent, setProbPercent] = useState<number>(20);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/simulation/config')
        .then((res) => res.json())
        .then((data: SimulationConfig) => {
          setMinSec(Math.round(data.minDurationMs / 1000));
          setMaxSec(Math.round(data.maxDurationMs / 1000));
          setProbPercent(Math.round(data.stuckProbability * 100));
        })
        .catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch('/api/simulation/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          minDurationMs: minSec * 1000,
          maxDurationMs: maxSec * 1000,
          stuckProbability: probPercent / 100,
        }),
      });
      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-card text-card-foreground border border-border rounded-xl w-full max-w-lg shadow-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center space-x-2.5">
            <div className="h-7 w-7 rounded-md bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <Sliders className="h-3.5 w-3.5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground tracking-tight">Routing Engine Parameters</h2>
              <p className="text-xs text-muted-foreground">
                Timing distribution and unresolved edge case frequency
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
        <form onSubmit={handleSave} className="p-5 space-y-4">
          {/* Spec description card */}
          <div className="p-3 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground space-y-1">
            <div className="font-semibold text-foreground">Challenge Specification:</div>
            <div>• Normal routing takes between <strong>5 and 20 seconds</strong> to return.</div>
            <div>• <strong>20%</strong> of routing requests never return at all (unresolved worker simulation).</div>
          </div>

          {/* Min & Max Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Min Window (Seconds)
              </label>
              <input
                type="number"
                min={1}
                max={maxSec}
                value={minSec}
                onChange={(e) => setMinSec(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 rounded-md bg-background border border-input text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Max Window (Seconds)
              </label>
              <input
                type="number"
                min={minSec}
                max={60}
                value={maxSec}
                onChange={(e) => setMaxSec(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 rounded-md bg-background border border-input text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          {/* Stuck Probability Slider */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-foreground">
                Hanging Edge Case Probability
              </label>
              <span className="text-xs font-mono font-semibold text-amber-600 dark:text-amber-400">{probPercent}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={probPercent}
              onChange={(e) => setProbPercent(Number(e.target.value))}
              className="w-full accent-primary cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
              <span>0% (Always resolves)</span>
              <span className="font-semibold text-foreground">20% (Spec default)</span>
              <span>100% (Always hangs)</span>
            </div>
          </div>

          {/* Quick presets */}
          <div className="pt-1 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => {
                setMinSec(5);
                setMaxSec(20);
                setProbPercent(20);
              }}
              className="text-muted-foreground hover:text-foreground text-[11px] underline cursor-pointer"
            >
              Reset to 5–20s & 20% spec defaults
            </button>
            <button
              type="button"
              onClick={onResetDatabase}
              className="text-destructive hover:opacity-80 text-[11px] flex items-center space-x-1 cursor-pointer font-medium"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset database</span>
            </button>
          </div>

          {/* Actions */}
          <div className="pt-2 border-t border-border flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-md text-xs font-medium border border-input bg-background hover:bg-accent text-foreground transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center space-x-1 px-4 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs transition"
            >
              {savedSuccess ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>{saving ? 'Saving...' : 'Save Parameters'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
