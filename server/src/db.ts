import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Contributor, Task, TaskHistoryEntry, SystemStats, TaskState } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'routing_system.db');
export const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');

// Initialize Tables
export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS contributors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      title TEXT NOT NULL,
      avatar TEXT NOT NULL,
      expertise TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'available',
      maxActiveTasks INTEGER NOT NULL DEFAULT 2
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      expertiseRequired TEXT NOT NULL,
      state TEXT NOT NULL,
      activeAssigneeId TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      assignedAt TEXT,
      routingStartedAt TEXT,
      routingDurationSec REAL,
      isStuckSimulated INTEGER NOT NULL DEFAULT 0,
      routingAttempt INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (activeAssigneeId) REFERENCES contributors(id)
    );

    CREATE TABLE IF NOT EXISTS task_history (
      id TEXT PRIMARY KEY,
      taskId TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      actor TEXT NOT NULL,
      actorName TEXT NOT NULL,
      action TEXT NOT NULL,
      previousState TEXT,
      newState TEXT NOT NULL,
      details TEXT NOT NULL,
      metadata TEXT,
      FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_state ON tasks(state);
    CREATE INDEX IF NOT EXISTS idx_tasks_expertise ON tasks(expertiseRequired);
    CREATE INDEX IF NOT EXISTS idx_history_taskId ON task_history(taskId);
  `);

  seedDefaultContributors();
  seedSampleTasksIfEmpty();
}

const DEFAULT_CONTRIBUTORS: Contributor[] = [
  {
    id: 'contrib_1',
    name: 'Dr. Elena Vance',
    email: 'elena.vance@system.io',
    title: 'Healthcare Operations Director',
    avatar: 'https://images.unsplash.com/photo-1594824813583-7729f92e595a?w=150&auto=format&fit=crop&q=80',
    expertise: ['Healthcare', 'Operations'],
    status: 'available',
    maxActiveTasks: 2,
  },
  {
    id: 'contrib_2',
    name: 'Marcus Sterling',
    email: 'm.sterling@system.io',
    title: 'Senior Quantitative Analyst',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    expertise: ['Finance', 'Data Analysis'],
    status: 'available',
    maxActiveTasks: 2,
  },
  {
    id: 'contrib_3',
    name: 'Priya Sharma',
    email: 'priya.s@system.io',
    title: 'Operations Intelligence Lead',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    expertise: ['Data Analysis', 'Operations'],
    status: 'available',
    maxActiveTasks: 2,
  },
  {
    id: 'contrib_4',
    name: 'David Kim',
    email: 'david.kim@system.io',
    title: 'Principal Financial Strategist',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    expertise: ['Finance'],
    status: 'available',
    maxActiveTasks: 2,
  },
  {
    id: 'contrib_5',
    name: 'Sarah Jenkins',
    email: 'sarah.j@system.io',
    title: 'Clinical Workflow Specialist',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    expertise: ['Healthcare'],
    status: 'available',
    maxActiveTasks: 2,
  },
  {
    id: 'contrib_6',
    name: 'Alex Rivera',
    email: 'alex.rivera@system.io',
    title: 'Business Operations Manager',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    expertise: ['Operations', 'Finance'],
    status: 'available',
    maxActiveTasks: 2,
  },
];

function seedDefaultContributors() {
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM contributors');
  const result = countStmt.get() as { count: number };
  if (result.count === 0) {
    const insert = db.prepare(`
      INSERT INTO contributors (id, name, email, title, avatar, expertise, status, maxActiveTasks)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const c of DEFAULT_CONTRIBUTORS) {
      insert.run(
        c.id,
        c.name,
        c.email,
        c.title,
        c.avatar,
        JSON.stringify(c.expertise),
        c.status,
        c.maxActiveTasks
      );
    }
    console.log(`[DB] Seeded ${DEFAULT_CONTRIBUTORS.length} contributors.`);
  }
}

