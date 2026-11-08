export type ExpertiseArea =
  | 'Finance'
  | 'Healthcare'
  | 'Data Analysis'
  | 'Operations'
  | 'Legal'
  | 'Security'
  | string;

export interface Contributor {
  id: string;
  name: string;
  email: string;
  title: string;
  avatar: string;
  expertise: string[];
  status: 'available' | 'busy' | 'offline';
  maxActiveTasks: number;
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

export type ActionType =
  | 'TASK_CREATED'
  | 'ROUTING_STARTED'
  | 'ROUTING_HANG_SIMULATED'
  | 'ROUTING_RESULT_DISCARDED'
  | 'CONTRIBUTOR_MATCHED'
  | 'NO_MATCH_FOUND'
  | 'OPERATOR_CANCEL_ROUTING'
  | 'OPERATOR_MANUAL_ASSIGN'
  | 'OPERATOR_FORCE_REROUTE'
  | 'OPERATOR_RECOVER'
  | 'CONTRIBUTOR_ACCEPTED'
  | 'CONTRIBUTOR_DECLINED'
  | 'SYSTEM_RESTART_RECONCILED';

export interface TaskHistoryEntry {
  id: string;
  taskId: string;
  timestamp: string; // ISO string
  actor: ActorType;
  actorName: string;
  action: ActionType;
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
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
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

