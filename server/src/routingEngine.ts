import { randomUUID } from 'node:crypto';
import {
  getTaskById,
  getAllTasks,
  updateTask,
  addHistoryEntry,
  getContributorsByExpertise,
  getAllContributors,
  getSystemStats,
} from './db.js';
import { eventStream } from './eventStream.js';
import { Contributor, Task } from './types.js';

interface ActiveJob {
  jobId: string;
  taskId: string;
  startedAt: number;
  durationMs: number;
  timerHandle?: NodeJS.Timeout;
  isStuck: boolean;
}

export class RoutingEngine {
  private activeJobs: Map<string, ActiveJob> = new Map(); // taskId -> ActiveJob

  // Configuration for simulation
  public minDurationMs: number = 5000;
  public maxDurationMs: number = 20000;
  public stuckProbability: number = 0.20; // 20% edge case

  constructor() {}

  /**
   * Start asynchronous background routing for a task
   */
  public startRouting(
    taskId: string,
    options?: {
      forceStuck?: boolean;
      customDurationMs?: number;
      actorName?: string;
    }
  ): { jobId: string; isStuck: boolean; durationSec: number | null } {
    const task = getTaskById(taskId);
    if (!task) {
      throw new Error(`Task with id ${taskId} not found`);
    }

    // Cancel any existing job for this task if currently running
    this.abortRunningJob(taskId, 'Replacing with new routing request');

    const jobId = `job_${Date.now()}_${randomUUID().slice(0, 8)}`;
    const now = new Date();

    // Determine if this request will hit the 20% stuck edge case
    // If options explicitly dictate, follow that (e.g. for deterministic testing), otherwise 20% random
    const willHang =
      options?.forceStuck !== undefined
        ? options.forceStuck
        : Math.random() < this.stuckProbability;

    // Normal duration is between 5 and 20 seconds
    const durationMs =
      options?.customDurationMs !== undefined
        ? options.customDurationMs
        : Math.floor(Math.random() * (this.maxDurationMs - this.minDurationMs + 1)) +
          this.minDurationMs;
    const durationSec = Number((durationMs / 1000).toFixed(1));

    const previousState = task.state;
    const newState = 'routing';

    // Update Task in Database
    updateTask(taskId, {
      state: newState,
      activeAssigneeId: null,
      routingStartedAt: now.toISOString(),
      routingDurationSec: willHang ? null : durationSec,
      isStuckSimulated: willHang,
      assignedAt: null,
    });

    // Audit log: Routing Started
    addHistoryEntry({
      id: randomUUID(),
      taskId,
      timestamp: now.toISOString(),
      actor: 'routing_engine',
      actorName: 'Routing Engine',
      action: 'ROUTING_STARTED',
      previousState,
      newState,
      details: willHang
        ? `Routing request initiated in background for expertise '${task.expertiseRequired}' (Attempt #${task.routingAttempt}).`
        : `Routing request initiated in background for expertise '${task.expertiseRequired}' (estimated ${durationSec}s search window).`,
      metadata: {
        jobId,
        expertiseRequired: task.expertiseRequired,
        attempt: task.routingAttempt,
      },
    });

    if (willHang) {
      // 20% edge case: Never returns.
      // Record in audit log so operator / auditor can inspect the stuck condition
      addHistoryEntry({
        id: randomUUID(),
        taskId,
        timestamp: new Date().toISOString(),
        actor: 'routing_engine',
        actorName: 'Routing Engine',
        action: 'ROUTING_HANG_SIMULATED',
        previousState: 'routing',
        newState: 'routing',
        details:
          'Simulated 20% edge case: Connection to background worker dropped without error or completion. This request will hang indefinitely until an operator intervenes.',
        metadata: {
          jobId,
          isStuck: true,
        },
      });

      const job: ActiveJob = {
        jobId,
        taskId,
        startedAt: Date.now(),
        durationMs: Infinity,
        isStuck: true,
      };
      this.activeJobs.set(taskId, job);

      // Broadcast update
      this.broadcastTaskChanged(taskId);

      return { jobId, isStuck: true, durationSec: null };
    }

    // Normal routing request (80%): returns in 5-20 seconds
    const timerHandle = setTimeout(() => {
      this.completeRouting(taskId, jobId, durationSec);
    }, durationMs);

    const job: ActiveJob = {
      jobId,
      taskId,
      startedAt: Date.now(),
      durationMs,
      timerHandle,
      isStuck: false,
    };
    this.activeJobs.set(taskId, job);

    // Broadcast update
    this.broadcastTaskChanged(taskId);

    return { jobId, isStuck: false, durationSec };
  }