function seedSampleTasksIfEmpty() {
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM tasks');
  const result = countStmt.get() as { count: number };
  if (result.count === 0) {
    console.log('[DB] Seeding demonstration tasks...');
    const now = Date.now();

    // 1. Accepted task
    createTaskDirect({
      id: 'TASK-101',
      title: 'Q3 Hospital Revenue Cycle Audit',
      description: 'Audit patient billing cycles and identify reimbursement discrepancy trends.',
      expertiseRequired: 'Healthcare',
      state: 'accepted',
      activeAssigneeId: 'contrib_5',
      createdAt: new Date(now - 3600000 * 3).toISOString(),
      updatedAt: new Date(now - 3600000 * 2.5).toISOString(),
      assignedAt: new Date(now - 3600000 * 2.8).toISOString(),
      routingStartedAt: new Date(now - 3600000 * 2.9).toISOString(),
      routingDurationSec: 11.4,
      isStuckSimulated: false,
      routingAttempt: 1,
    });

    addHistoryEntry({
      id: 'hist_101_1',
      taskId: 'TASK-101',
      timestamp: new Date(now - 3600000 * 3).toISOString(),
      actor: 'operator',
      actorName: 'Operator',
      action: 'TASK_CREATED',
      previousState: null,
      newState: 'pending',
      details: 'Task created and queued for routing.',
    });
    addHistoryEntry({
      id: 'hist_101_2',
      taskId: 'TASK-101',
      timestamp: new Date(now - 3600000 * 2.9).toISOString(),
      actor: 'routing_engine',
      actorName: 'Routing Engine',
      action: 'ROUTING_STARTED',
      previousState: 'pending',
      newState: 'routing',
      details: 'Routing engine initiated background search for expertise: Healthcare.',
    });
    addHistoryEntry({
      id: 'hist_101_3',
      taskId: 'TASK-101',
      timestamp: new Date(now - 3600000 * 2.8).toISOString(),
      actor: 'routing_engine',
      actorName: 'Routing Engine',
      action: 'CONTRIBUTOR_MATCHED',
      previousState: 'routing',
      newState: 'assigned',
      details: 'Matched eligible contributor Sarah Jenkins (Healthcare) after 11.4s matching window.',
    });
    addHistoryEntry({
      id: 'hist_101_4',
      taskId: 'TASK-101',
      timestamp: new Date(now - 3600000 * 2.5).toISOString(),
      actor: 'contributor',
      actorName: 'Sarah Jenkins',
      action: 'CONTRIBUTOR_ACCEPTED',
      previousState: 'assigned',
      newState: 'accepted',
      details: 'Contributor Sarah Jenkins accepted the task assignment. Routing completed.',
    });

    // 2. Declined task ready for operator recovery
    createTaskDirect({
      id: 'TASK-102',
      title: 'Customer Churn Machine Learning Evaluation',
      description: 'Analyze telemetry logs and cross-validate regression churn model features.',
      expertiseRequired: 'Data Analysis',
      state: 'declined',
      activeAssigneeId: null,
      createdAt: new Date(now - 3600000 * 1.5).toISOString(),
      updatedAt: new Date(now - 3600000 * 1.1).toISOString(),
      assignedAt: new Date(now - 3600000 * 1.3).toISOString(),
      routingStartedAt: new Date(now - 3600000 * 1.4).toISOString(),
      routingDurationSec: 8.2,
      isStuckSimulated: false,
      routingAttempt: 1,
    });
    addHistoryEntry({
      id: 'hist_102_1',
      taskId: 'TASK-102',
      timestamp: new Date(now - 3600000 * 1.5).toISOString(),
      actor: 'operator',
      actorName: 'Operator',
      action: 'TASK_CREATED',
      previousState: null,
      newState: 'pending',
      details: 'Task created.',
    });
    addHistoryEntry({
      id: 'hist_102_2',
      taskId: 'TASK-102',
      timestamp: new Date(now - 3600000 * 1.4).toISOString(),
      actor: 'routing_engine',
      actorName: 'Routing Engine',
      action: 'ROUTING_STARTED',
      previousState: 'pending',
      newState: 'routing',
      details: 'Routing engine background search initiated for expertise: Data Analysis.',
    });
    addHistoryEntry({
      id: 'hist_102_3',
      taskId: 'TASK-102',
      timestamp: new Date(now - 3600000 * 1.3).toISOString(),
      actor: 'routing_engine',
      actorName: 'Routing Engine',
      action: 'CONTRIBUTOR_MATCHED',
      previousState: 'routing',
      newState: 'assigned',
      details: 'Matched eligible contributor Priya Sharma after 8.2s.',
    });
    addHistoryEntry({
      id: 'hist_102_4',
      taskId: 'TASK-102',
      timestamp: new Date(now - 3600000 * 1.1).toISOString(),
      actor: 'contributor',
      actorName: 'Priya Sharma',
      action: 'CONTRIBUTOR_DECLINED',
      previousState: 'assigned',
      newState: 'declined',
      details: 'Contributor Priya Sharma declined assignment: "Current quarter sprint workload is at full capacity". Task requires operator recovery.',
    });

    // 3. Failed task (no match found)
    createTaskDirect({
      id: 'TASK-103',
      title: 'International Cross-Border Tax Treaty Filing',
      description: 'Prepare cross-border treaty documentation for EU-APAC subsidiaries.',
      expertiseRequired: 'Legal',
      state: 'failed',
      activeAssigneeId: null,
      createdAt: new Date(now - 3600000 * 0.8).toISOString(),
      updatedAt: new Date(now - 3600000 * 0.75).toISOString(),
      assignedAt: null,
      routingStartedAt: new Date(now - 3600000 * 0.78).toISOString(),
      routingDurationSec: 6.5,
      isStuckSimulated: false,
      routingAttempt: 1,
    });
    addHistoryEntry({
      id: 'hist_103_1',
      taskId: 'TASK-103',
      timestamp: new Date(now - 3600000 * 0.8).toISOString(),
      actor: 'operator',
      actorName: 'Operator',
      action: 'TASK_CREATED',
      previousState: null,
      newState: 'pending',
      details: 'Task created with requirement: Legal.',
    });
    addHistoryEntry({
      id: 'hist_103_2',
      taskId: 'TASK-103',
      timestamp: new Date(now - 3600000 * 0.78).toISOString(),
      actor: 'routing_engine',
      actorName: 'Routing Engine',
      action: 'ROUTING_STARTED',
      previousState: 'pending',
      newState: 'routing',
      details: 'Searching contributors for expertise: Legal.',
    });
    addHistoryEntry({
      id: 'hist_103_3',
      taskId: 'TASK-103',
      timestamp: new Date(now - 3600000 * 0.75).toISOString(),
      actor: 'routing_engine',
      actorName: 'Routing Engine',
      action: 'NO_MATCH_FOUND',
      previousState: 'routing',
      newState: 'failed',
      details: 'Routing engine completed after 6.5s: No matching contributors found with expertise Legal. Task requires operator intervention.',
    });
  }
}

