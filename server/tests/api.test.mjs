import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/index.js';

let serverInstance;
let BASE_URL;

test('API Integration Tests', async (t) => {
  await new Promise((resolve) => {
    // Listen on dynamic ephemeral port
    serverInstance = app.listen(0, () => {
      const addr = serverInstance.address();
      const port = typeof addr === 'string' ? addr : addr.port;
      BASE_URL = `http://localhost:${port}`;
      resolve();
    });
  });

  t.after(() => {
    if (serverInstance) {
      serverInstance.close();
    }
  });

  let createdTaskId = null;

  await t.test('GET /api/tasks returns seeded tasks and stats', async () => {
    const res = await fetch(`${BASE_URL}/api/tasks`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.tasks));
    assert.ok(body.stats);
    assert.ok(body.tasks.length > 0);
  });

  await t.test('POST /api/tasks creates new task and initiates background routing', async () => {
    const payload = {
      title: 'Real-time Hospital Resource Triage',
      description: 'Optimize bed allocation algorithms for surgical ward.',
      expertiseRequired: 'Healthcare',
      autoRoute: true,
      customDurationMs: 80, // fast for testing
      forceStuck: false,
    };
    const res = await fetch(`${BASE_URL}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.ok(body.task.id);
    createdTaskId = body.task.id;
    assert.equal(body.task.expertiseRequired, 'Healthcare');

    // Wait for background routing completion
    await new Promise((r) => setTimeout(r, 140));

    const checkRes = await fetch(`${BASE_URL}/api/tasks/${createdTaskId}`);
    const checkBody = await checkRes.json();
    assert.equal(checkBody.task.state, 'assigned');
    assert.ok(checkBody.task.activeAssigneeId);
  });

  await t.test('POST /api/tasks/:id/contributor-action (accept) finalizes assignment', async () => {
    const res = await fetch(`${BASE_URL}/api/tasks/${createdTaskId}/contributor-action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'accept' }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.task.state, 'accepted');
  });

  await t.test('Simulate Contributor Decline and Operator Recovery workflow', async () => {
    // 1. Create task
    const createRes = await fetch(`${BASE_URL}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Credit Risk Stress Test Analysis',
        expertiseRequired: 'Finance',
        autoRoute: true,
        customDurationMs: 50,
        forceStuck: false,
      }),
    });
    const { task } = await createRes.json();
    await new Promise((r) => setTimeout(r, 100));

    // 2. Decline
    const declineRes = await fetch(`${BASE_URL}/api/tasks/${task.id}/contributor-action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'decline', reason: 'Conflict of interest' }),
    });
    const declinedBody = await declineRes.json();
    assert.equal(declinedBody.task.state, 'declined');
    assert.equal(declinedBody.task.activeAssigneeId, null);

    // 3. Operator Recovers task and routes again
    const recoverRes = await fetch(`${BASE_URL}/api/tasks/${task.id}/recover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'reroute',
        customDurationMs: 50,
        forceStuck: false,
        reason: 'Re-routing after decline',
      }),
    });
    assert.equal(recoverRes.status, 200);

    await new Promise((r) => setTimeout(r, 100));
    const reAssignedRes = await fetch(`${BASE_URL}/api/tasks/${task.id}`);
    const reAssignedBody = await reAssignedRes.json();
    assert.equal(reAssignedBody.task.state, 'assigned');
    assert.ok(reAssignedBody.task.activeAssigneeId);
  });

  await t.test('Operator Intervene: Abort/Cancel and Manual Assignment', async () => {
    // Create stuck task
    const createRes = await fetch(`${BASE_URL}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Long-running Financial Simulation',
        expertiseRequired: 'Finance',
        autoRoute: true,
        forceStuck: true,
      }),
    });
    const { task } = await createRes.json();

    // Check it's stuck in routing
    const taskRes = await fetch(`${BASE_URL}/api/tasks/${task.id}`);
    const taskBody = await taskRes.json();
    assert.equal(taskBody.task.state, 'routing');
    assert.equal(taskBody.task.isStuckSimulated, true);

    // Intervene: Manual assign
    const contribsRes = await fetch(`${BASE_URL}/api/contributors`);
    const { contributors } = await contribsRes.json();
    const target = contributors.find((c) => c.expertise.includes('Finance'));

    const interveneRes = await fetch(`${BASE_URL}/api/tasks/${task.id}/intervene`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'manual_assign',
        contributorId: target.id,
        reason: 'Operator intervention on stuck request',
      }),
    });
    const interveneBody = await interveneRes.json();
    assert.equal(interveneBody.task.state, 'assigned');
    assert.equal(interveneBody.task.activeAssigneeId, target.id);

    // Audit log verifies the entire flow
    const historyRes = await fetch(`${BASE_URL}/api/tasks/${task.id}/history`);
    const { history } = await historyRes.json();
    assert.ok(history.some((h) => h.action === 'ROUTING_HANG_SIMULATED'));
    assert.ok(history.some((h) => h.action === 'OPERATOR_MANUAL_ASSIGN'));
  });

  await t.test('GET /api/simulation/config & POST /api/simulation/config', async () => {
    const res = await fetch(`${BASE_URL}/api/simulation/config`);
    const config = await res.json();
    assert.equal(config.stuckProbability, 0.20);

    const updateRes = await fetch(`${BASE_URL}/api/simulation/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ minDurationMs: 6000, maxDurationMs: 18000, stuckProbability: 0.25 }),
    });
    const updated = await updateRes.json();
    assert.equal(updated.config.minDurationMs, 6000);
    assert.equal(updated.config.maxDurationMs, 18000);
    assert.equal(updated.config.stuckProbability, 0.25);

    // Reset back to standard specs
    await fetch(`${BASE_URL}/api/simulation/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ minDurationMs: 5000, maxDurationMs: 20000, stuckProbability: 0.20 }),
    });
  });
});

