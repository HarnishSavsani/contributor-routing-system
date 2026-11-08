export interface Contributor {
  id: string;
  name: string;
  email: string;
  title: string;
  avatar: string;
  expertise: string[];
  status: 'available' | 'busy' | 'offline';
  maxActiveTasks: number;
  activeTaskCount?: number;
  currentTasks?: Array<{ id: string; title: string; state: string }>;
}

export type TaskState =
  | 'pending'
  | 'routing'
  | 'assigned'
  | 'accepted'
  | 'declined'
  | 'failed'
  | 'recovered'
  | 'cancelled';

export type ActorType = 'system' | 'routing_engine' | 'operator' | 'contributor';

export interface TaskHistoryEntry {
  id: string;
  taskId: string;
  timestamp: string;
  actor: ActorType;
  actorName: string;
  action: string;
  previousState: TaskState | null;
  newState: TaskState;
  details: string;
  metadata?: Record<string, any>;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  expertiseRequired: string;
  state: TaskState;
  activeAssigneeId: string | null;
  activeAssignee?: Contributor | null;
  createdAt: string;
  updatedAt: string;
  assignedAt: string | null;
  routingStartedAt: string | null;
  routingDurationSec: number | null;
  isStuckSimulated: boolean;
  routingAttempt: number;
  history: TaskHistoryEntry[];
}

export interface SystemStats {
  totalTasks: number;
  pending: number;
  routing: number;
  stuckRouting: number;
  assigned: number;
  accepted: number;
  declined: number;
  failed: number;
  recovered: number;
  cancelled: number;
  totalContributors: number;
  availableContributors: number;
}

export interface SimulationConfig {
  minDurationMs: number;
  maxDurationMs: number;
  stuckProbability: number;
  activeJobs: Array<{ taskId: string; jobId: string; elapsedSec: number; isStuck: boolean }>;
}