// Contributor Queries
export function getAllContributors(): Contributor[] {
  const stmt = db.prepare('SELECT * FROM contributors ORDER BY name ASC');
  const rows = stmt.all() as any[];
  return rows.map((r) => ({
    ...r,
    expertise: JSON.parse(r.expertise),
  }));
}

export function getContributorById(id: string): Contributor | null {
  const stmt = db.prepare('SELECT * FROM contributors WHERE id = ?');
  const r = stmt.get(id) as any;
  if (!r) return null;
  return {
    ...r,
    expertise: JSON.parse(r.expertise),
  };
}

export function getContributorsByExpertise(expertise: string): Contributor[] {
  const all = getAllContributors();
  return all.filter((c) =>
    c.expertise.map((e) => e.toLowerCase()).includes(expertise.toLowerCase())
  );
}

export function saveContributor(contributor: Contributor): void {
  const stmt = db.prepare(`
    INSERT INTO contributors (id, name, email, title, avatar, expertise, status, maxActiveTasks)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name,
      email=excluded.email,
      title=excluded.title,
      avatar=excluded.avatar,
      expertise=excluded.expertise,
      status=excluded.status,
      maxActiveTasks=excluded.maxActiveTasks
  `);
  stmt.run(
    contributor.id,
    contributor.name,
    contributor.email,
    contributor.title,
    contributor.avatar,
    JSON.stringify(contributor.expertise),
    contributor.status,
    contributor.maxActiveTasks
  );
}

// Task Queries
export function getAllTasks(): Task[] {
  const stmt = db.prepare('SELECT * FROM tasks ORDER BY createdAt DESC');
  const rows = stmt.all() as any[];
  const contributors = getAllContributors();
  const contribMap = new Map(contributors.map((c) => [c.id, c]));

  return rows.map((row) => {
    const history = getTaskHistory(row.id);
    return {
      ...row,
      isStuckSimulated: Boolean(row.isStuckSimulated),
      activeAssignee: row.activeAssigneeId ? contribMap.get(row.activeAssigneeId) || null : null,
      history,
    };
  });
}

