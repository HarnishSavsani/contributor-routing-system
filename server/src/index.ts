import express, { Request, Response } from 'express';
import cors from 'cors';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  initDatabase,
  getAllTasks,
  getTaskById,
  createTaskDirect,
  getAllContributors,
  getContributorById,
  saveContributor,
  getTaskHistory,
  getSystemStats,
  resetDatabase,
  addHistoryEntry,
} from './db.js';
import { routingEngine } from './routingEngine.js';
import { eventStream } from './eventStream.js';
import { Task, TaskState } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

app.use(cors());
app.use(express.json());

// Initialize SQLite database
initDatabase();
routingEngine.reconcileOnStartup();

// ----------------- SSE Real-time Stream -----------------
app.get('/api/events', (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const clientId = `client_${Date.now()}_${randomUUID().slice(0, 6)}`;
  eventStream.addClient(clientId, res);
});

// ----------------- Tasks Endpoints -----------------

// 1. Get all tasks
app.get('/api/tasks', (req: Request, res: Response) => {
  const { state, expertise, search } = req.query;
  let tasks = getAllTasks();

  if (state && typeof state === 'string' && state !== 'all') {
    tasks = tasks.filter((t) => t.state === state);
  }
  if (expertise && typeof expertise === 'string' && expertise !== 'all') {
    tasks = tasks.filter(
      (t) => t.expertiseRequired.toLowerCase() === expertise.toLowerCase()
    );
  }
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    tasks = tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        (t.activeAssignee && t.activeAssignee.name.toLowerCase().includes(q))
    );
  }

  res.json({ tasks, stats: getSystemStats() });
});

// 2. Get task by ID
app.get('/api/tasks/:id', (req: Request, res: Response) => {
  const task = getTaskById(req.params.id);
  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  res.json({ task });
});

