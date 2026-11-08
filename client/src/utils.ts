import { TaskState, ActorType } from './types.js';

export function formatRelativeTime(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 5) return 'just now';
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d ago`;
}

export function formatDateTime(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function getStateBadgeConfig(state: TaskState) {
  switch (state) {
    case 'routing':
      return {
        label: 'Routing',
        bg: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25',
        dot: 'bg-amber-500 animate-pulse',
        glow: '',
      };
    case 'assigned':
      return {
        label: 'Assigned',
        bg: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25',
        dot: 'bg-blue-500',
        glow: '',
      };
    case 'accepted':
      return {
        label: 'Accepted',
        bg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
        dot: 'bg-emerald-500',
        glow: '',
      };
    case 'declined':
      return {
        label: 'Declined',
        bg: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25',
        dot: 'bg-rose-500',
        glow: '',
      };
    case 'failed':
      return {
        label: 'Failed',
        bg: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/25',
        dot: 'bg-red-500',
        glow: '',
      };
    case 'recovered':
      return {
        label: 'Recovered',
        bg: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/25',
        dot: 'bg-sky-500',
        glow: '',
      };
    case 'cancelled':
      return {
        label: 'Cancelled',
        bg: 'bg-muted text-muted-foreground border-border',
        dot: 'bg-muted-foreground',
        glow: '',
      };
    case 'pending':
    default:
      return {
        label: 'Pending',
        bg: 'bg-secondary text-secondary-foreground border-border',
        dot: 'bg-muted-foreground',
        glow: '',
      };
  }
}

export function getActorConfig(actor: ActorType) {
  switch (actor) {
    case 'routing_engine':
      return {
        name: 'Routing Engine',
        badge: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/25',
        icon: 'Bot',
      };
    case 'operator':
      return {
        name: 'Human Operator',
        badge: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25',
        icon: 'UserCheck',
      };
    case 'contributor':
      return {
        name: 'Contributor',
        badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
        icon: 'User',
      };
    default:
      return {
        name: 'System',
        badge: 'bg-secondary text-secondary-foreground border-border',
        icon: 'Cpu',
      };
  }
}