export function getTaskById(id: string): Task | null {
  const stmt = db.prepare('SELECT * FROM tasks WHERE id = ?');
  const row = stmt.get(id) as any;
  if (!row) return null;

  const activeAssignee = row.activeAssigneeId ? getContributorById(row.activeAssigneeId) : null;
  const history = getTaskHistory(row.id);

  return {
    ...row,
    isStuckSimulated: Boolean(row.isStuckSimulated),
    activeAssignee,
    history,
  };
}

export function createTaskDirect(task: Partial<Task> & { id: string; title: string; expertiseRequired: string; state: TaskState }): void {
  const stmt = db.prepare(`
    INSERT INTO tasks (
      id, title, description, expertiseRequired, state, activeAssigneeId,
      createdAt, updatedAt, assignedAt, routingStartedAt, routingDurationSec,
      isStuckSimulated, routingAttempt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    task.id,
    task.title,
    task.description || '',
    task.expertiseRequired,
    task.state,
    task.activeAssigneeId || null,
    task.createdAt || new Date().toISOString(),
    task.updatedAt || new Date().toISOString(),
    task.assignedAt || null,
    task.routingStartedAt || null,
    task.routingDurationSec || null,
    task.isStuckSimulated ? 1 : 0,
    task.routingAttempt || 1
  );
}

export function updateTask(id: string, updates: Partial<Task>): void {
  const existing = getTaskById(id);
  if (!existing) throw new Error(`Task ${id} not found`);

  const merged = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  const stmt = db.prepare(`
    UPDATE tasks SET
      title = ?,
      description = ?,
      expertiseRequired = ?,
      state = ?,
      activeAssigneeId = ?,
      updatedAt = ?,
      assignedAt = ?,
      routingStartedAt = ?,
      routingDurationSec = ?,
      isStuckSimulated = ?,
      routingAttempt = ?
    WHERE id = ?
  `);

  stmt.run(
    merged.title,
    merged.description,
    merged.expertiseRequired,
    merged.state,
    merged.activeAssigneeId,
    merged.updatedAt,
    merged.assignedAt,
    merged.routingStartedAt,
    merged.routingDurationSec,
    merged.isStuckSimulated ? 1 : 0,
    merged.routingAttempt,
    id
  );
}

// History Entries
export function addHistoryEntry(entry: TaskHistoryEntry): void {
  const stmt = db.prepare(`
    INSERT INTO task_history (
      id, taskId, timestamp, actor, actorName, action, previousState, newState, details, metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    entry.id,
    entry.taskId,
    entry.timestamp,
    entry.actor,
    entry.actorName,
    entry.action,
    entry.previousState || null,
    entry.newState,
    entry.details,
    entry.metadata ? JSON.stringify(entry.metadata) : null
  );
}

export function getTaskHistory(taskId: string): TaskHistoryEntry[] {
  const stmt = db.prepare('SELECT * FROM task_history WHERE taskId = ? ORDER BY timestamp ASC');
  const rows = stmt.all(taskId) as any[];
  return rows.map((r) => ({
    ...r,
    metadata: r.metadata ? JSON.parse(r.metadata) : undefined,
  }));
}

// System Stats
export function getSystemStats(): SystemStats {
  const tasks = getAllTasks();
  const contributors = getAllContributors();

  const stats: SystemStats = {
    totalTasks: tasks.length,
    pending: 0,
    routing: 0,
    stuckRouting: 0,
    assigned: 0,
    accepted: 0,
    declined: 0,
    failed: 0,
    recovered: 0,
    cancelled: 0,
    totalContributors: contributors.length,
    availableContributors: contributors.filter((c) => c.status === 'available').length,
  };

  for (const t of tasks) {
    if (t.state === 'pending') stats.pending++;
    else if (t.state === 'routing') {
      stats.routing++;
      if (t.isStuckSimulated) stats.stuckRouting++;
    } else if (t.state === 'assigned') stats.assigned++;
    else if (t.state === 'accepted') stats.accepted++;
    else if (t.state === 'declined') stats.declined++;
    else if (t.state === 'failed') stats.failed++;
    else if (t.state === 'recovered') stats.recovered++;
    else if (t.state === 'cancelled') stats.cancelled++;
  }

  return stats;
}

export function resetDatabase(): void {
  initDatabase();
  db.exec(`
    DELETE FROM task_history;
    DELETE FROM tasks;
    DELETE FROM contributors;
  `);
  seedDefaultContributors();
  seedSampleTasksIfEmpty();
}
