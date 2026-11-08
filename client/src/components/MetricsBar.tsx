import React from 'react';
import { SystemStats } from '../types.js';
import {
  Layers,
  Loader2,
  AlertCircle,
  UserCheck,
  CheckCircle2,
  Users,
} from 'lucide-react';

interface MetricsBarProps {
  stats: SystemStats | null;
  activeFilter: string;
  onSelectFilter: (filter: string) => void;
}

export const MetricsBar: React.FC<MetricsBarProps> = ({
  stats,
  activeFilter,
  onSelectFilter,
}) => {
  if (!stats) return null;

  const needsRecoveryCount = stats.failed + stats.declined;

  const cards = [
    {
      id: 'all',
      title: 'Total Tasks',
      value: stats.totalTasks,
      subtext: 'Across all workflows',
      icon: Layers,
      highlight: false,
    },
    {
      id: 'routing',
      title: 'In Routing',
      value: stats.routing,
      badge: stats.stuckRouting > 0 ? `${stats.stuckRouting} stuck` : null,
      subtext: '5–20s matching window',
      icon: Loader2,
      spinIcon: stats.routing > 0,
      color: 'text-amber-600 dark:text-amber-400',
    },
    {
      id: 'assigned',
      title: 'Assigned',
      value: stats.assigned,
      subtext: 'Awaiting completion',
      icon: UserCheck,
      color: 'text-blue-600 dark:text-blue-400',
    },
    {
      id: 'accepted',
      title: 'Accepted',
      value: stats.accepted,
      subtext: 'Routing finalized',
      icon: CheckCircle2,
      color: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      id: 'needs_recovery',
      title: 'Needs Recovery',
      value: needsRecoveryCount,
      subtext: `${stats.failed} failed • ${stats.declined} declined`,
      icon: AlertCircle,
      color: 'text-rose-600 dark:text-rose-400',
    },
    {
      id: 'contributors',
      title: 'Contributors',
      value: stats.totalContributors,
      subtext: `${stats.availableContributors} ready for routing`,
      icon: Users,
      color: 'text-purple-600 dark:text-purple-400',
      nonFilter: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {cards.map((card) => {
        const isSelected = activeFilter === card.id;
        const Icon = card.icon;

        return (
          <div
            key={card.id}
            onClick={() => !card.nonFilter && onSelectFilter(card.id)}
            className={`rounded-xl border p-3.5 transition-all text-card-foreground shadow-xs ${
              card.nonFilter ? 'cursor-default' : 'cursor-pointer'
            } ${
              isSelected
                ? 'bg-accent/60 border-primary/50 ring-1 ring-primary/20'
                : 'bg-card border-border hover:bg-accent/30 hover:border-border'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground mb-1">
              <span>{card.title}</span>
              <Icon
                className={`h-3.5 w-3.5 ${card.color || 'text-muted-foreground'} ${
                  card.spinIcon ? 'animate-spin' : ''
                }`}
              />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {card.value}
              </span>
              {card.badge && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  {card.badge}
                </span>
              )}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1 truncate">
              {card.subtext}
            </div>
          </div>
        );
      })}
    </div>
  );
};
