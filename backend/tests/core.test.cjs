const test = require('node:test');
const assert = require('node:assert/strict');

const { calculateDijkstraPath } = require('../dist/utils/dijkstra.js');
const { hospitalSupportsFacility } = require('../dist/utils/facilityMatching.js');
const { requireRole } = require('../dist/middleware/authMiddleware.js');
const { registerUser, updateUserName } = require('../dist/store/userStore.js');

const openRoad = (startLocation, endLocation, baseTravelTimeMinutes, options = {}) => ({
  startLocation,
  endLocation,
  distanceKm: 1,
  baseTravelTimeMinutes,
  currentTraffic: 'LOW',
  status: 'OPEN',
  ...options,
});

test('Dijkstra chooses the lowest configured travel-time route and respects one-way roads', () => {
  const result = calculateDijkstraPath([
    openRoad('A', 'B', 2, { isOneWay: true }),
    openRoad('B', 'C', 3),
    openRoad('A', 'C', 9),
  ], 'A', 'C');

  assert.equal(result.reachable, true);
  assert.deepEqual(result.path, ['A', 'B', 'C']);
  assert.equal(result.totalTimeMinutes, 5);
  assert.equal(calculateDijkstraPath([
    openRoad('A', 'B', 2, { isOneWay: true }),
  ], 'B', 'A').reachable, false);
});

test('Dijkstra reports an unreachable route without inventing distance or time', () => {
  const result = calculateDijkstraPath([openRoad('A', 'B', 2)], 'A', 'C');
  assert.deepEqual(result, {
    reachable: false,
    path: [],
    totalDistanceKm: 0,
    totalTimeMinutes: 0,
    trafficDelayMinutes: 0,
  });
});

test('configured traffic overrides are applied to route estimates', () => {
  const result = calculateDijkstraPath([
    openRoad('A', 'B', 2, { currentTraffic: 'HEAVY', currentTravelTimeMinutes: 7 }),
  ], 'A', 'B');
  assert.equal(result.totalTimeMinutes, 7);
});

test('hospital matching requires the requested specialty', () => {
  assert.equal(hospitalSupportsFacility('TRAUMA', ['Trauma Bay']), true);
  assert.equal(hospitalSupportsFacility('CARDIAC', ['Trauma Bay']), false);
  assert.equal(hospitalSupportsFacility('GENERAL', []), true);
});

test('backend role middleware rejects dispatch operators from administrator endpoints', () => {
  let statusCode;
  let responseBody;
  let nextCalled = false;
  const response = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      responseBody = body;
      return this;
    },
  };

  requireRole(['ADMIN'])({ user: { role: 'DISPATCHER' } }, response, () => { nextCalled = true; });
  assert.equal(statusCode, 403);
  assert.equal(responseBody.success, false);
  assert.equal(nextCalled, false);

  let adminNextCalled = false;
  requireRole(['ADMIN'])({ user: { role: 'ADMIN' } }, response, () => { adminNextCalled = true; });
  assert.equal(adminNextCalled, true);
});

test('invalid signup and profile inputs are rejected before any database write', async () => {
  await assert.rejects(registerUser({
    fullName: 'Test Operator',
    email: 'test-operator@example.invalid',
    password: 'short',
    confirmPassword: 'short',
    role: 'ADMIN',
  }), /at least 8 characters/i);
  await assert.rejects(updateUserName('unused-test-user-id', ' '), /between 2 and 100 characters/i);
});