  /**
   * Called when the background matching completes normally
   */
  private completeRouting(taskId: string, jobId: string, durationSec: number) {
    const job = this.activeJobs.get(taskId);
    if (!job || job.jobId !== jobId) {
      // Job was cancelled or already replaced
      return;
    }
    this.activeJobs.delete(taskId);

    const task = getTaskById(taskId);
    if (!task) return;

    // Safety check: ensure task is still in routing state (handle race conditions when operator intervened)
    if (task.state !== 'routing') {
      const matching = getContributorsByExpertise(task.expertiseRequired);
      const candidate = matching.length > 0 ? this.selectBestContributor(matching) : null;
      addHistoryEntry({
        id: randomUUID(),
        taskId,
        timestamp: new Date().toISOString(),
        actor: 'routing_engine',
        actorName: 'Routing Engine',
        action: 'ROUTING_RESULT_DISCARDED',
        previousState: task.state,
        newState: task.state,
        details: `Background matching request returned after ${durationSec}s ${
          candidate ? `(candidate: ${candidate.name})` : '(no match found)'
        }, but was safely discarded because an operator intervened beforehand (task is currently in '${task.state}' state). Operator decision took precedence.`,
        metadata: {
          durationSec,
          discardedCandidateId: candidate?.id,
          discardedCandidateName: candidate?.name,
          currentTaskState: task.state,
        },
      });
      this.broadcastTaskChanged(taskId);
      return;
    }

    const matchingContributors = getContributorsByExpertise(task.expertiseRequired);

    if (matchingContributors.length > 0) {
      // Pick one eligible contributor
      // For fair distribution, pick random or contributor with least active tasks
      const allTasks = task; // placeholder
      const selected = this.selectBestContributor(matchingContributors);

      const assignedAt = new Date().toISOString();
      updateTask(taskId, {
        state: 'assigned',
        activeAssigneeId: selected.id,
        assignedAt,
        isStuckSimulated: false,
      });

      addHistoryEntry({
        id: randomUUID(),
        taskId,
        timestamp: assignedAt,
        actor: 'routing_engine',
        actorName: 'Routing Engine',
        action: 'CONTRIBUTOR_MATCHED',
        previousState: 'routing',
        newState: 'assigned',
        details: `Routing engine matched eligible contributor ${selected.name} (${selected.title}) for expertise '${task.expertiseRequired}' after ${durationSec}s.`,
        metadata: {
          contributorId: selected.id,
          contributorName: selected.name,
          matchingCandidatesCount: matchingContributors.length,
          durationSec,
        },
      });
    } else {
      // No match found
      const failedAt = new Date().toISOString();
      updateTask(taskId, {
        state: 'failed',
        activeAssigneeId: null,
        isStuckSimulated: false,
      });

      addHistoryEntry({
        id: randomUUID(),
        taskId,
        timestamp: failedAt,
        actor: 'routing_engine',
        actorName: 'Routing Engine',
        action: 'NO_MATCH_FOUND',
        previousState: 'routing',
        newState: 'failed',
        details: `Routing engine finished after ${durationSec}s: No contributor found with required expertise '${task.expertiseRequired}'. Requires operator recovery or manual assignment.`,
        metadata: {
          expertiseRequired: task.expertiseRequired,
          durationSec,
        },
      });
    }

    this.broadcastTaskChanged(taskId);
  }

  /**
   * Pick eligible contributor from matching candidates
   */
  private selectBestContributor(candidates: Contributor[]): Contributor {
    // Pick randomly among matching candidates
    const index = Math.floor(Math.random() * candidates.length);
    return candidates[index];
  }

  /**
   * Aborts any running background timer for a task
   */
  private abortRunningJob(taskId: string, reason: string): boolean {
    const job = this.activeJobs.get(taskId);
    if (!job) return false;

    if (job.timerHandle) {
      clearTimeout(job.timerHandle);
    }
    this.activeJobs.delete(taskId);
    return true;
  }

