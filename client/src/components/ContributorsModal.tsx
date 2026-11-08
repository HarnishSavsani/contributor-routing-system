import React, { useState } from 'react';
import { Contributor } from '../types.js';
import {
  X,
  Users,
  Plus,
} from 'lucide-react';

interface ContributorsModalProps {
  contributors: Contributor[];
  isOpen: boolean;
  onClose: () => void;
  onAddContributor: (contributor: {
    name: string;
    email: string;
    title: string;
    expertise: string[];
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

export const ContributorsModal: React.FC<ContributorsModalProps> = ({
  contributors,
  isOpen,
  onClose,
  onAddContributor,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [selectedExpertise, setSelectedExpertise] = useState<string[]>(['Finance']);
  const [customTag, setCustomTag] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const toggleExpertise = (exp: string) => {
    if (selectedExpertise.includes(exp)) {
      if (selectedExpertise.length > 1) {
        setSelectedExpertise(selectedExpertise.filter((e) => e !== exp));
      }
    } else {
      setSelectedExpertise([...selectedExpertise, exp]);
    }
  };

  const handleAddCustom = () => {
    const trimmed = customTag.trim();
    if (trimmed && !selectedExpertise.includes(trimmed)) {
      setSelectedExpertise([...selectedExpertise, trimmed]);
      setCustomTag('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || selectedExpertise.length === 0) return;

    try {
      setSubmitting(true);
      await onAddContributor({
        name: name.trim(),
        email: email.trim(),
        title: title.trim(),
        expertise: selectedExpertise,
      });
      setName('');
      setEmail('');
      setTitle('');
      setSelectedExpertise(['Finance']);
      setShowAddForm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-card text-card-foreground border border-border rounded-xl w-full max-w-xl shadow-lg overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center space-x-2.5">
            <div className="h-7 w-7 rounded-md bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <Users className="h-3.5 w-3.5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground tracking-tight">Contributors Directory</h2>
              <p className="text-xs text-muted-foreground">
                Specialists and certified areas of expertise
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

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Action Row */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">
              {contributors.length} registered specialists
            </span>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center space-x-1 h-7 px-2.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{showAddForm ? 'Hide Form' : 'Add Contributor'}</span>
            </button>
          </div>

          {/* Add Contributor Form */}
          {showAddForm && (
            <form
              onSubmit={handleSubmit}
              className="p-3.5 rounded-lg bg-muted/30 border border-border space-y-2.5"
            >
              <div className="text-xs font-semibold text-foreground">New Specialist Profile</div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  placeholder="Full Name (e.g. Dr. Maya Lin)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="px-2.5 py-1.5 rounded-md bg-background border border-input text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
                />
                <input
                  type="text"
                  placeholder="Job Title (e.g. Clinical Director)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="px-2.5 py-1.5 rounded-md bg-background border border-input text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                  Select Certified Expertise
                </label>
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {PRESET_EXPERTISE.map((exp) => {
                    const active = selectedExpertise.includes(exp);
                    return (
                      <button
                        key={exp}
                        type="button"
                        onClick={() => toggleExpertise(exp)}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium border transition cursor-pointer ${
                          active
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background border-input text-muted-foreground hover:bg-accent'
                        }`}
                      >
                        {exp}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center space-x-1.5">
                  <input
                    type="text"
                    placeholder="Custom expertise tag..."
                    value={customTag}
                    onChange={(e) => setCustomTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustom();
                      }
                    }}
                    className="flex-1 px-2.5 py-1 rounded-md bg-background border border-input text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustom}
                    className="px-2.5 py-1 rounded-md text-xs font-medium border border-input bg-background hover:bg-accent text-foreground"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="flex justify-end space-x-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-2.5 py-1 rounded-md text-xs font-medium border border-input text-muted-foreground hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3 py-1 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {submitting ? 'Saving...' : 'Save Specialist'}
                </button>
              </div>
            </form>
          )}

          {/* List of contributors */}
          <div className="space-y-2">
            {contributors.map((c) => (
              <div
                key={c.id}
                className="p-3 rounded-lg bg-card border border-border flex items-center justify-between hover:bg-muted/20 transition"
              >
                <div className="flex items-center space-x-3">
                  <img
                    src={c.avatar}
                    alt={c.name}
                    className="h-8 w-8 rounded-full object-cover border border-border"
                  />
                  <div>
                    <div className="text-xs font-semibold text-foreground flex items-center space-x-1.5">
                      <span>{c.name}</span>
                      <span className="text-[10px] px-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-medium">
                        {c.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground flex items-center space-x-1.5 mt-0.5">
                      <span>{c.title}</span>
                      <span>•</span>
                      <span>{c.email}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {c.expertise.map((exp) => (
                        <span
                          key={exp}
                          className="text-[10px] px-1.5 py-0.2 rounded bg-secondary text-secondary-foreground border border-border font-medium"
                        >
                          {exp}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-bold text-foreground">
                    {c.activeTaskCount || 0}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    active tasks
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-border bg-muted/20 flex justify-end">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-md text-xs font-medium border border-input bg-background hover:bg-accent text-foreground transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
