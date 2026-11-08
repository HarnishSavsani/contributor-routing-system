import test from 'node:test';
import assert from 'node:assert/strict';
import {
  initDatabase,
  getAllTasks,
  getTaskById,
  getAllContributors,
  createTaskDirect,
  resetDatabase,
  getTaskHistory,
} from '../src/db.js';
import { routingEngine } from '../src/routingEngine.js';

test('Contributor Routing System & State Machine Tests', async (t) => {
  // Reset clean DB
  resetDatabase();

  await t.test('1. Database seeds initial contributors with expertise areas', () => {
    const contributors = getAllContributors();
    assert.ok(contributors.length >= 6, 'Should have at least 6 default contributors');
    const healthcareExpert = contributors.find((c) => c.expertise.includes('Healthcare'));
    const financeExpert = contributors.find((c) => c.expertise.includes('Finance'));
    const dataExpert = contributors.find((c) => c.expertise.includes('Data Analysis'));
    const opsExpert = contributors.find((c) => c.expertise.includes('Operations'));

    assert.ok(healthcareExpert, 'Healthcare expert should exist');
    assert.ok(financeExpert, 'Finance expert should exist');
    assert.ok(dataExpert, 'Data Analysis expert should exist');
    assert.ok(opsExpert, 'Operations expert should exist');
  });

  await t.test('2. Normal background routing matches eligible contributor', async () => {
    const taskId = 'TASK-TEST-NORMAL';
    createTaskDirect({
      id: taskId,
      title: 'Automated Portfolio Rebalancing',
      expertiseRequired: 'Finance',
      state: 'pending',
    });

    // Start routing with fast duration for test (50ms)
    routingEngine.startRouting(taskId, {
      forceStuck: false,
      customDurationMs: 50,
    });

    const pendingTask = getTaskById(taskId);
    assert.equal(pendingTask.state, 'routing');
    assert.equal(pendingTask.isStuckSimulated, false);

    // Wait for routing engine to complete
    await new Promise((r) => setTimeout(r, 120));

    const finishedTask = getTaskById(taskId);
    assert.equal(finishedTask.state, 'assigned');
    assert.ok(finishedTask.activeAssigneeId, 'Should have assigned a contributor');
    assert.ok(
      finishedTask.activeAssignee.expertise.includes('Finance'),
      'Assigned contributor must have Finance expertise'
    );

    // Verify history
    const history = getTaskHistory(taskId);
    assert.ok(history.some((h) => h.action === 'ROUTING_STARTED'));
    assert.ok(history.some((h) => h.action === 'CONTRIBUTOR_MATCHED'));
  });

  await t.test('3. Routing engine reports failure when no contributor matches expertise', async () => {
    const taskId = 'TASK-TEST-NOMATCH';
    createTaskDirect({
      id: taskId,
      title: 'Quantum Cryptographic Verification',
      expertiseRequired: 'Quantum Cryptography', // Nobody has this
      state: 'pending',
    });

    routingEngine.startRouting(taskId, {
      forceStuck: false,
      customDurationMs: 50,
    });

    await new Promise((r) => setTimeout(r, 120));

    const failedTask = getTaskById(taskId);
    assert.equal(failedTask.state, 'failed');
    assert.equal(failedTask.activeAssigneeId, null);

    const history = getTaskHistory(taskId);
    assert.ok(history.some((h) => h.action === 'NO_MATCH_FOUND'));
  });

  await t.test('4. 20% edge case: simulates hanging request that stays stuck forever', async () => {
    const taskId = 'TASK-TEST-STUCK';
    createTaskDirect({
      id: taskId,
      title: 'Hanging Simulation Job',
      expertiseRequired: 'Operations',
      state: 'pending',
    });

    // Force stuck condition
    const info = routingEngine.startRouting(taskId, {
      forceStuck: true,
    });

    assert.equal(info.isStuck, true);

    const stuckTask = getTaskById(taskId);
    assert.equal(stuckTask.state, 'routing');
    assert.equal(stuckTask.isStuckSimulated, true);

    // Wait a brief moment to ensure no background timer automatically resolved it
    await new Promise((r) => setTimeout(r, 100));

    const stillStuckTask = getTaskById(taskId);
    assert.equal(stillStuckTask.state, 'routing', 'Task must remain stuck in routing');

    const history = getTaskHistory(taskId);
    assert.ok(history.some((h) => h.action === 'ROUTING_HANG_SIMULATED'));
  });

  await t.test('5. Operator intervenes while routing is in progress (Manual Assign)', async () => {
    const taskId = 'TASK-TEST-INTERVENE-ASSIGN';
    createTaskDirect({
      id: taskId,
      title: 'Emergency Regulatory Disclosure',
      expertiseRequired: 'Healthcare',
      state: 'pending',
    });

    // Start routing with long duration
    routingEngine.startRouting(taskId, {
      forceStuck: false,
      customDurationMs: 10000,
    });

    // Operator intervenes immediately
    const contributors = getAllContributors();
    const targetContrib = contributors[0]; // Dr. Elena Vance
    routingEngine.manualAssign(taskId, targetContrib.id, 'Chief Operator', 'Priority override');

    const intervenedTask = getTaskById(taskId);
    assert.equal(intervenedTask.state, 'assigned');
    assert.equal(intervenedTask.activeAssigneeId, targetContrib.id);

    const history = getTaskHistory(taskId);
    assert.ok(history.some((h) => h.action === 'OPERATOR_MANUAL_ASSIGN'));
  });

  await t.test('6. Operator intervenes while routing is in progress (Cancel Routing)', async () => {
    const taskId = 'TASK-TEST-CANCEL';
    createTaskDirect({
      id: taskId,
      title: 'Temporary Suspended Task',
      expertiseRequired: 'Operations',
      state: 'pending',
    });

    routingEngine.startRouting(taskId, {
      forceStuck: true, // or normal
    });

    // Operator cancels
    routingEngine.cancelRouting(taskId, 'Chief Operator', 'Requirements changed');

    const cancelledTask = getTaskById(taskId);
    assert.equal(cancelledTask.state, 'cancelled');

    const history = getTaskHistory(taskId);
    assert.ok(history.some((h) => h.action === 'OPERATOR_CANCEL_ROUTING'));
  });

  await t.test('7. Contributor acceptance flow finalizes routing', async () => {
    const taskId = 'TASK-TEST-ACCEPT';
    const contributors = getAllContributors();
    const assignedContrib = contributors[1];

    createTaskDirect({
      id: taskId,
      title: 'Risk Modeling Acceptance Test',
      expertiseRequired: 'Finance',
      state: 'assigned',
      activeAssigneeId: assignedContrib.id,
    });

    // Contributor accepts
    routingEngine.contributorAccept(taskId, assignedContrib.id);

    const acceptedTask = getTaskById(taskId);
    assert.equal(acceptedTask.state, 'accepted');
    assert.equal(acceptedTask.activeAssigneeId, assignedContrib.id);

    const history = getTaskHistory(taskId);
    assert.ok(history.some((h) => h.action === 'CONTRIBUTOR_ACCEPTED'));
  });

  await t.test('8. Contributor declines assignment -> task eligible for operator recovery', async () => {
    const taskId = 'TASK-TEST-DECLINE';
    const contributors = getAllContributors();
    const assignedContrib = contributors[2];

    createTaskDirect({
      id: taskId,
      title: 'Data Pipeline Optimization',
      expertiseRequired: 'Data Analysis',
      state: 'assigned',
      activeAssigneeId: assignedContrib.id,
    });

    // Contributor declines
    routingEngine.contributorDecline(taskId, 'Overloaded with Q3 deadline');

    const declinedTask = getTaskById(taskId);
    assert.equal(declinedTask.state, 'declined');
    assert.equal(declinedTask.activeAssigneeId, null, 'Assignee must be cleared on decline');

    // Operator recovers task and re-routes
    routingEngine.recoverTask(taskId, 'reroute', {
      operatorName: 'Operator',
      customDurationMs: 50,
      forceStuck: false,
    });

    const recoveringTask = getTaskById(taskId);
    assert.equal(recoveringTask.routingAttempt, 2);

    await new Promise((r) => setTimeout(r, 120));

    const reAssignedTask = getTaskById(taskId);
    assert.equal(reAssignedTask.state, 'assigned');
    assert.ok(reAssignedTask.activeAssigneeId);

    const history = getTaskHistory(taskId);
    assert.ok(history.some((h) => h.action === 'CONTRIBUTOR_DECLINED'));
    assert.ok(history.some((h) => h.action === 'OPERATOR_RECOVER'));
  });

  await t.test('9. Full Audit Log / Timeline integrity check', () => {
    const taskId = 'TASK-TEST-NORMAL';
    const history = getTaskHistory(taskId);
    assert.ok(history.length >= 2, 'History must have multiple entries');
    for (const entry of history) {
      assert.ok(entry.id);
      assert.ok(entry.timestamp);
      assert.ok(entry.actor);
      assert.ok(entry.actorName);
      assert.ok(entry.action);
      assert.ok(entry.newState);
      assert.ok(entry.details);
    }
  });
});