// 3. Create task & optionally submit for routing
app.post('/api/tasks', (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      expertiseRequired,
      autoRoute = true,
      forceStuck,
      customDurationMs,
      operatorName = 'Operator',
    } = req.body;

    if (!title || !expertiseRequired) {
      res.status(400).json({ error: 'Title and expertiseRequired are required' });
      return;
    }

    const taskId = `TASK-${Date.now().toString().slice(-4)}`;
    const now = new Date().toISOString();

    const initialState: TaskState = autoRoute ? 'pending' : 'pending';

    createTaskDirect({
      id: taskId,
      title: title.trim(),
      description: (description || '').trim(),
      expertiseRequired: expertiseRequired.trim(),
      state: initialState,
      activeAssigneeId: null,
      createdAt: now,
      updatedAt: now,
      routingAttempt: 1,
      isStuckSimulated: false,
    });

    addHistoryEntry({
      id: randomUUID(),
      taskId,
      timestamp: now,
      actor: 'operator',
      actorName: operatorName,
      action: 'TASK_CREATED',
      previousState: null,
      newState: 'pending',
      details: `Task '${title}' created with requirement: ${expertiseRequired}.`,
      metadata: { autoRoute },
    });

    let task = getTaskById(taskId)!;

    if (autoRoute) {
      routingEngine.startRouting(taskId, {
        forceStuck,
        customDurationMs,
        actorName: operatorName,
      });
      task = getTaskById(taskId)!;
    }

    eventStream.broadcast('TASK_CREATED', { task, stats: getSystemStats() });

    res.status(201).json({ task, message: 'Task created successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Manually trigger routing for a pending task
app.post('/api/tasks/:id/route', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { forceStuck, customDurationMs, operatorName = 'Operator' } = req.body;
    const task = getTaskById(id);
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const result = routingEngine.startRouting(id, {
      forceStuck,
      customDurationMs,
      actorName: operatorName,
    });

    res.json({
      task: getTaskById(id),
      routingInfo: result,
      message: 'Routing initiated in background',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Operator Intervene in assignment/routing
app.post('/api/tasks/:id/intervene', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { action, contributorId, operatorName = 'Operator', reason } = req.body;

    const task = getTaskById(id);
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    let updated: Task;

    switch (action) {
      case 'cancel_routing': {
        updated = routingEngine.cancelRouting(id, operatorName, reason);
        break;
      }
      case 'manual_assign': {
        if (!contributorId) {
          res.status(400).json({ error: 'contributorId required for manual_assign' });
          return;
        }
        updated = routingEngine.manualAssign(id, contributorId, operatorName, reason);
        break;
      }
      case 'force_reroute': {
        routingEngine.cancelRouting(id, operatorName, 'Operator triggered force re-route');
        routingEngine.startRouting(id, { actorName: operatorName });
        updated = getTaskById(id)!;
        break;
      }
      default:
        res.status(400).json({ error: `Unknown intervention action: ${action}` });
        return;
    }

    res.json({ task: updated, message: `Operator intervention '${action}' executed.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Operator Recover a failed or declined task
app.post('/api/tasks/:id/recover', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      action = 'reroute',
      contributorId,
      operatorName = 'Operator',
      reason,
      forceStuck,
      customDurationMs,
    } = req.body;

    const task = getTaskById(id);
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const updated = routingEngine.recoverTask(id, action, {
      contributorId,
      operatorName,
      reason,
      forceStuck,
      customDurationMs,
    });

    res.json({
      task: updated,
      message: `Task recovered via ${action}`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Contributor Simulation: Accept or Decline
app.post('/api/tasks/:id/contributor-action', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body;

    let updated: Task;
    if (action === 'accept') {
      updated = routingEngine.contributorAccept(id);
    } else if (action === 'decline') {
      updated = routingEngine.contributorDecline(id, reason);
    } else {
      res.status(400).json({ error: `Invalid action: ${action}. Must be 'accept' or 'decline'.` });
      return;
    }

    res.json({ task: updated, message: `Contributor action '${action}' recorded.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Task History / Audit Log
app.get('/api/tasks/:id/history', (req: Request, res: Response) => {
  const { id } = req.params;
  const history = getTaskHistory(id);
  res.json({ history });
});

// 9. Contributors List & Details
app.get('/api/contributors', (req: Request, res: Response) => {
  const contributors = getAllContributors();
  const tasks = getAllTasks();

  // Attach active assignment counts
  const enriched = contributors.map((c) => {
    const activeTasks = tasks.filter(
      (t) =>
        t.activeAssigneeId === c.id &&
        (t.state === 'assigned' || t.state === 'accepted' || t.state === 'routing')
    );
    return {
      ...c,
      activeTaskCount: activeTasks.length,
      currentTasks: activeTasks.map((t) => ({ id: t.id, title: t.title, state: t.state })),
    };
  });

  res.json({ contributors: enriched });
});

// 10. Add or Update Contributor
app.post('/api/contributors', (req: Request, res: Response) => {
  try {
    const { id, name, email, title, avatar, expertise, status, maxActiveTasks } = req.body;
    if (!name || !expertise || !Array.isArray(expertise) || expertise.length === 0) {
      res.status(400).json({ error: 'Name and at least one expertise are required' });
      return;
    }

    const contributorId = id || `contrib_${Date.now().toString().slice(-4)}`;
    const contributor = {
      id: contributorId,
      name,
      email: email || `${name.toLowerCase().replace(/\s+/g, '.')}@system.io`,
      title: title || 'Specialist Contributor',
      avatar:
        avatar ||
        `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80`,
      expertise,
      status: status || 'available',
      maxActiveTasks: maxActiveTasks || 2,
    };

    saveContributor(contributor);
    eventStream.broadcast('CONTRIBUTOR_UPDATED', { contributor });
    res.status(201).json({ contributor });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 11. System Statistics
app.get('/api/stats', (req: Request, res: Response) => {
  res.json({ stats: getSystemStats() });
});

// 12. Simulation Controls (Config & Info)
app.get('/api/simulation/config', (req: Request, res: Response) => {
  res.json({
    minDurationMs: routingEngine.minDurationMs,
    maxDurationMs: routingEngine.maxDurationMs,
    stuckProbability: routingEngine.stuckProbability,
    activeJobs: routingEngine.getActiveJobs(),
  });
});

app.post('/api/simulation/config', (req: Request, res: Response) => {
  const { minDurationMs, maxDurationMs, stuckProbability } = req.body;
  if (minDurationMs !== undefined) routingEngine.minDurationMs = Number(minDurationMs);
  if (maxDurationMs !== undefined) routingEngine.maxDurationMs = Number(maxDurationMs);
  if (stuckProbability !== undefined) routingEngine.stuckProbability = Number(stuckProbability);

  res.json({
    message: 'Simulation parameters updated',
    config: {
      minDurationMs: routingEngine.minDurationMs,
      maxDurationMs: routingEngine.maxDurationMs,
      stuckProbability: routingEngine.stuckProbability,
    },
  });
});

// 13. System Reset & Demo Seeding
app.post('/api/system/reset', (req: Request, res: Response) => {
  resetDatabase();
  eventStream.broadcast('SYSTEM_RESET', { stats: getSystemStats() });
  res.json({ message: 'Database reset to initial demo state', stats: getSystemStats() });
});

// Seed an instant live routing demo task (including one normal and one stuck)
app.post('/api/system/seed-demo-routing', (req: Request, res: Response) => {
  const { type = 'normal' } = req.body;
  const now = new Date().toISOString();
  const taskId = `TASK-LIVE-${Date.now().toString().slice(-4)}`;

  const isStuck = type === 'stuck';
  createTaskDirect({
    id: taskId,
    title: isStuck
      ? 'Complex Multi-Market Volatility Simulation'
      : 'Real-time Clinical Triage Data Reconciliation',
    description: isStuck
      ? 'High-frequency Monte Carlo risk analysis across global derivatives (Simulated 20% hanging request edge case).'
      : 'Reconcile patient intake stream across multiple diagnostic units.',
    expertiseRequired: isStuck ? 'Finance' : 'Healthcare',
    state: 'pending',
    createdAt: now,
    updatedAt: now,
    activeAssigneeId: null,
    isStuckSimulated: false,
    routingAttempt: 1,
  });

  addHistoryEntry({
    id: randomUUID(),
    taskId,
    timestamp: now,
    actor: 'operator',
    actorName: 'Operator',
    action: 'TASK_CREATED',
    previousState: null,
    newState: 'pending',
    details: `Task created for demonstration (${isStuck ? 'Demonstrating 20% stuck edge case' : 'Normal 5-20s routing'}).`,
  });

  routingEngine.startRouting(taskId, {
    forceStuck: isStuck,
  });

  res.json({ task: getTaskById(taskId) });
});

// Serve frontend in production build if present
const CLIENT_DIST = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get('*', (req: Request, res: Response) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(CLIENT_DIST, 'index.html'));
    }
  });
}

let server: any = null;
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, () => {
    console.log(`[Server] Contributor Routing System running on http://localhost:${PORT}`);
  });
}

export { app, server };