  /**
   * Operator Intervenes: Cancel / Abort routing in progress
   */
  public cancelRouting(taskId: string, operatorName: string = 'Human Operator', reason?: string): Task {
    const task = getTaskById(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    const wasRunning = this.abortRunningJob(taskId, reason || 'Operator cancelled routing');
    const previousState = task.state;
    const newState = 'cancelled';

    updateTask(taskId, {
      state: newState,
      isStuckSimulated: false,
    });

    addHistoryEntry({
      id: randomUUID(),
      taskId,
      timestamp: new Date().toISOString(),
      actor: 'operator',
      actorName: operatorName,
      action: 'OPERATOR_CANCEL_ROUTING',
      previousState,
      newState,
      details: `Operator cancelled routing in progress.${reason ? ` Note: "${reason}"` : ''} Background job was aborted.`,
      metadata: {
        wasRunning,
        reason,
      },
    });

    this.broadcastTaskChanged(taskId);
    return getTaskById(taskId)!;
  }

  /**
   * Operator Intervenes: Manually assign contributor at any time
   */
  public manualAssign(
    taskId: string,
    contributorId: string,
    operatorName: string = 'Human Operator',
    reason?: string
  ): Task {
    const task = getTaskById(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    const contributor = getAllContributors().find((c) => c.id === contributorId);
    if (!contributor) throw new Error(`Contributor ${contributorId} not found`);

    // Abort any active routing job
    this.abortRunningJob(taskId, 'Operator manually assigned contributor');

    const previousState = task.state;
    const newState = 'assigned';
    const assignedAt = new Date().toISOString();

    const matchesExpertise = contributor.expertise
      .map((e) => e.toLowerCase())
      .includes(task.expertiseRequired.toLowerCase());

    updateTask(taskId, {
      state: newState,
      activeAssigneeId: contributor.id,
      assignedAt,
      isStuckSimulated: false,
    });

    addHistoryEntry({
      id: randomUUID(),
      taskId,
      timestamp: assignedAt,
      actor: 'operator',
      actorName: operatorName,
      action: 'OPERATOR_MANUAL_ASSIGN',
      previousState,
      newState,
      details: `Operator manually assigned task to ${contributor.name} (${contributor.title}).${
        matchesExpertise ? ' [Matches Required Expertise]' : ' [Operator Expertise Override]'
      }${reason ? ` Note: "${reason}"` : ''}`,
      metadata: {
        contributorId: contributor.id,
        contributorName: contributor.name,
        matchesExpertise,
        reason,
      },
    });

    this.broadcastTaskChanged(taskId);
    return getTaskById(taskId)!;
  }

  /**
   * Operator Intervenes: Recover a failed or declined task
   */
  public recoverTask(
    taskId: string,
    action: 'reroute' | 'manual',
    options?: {
      contributorId?: string;
      operatorName?: string;
      reason?: string;
      customDurationMs?: number;
      forceStuck?: boolean;
    }
  ): Task {
    const task = getTaskById(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    const operatorName = options?.operatorName || 'Human Operator';
    const previousState = task.state;

    if (action === 'reroute') {
      const nextAttempt = task.routingAttempt + 1;
      updateTask(taskId, {
        state: 'recovered',
        activeAssigneeId: null,
        routingAttempt: nextAttempt,
      });

      addHistoryEntry({
        id: randomUUID(),
        taskId,
        timestamp: new Date().toISOString(),
        actor: 'operator',
        actorName: operatorName,
        action: 'OPERATOR_RECOVER',
        previousState,
        newState: 'recovered',
        details: `Operator recovered task from '${previousState}' state and initiated re-routing (Attempt #${nextAttempt}).${
          options?.reason ? ` Note: "${options.reason}"` : ''
        }`,
        metadata: {
          previousState,
          nextAttempt,
          reason: options?.reason,
        },
      });

      this.broadcastTaskChanged(taskId);

      // Start routing anew
      this.startRouting(taskId, {
        forceStuck: options?.forceStuck,
        customDurationMs: options?.customDurationMs,
        actorName: operatorName,
      });

      return getTaskById(taskId)!;
    } else {
      // Manual recovery
      if (!options?.contributorId) {
        throw new Error('contributorId is required for manual recovery');
      }
      return this.manualAssign(
        taskId,
        options.contributorId,
        operatorName,
        options?.reason || 'Task recovered via manual assignment'
      );
    }
  }

  /**
   * Simulate Contributor: Accept assignment
   */
  public contributorAccept(taskId: string, contributorId?: string): Task {
    const task = getTaskById(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);
    if (task.state !== 'assigned') {
      throw new Error(`Cannot accept task in state '${task.state}'. Task must be 'assigned'.`);
    }

    const assignee = task.activeAssignee;
    const actorName = assignee ? assignee.name : 'Contributor';
    const previousState = task.state;
    const newState = 'accepted';

    updateTask(taskId, {
      state: newState,
    });

    addHistoryEntry({
      id: randomUUID(),
      taskId,
      timestamp: new Date().toISOString(),
      actor: 'contributor',
      actorName,
      action: 'CONTRIBUTOR_ACCEPTED',
      previousState,
      newState,
      details: `Contributor ${actorName} accepted the assignment. Routing is finalized.`,
      metadata: {
        contributorId: assignee?.id,
        contributorName: actorName,
      },
    });

    this.broadcastTaskChanged(taskId);
    return getTaskById(taskId)!;
  }

  /**
   * Simulate Contributor: Decline assignment
   */
  public contributorDecline(
    taskId: string,
    reason: string = 'Capacity limitation or scheduling conflict'
  ): Task {
    const task = getTaskById(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);
    if (task.state !== 'assigned') {
      throw new Error(`Cannot decline task in state '${task.state}'. Task must be 'assigned'.`);
    }

    const assignee = task.activeAssignee;
    const actorName = assignee ? assignee.name : 'Contributor';
    const previousState = task.state;
    const newState = 'declined';

    updateTask(taskId, {
      state: newState,
      activeAssigneeId: null, // Clear active assignee so task can be reassigned
    });

    addHistoryEntry({
      id: randomUUID(),
      taskId,
      timestamp: new Date().toISOString(),
      actor: 'contributor',
      actorName,
      action: 'CONTRIBUTOR_DECLINED',
      previousState,
      newState,
      details: `Contributor ${actorName} declined the assignment: "${reason}". Task requires operator recovery.`,
      metadata: {
        contributorId: assignee?.id,
        contributorName: actorName,
        reason,
      },
    });

    this.broadcastTaskChanged(taskId);
    return getTaskById(taskId)!;
  }

  /**
   * Helper to broadcast task updates and system stats
   */
  private broadcastTaskChanged(taskId: string) {
    const task = getTaskById(taskId);
    const stats = getSystemStats();
    eventStream.broadcast('TASK_UPDATED', { task, stats });
  }

  public getActiveJobs(): Array<{ taskId: string; jobId: string; elapsedSec: number; isStuck: boolean }> {
    const now = Date.now();
    const result = [];
    for (const [taskId, job] of this.activeJobs.entries()) {
      result.push({
        taskId,
        jobId: job.jobId,
        elapsedSec: Math.floor((now - job.startedAt) / 1000),
        isStuck: job.isStuck,
      });
    }
    return result;
  }

  /**
   * Reconciles active routing jobs when application restarts/reboots.
   * Ensures uninterrupted operation and records visibility in audit trail.
   */
  public reconcileOnStartup(): void {
    const tasks = getAllTasks();
    const routingTasks = tasks.filter((t) => t.state === 'routing');
    const now = Date.now();

    for (const task of routingTasks) {
      if (task.isStuckSimulated) {
        // Preserved hanging state for 20% edge case
        addHistoryEntry({
          id: randomUUID(),
          taskId: task.id,
          timestamp: new Date().toISOString(),
          actor: 'system',
          actorName: 'System Kernel',
          action: 'SYSTEM_RESTART_RECONCILED',
          previousState: 'routing',
          newState: 'routing',
          details: 'Application restarted while routing was unresolved. Restored hanging task state (20% edge case simulated). Operator intervention required.',
          metadata: { isStuckSimulated: true },
        });
      } else {
        const started = task.routingStartedAt ? new Date(task.routingStartedAt).getTime() : now;
        const targetDurationMs = (task.routingDurationSec || 10) * 1000;
        const elapsedMs = now - started;

        if (elapsedMs >= targetDurationMs) {
          // Time elapsed during restart -> complete immediately
          addHistoryEntry({
            id: randomUUID(),
            taskId: task.id,
            timestamp: new Date().toISOString(),
            actor: 'system',
            actorName: 'System Kernel',
            action: 'SYSTEM_RESTART_RECONCILED',
            previousState: 'routing',
            newState: 'routing',
            details: `Application restarted while background routing was active (${Math.round(elapsedMs / 1000)}s elapsed). Completing matching worker immediately upon restart.`,
          });
          const jobId = `job_recon_${Date.now()}`;
          this.completeRouting(task.id, jobId, Number((elapsedMs / 1000).toFixed(1)));
        } else {
          // Time remaining -> reschedule remaining duration
          const remainingMs = targetDurationMs - elapsedMs;
          const jobId = `job_recon_${Date.now()}`;
          addHistoryEntry({
            id: randomUUID(),
            taskId: task.id,
            timestamp: new Date().toISOString(),
            actor: 'system',
            actorName: 'System Kernel',
            action: 'SYSTEM_RESTART_RECONCILED',
            previousState: 'routing',
            newState: 'routing',
            details: `Application restarted while background routing was active. Resumed background worker with ${Math.round(remainingMs / 1000)}s remaining.`,
          });
          const timerHandle = setTimeout(() => {
            this.completeRouting(task.id, jobId, task.routingDurationSec || 10);
          }, remainingMs);
          this.activeJobs.set(task.id, {
            jobId,
            taskId: task.id,
            startedAt: started,
            durationMs: targetDurationMs,
            timerHandle,
            isStuck: false,
          });
        }
      }
    }
  }
}

export const routingEngine = new RoutingEngine();

