import React from 'react';
import {
  Plus,
  Users,
  Sliders,
  RotateCcw,
  AlertTriangle,
  Sun,
  Moon,
  LayoutGrid,
  List,
  Sparkles,
} from 'lucide-react';
import { useTheme } from '../theme.js';

interface NavbarProps {
  connected: boolean;
  viewMode: 'grid' | 'table';
  onToggleViewMode: (mode: 'grid' | 'table') => void;
  onOpenNewTask: () => void;
  onOpenContributors: () => void;
  onOpenSimulation: () => void;
  onSeedStuckDemo: () => void;
  onResetDatabase: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  connected,
  viewMode,
  onToggleViewMode,
  onOpenNewTask,
  onOpenContributors,
  onOpenSimulation,
  onSeedStuckDemo,
  onResetDatabase,
}) => {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        {/* Brand & Connection Status */}
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shadow-xs">
            TR
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-sm tracking-tight text-foreground">
              Task Routing Engine
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium border border-border">
              Operator Control
            </span>
            <span className="flex items-center space-x-1 pl-1 text-[11px] text-muted-foreground">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  connected ? 'bg-emerald-500 animate-pulse' : 'bg-destructive'
                }`}
              />
              <span className="hidden sm:inline">
                {connected ? 'Live' : 'Disconnected'}
              </span>
            </span>
          </div>
        </div>

        {/* Actions & View Controls */}
        <div className="flex items-center space-x-1.5">
          {/* Quick Demo: 20% Hanging Edge Case */}
          <button
            onClick={onSeedStuckDemo}
            title="Demonstrate 20% hanging edge case (spawns unresolved background routing request)"
            className="hidden md:inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/15 transition cursor-pointer"
          >
            <AlertTriangle className="h-3 w-3 text-amber-500" />
            <span>Simulate Stuck (20%)</span>
          </button>

          {/* View Mode Toggle (Grid / Table) */}
          <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border">
            <button
              onClick={() => onToggleViewMode('grid')}
              title="Grid card view"
              className={`p-1.5 rounded-md transition cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onToggleViewMode('table')}
              title="Dense table view"
              className={`p-1.5 rounded-md transition cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Contributors Modal Toggle */}
          <button
            onClick={onOpenContributors}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-md text-xs font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground transition cursor-pointer"
          >
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Contributors</span>
          </button>

          {/* Simulation Config Modal Toggle */}
          <button
            onClick={onOpenSimulation}
            title="Engine parameters and simulation settings"
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent border border-transparent hover:border-border transition cursor-pointer"
          >
            <Sliders className="h-4 w-4" />
          </button>

          {/* Reset Demo State */}
          <button
            onClick={onResetDatabase}
            title="Reset database to initial demo state"
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent border border-transparent hover:border-border transition cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            title={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} mode`}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent border border-transparent hover:border-border transition cursor-pointer"
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-slate-700" />
            )}
          </button>

          {/* New Task Button */}
          <button
            onClick={onOpenNewTask}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs transition cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>New Task</span>
          </button>
        </div>
      </div>
    </header>
  );
};
