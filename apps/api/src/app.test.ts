import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import type { ReportDTO } from '@civiccircle/shared';

import { createApp } from './app';
import { auth, createTestDeps, makeImage, type TestDeps } from './test/helpers';

let deps: TestDeps;
let app: ReturnType<typeof createApp>;
let photo: Buffer;

beforeEach(async () => {
  deps = createTestDeps();
  app = createApp(deps);
  photo ??= await makeImage();
});

async function postReport(
  description: string,
  user = 'resident-1',
  location = { lat: 51.5033, lng: -0.0866 },
) {
  return request(app)
    .post('/v1/reports')
    .set(auth(user, 'Resident One'))
    .field('description', description)
    .field('lat', String(location.lat))
    .field('lng', String(location.lng))
    .attach('photo', photo, { filename: 'photo.jpg', contentType: 'image/jpeg' });
}

async function makeModerator(id = 'mod-1') {
  await deps.store.users.ensure({
    id,
    displayName: 'Mod',
    role: 'moderator',
    email: null,
    isDemo: false,
  });
  return auth(id);
}

describe('health', () => {
  it('reports the active AI provider', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, aiProvider: 'mock', version: 'test' });
  });
});

describe('auth', () => {
  it('rejects writes without a token and with a bad token', async () => {
    expect((await request(app).post('/v1/reports/x/upvote')).status).toBe(401);
    const bad = await request(app).get('/v1/me').set('Authorization', 'Bearer bad');
    expect(bad.status).toBe(401);
    expect(bad.body.error.code).toBe('unauthorized');
  });

  it('provisions a resident profile on first request', async () => {
    const res = await request(app).get('/v1/me').set(auth('new-user', 'Priya'));
    expect(res.body).toEqual({
      id: 'new-user',
      displayName: 'Priya',
      role: 'resident',
      email: 'new-user@example.test',
      isDemo: false,
    });
  });

  it('issues demo tokens and can be switched off per role', async () => {
    const res = await request(app).post('/v1/auth/demo').send({ as: 'moderator' });
    expect(res.body).toEqual({ customToken: 'custom-token-for-demo-moderator' });
    expect((await deps.store.users.get('demo-moderator'))?.role).toBe('moderator');

    const locked = createApp(createTestDeps({ env: { DEMO_MODERATOR_ENABLED: 'false' } }));
    expect((await request(locked).post('/v1/auth/demo').send({ as: 'moderator' })).status).toBe(
      403,
    );
    expect((await request(locked).post('/v1/auth/demo').send({})).status).toBe(200);
  });

  it('lets users rename themselves but not demo accounts', async () => {
    const ok = await request(app)
      .patch('/v1/me')
      .set(auth('u2'))
      .send({ displayName: '  Jordan ' });
    expect(ok.body.displayName).toBe('Jordan');
    await request(app).post('/v1/auth/demo').send({});
    const demo = await request(app)
      .patch('/v1/me')
      .set(auth('demo-resident'))
      .send({ displayName: 'Hacker' });
    expect(demo.status).toBe(403);
  });
});

describe('creating reports', () => {
  it('stores the photo and returns the AI triage', async () => {
    const res = await postReport('Deep pothole on Tooley Street, a cyclist nearly fell off');
    expect(res.status).toBe(201);
    const report = res.body as ReportDTO;
    expect(report).toMatchObject({
      category: 'roads',
      severity: 'high',
      status: 'open',
      summary: 'Deep pothole on Tooley Street, a cyclist nearly fell off',
      author: { id: 'resident-1', displayName: 'Resident One', role: 'resident' },
      ai: { provider: 'mock', model: 'heuristic-v1' },
      duplicates: [],
      upvoteCount: 0,
    });
    expect(report.photoUrl).toMatch(/^https:\/\/photos\.test\/reports\/.+\.jpg$/);
    expect(deps.photos.files.size).toBe(1);
    expect(report.statusHistory).toHaveLength(1);
  });

  it('flags a nearby duplicate', async () => {
    const first = await postReport('Large pothole by the bus stop on Tooley Street');
    const second = await postReport('Huge potholes outside the Tooley St bus stop', 'resident-2', {
      lat: 51.5035,
      lng: -0.0866,
    });
    expect(second.body.duplicates).toEqual([
      expect.objectContaining({ id: first.body.id, status: 'open', distanceM: 22 }),
    ]);
  });

  it('validates fields and the photo', async () => {
    const short = await postReport('hole');
    expect(short.status).toBe(400);
    expect(short.body.error.details.description).toBeDefined();

    const noPhoto = await request(app)
      .post('/v1/reports')
      .set(auth('u'))
      .field('description', 'A long enough description')
      .field('lat', '51.5')
      .field('lng', '-0.1');
    expect(noPhoto.status).toBe(400);
    expect(noPhoto.body.error.details.photo).toBeDefined();

    const fake = await request(app)
      .post('/v1/reports')
      .set(auth('u'))
      .field('description', 'A long enough description')
      .field('lat', '51.5')
      .field('lng', '-0.1')
      .attach('photo', Buffer.from('not an image'), {
        filename: 'x.jpg',
        contentType: 'image/jpeg',
      });
    expect(fake.status).toBe(415);

    const wrongType = await request(app)
      .post('/v1/reports')
      .set(auth('u'))
      .field('description', 'A long enough description')
      .field('lat', '51.5')
      .field('lng', '-0.1')
      .attach('photo', Buffer.from('<svg/>'), { filename: 'x.svg', contentType: 'image/svg+xml' });
    expect(wrongType.status).toBe(415);
  });

  it('rejects content that fails moderation without storing the photo', async () => {
    const res = await postReport("I'm going to hurt whoever keeps dumping rubbish here");
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('content_rejected');
    expect(deps.photos.files.size).toBe(0);
  });
});

describe('reading reports', () => {
  it('lists with filters, pagination and the viewer upvote flag', async () => {
    const a = (await postReport('Streetlight out on Union Street')).body as ReportDTO;
    const b = (await postReport('Overflowing bins by the station entrance')).body as ReportDTO;
    await request(app).post(`/v1/reports/${a.id}/upvote`).set(auth('viewer'));

    const page1 = await request(app).get('/v1/reports?limit=1').set(auth('viewer'));
    expect(page1.body.items.map((r: ReportDTO) => r.id)).toEqual([b.id]);
    const page2 = await request(app)
      .get(`/v1/reports?limit=1&cursor=${page1.body.nextCursor}`)
      .set(auth('viewer'));
    expect(page2.body.items[0]).toMatchObject({ id: a.id, viewerHasUpvoted: true, upvoteCount: 1 });

    const top = await request(app).get('/v1/reports?sort=top');
    expect(top.body.items[0].id).toBe(a.id);
    const lighting = await request(app).get('/v1/reports?category=lighting');
    expect(lighting.body.items.map((r: ReportDTO) => r.id)).toEqual([a.id]);

    expect((await request(app).get('/v1/reports?category=nope')).status).toBe(400);
    expect((await request(app).get('/v1/reports?mine=true')).status).toBe(401);
    expect((await request(app).get('/v1/reports?cursor=garbage')).status).toBe(400);
  });

  it('returns map markers within a radius', async () => {
    const near = (await postReport('Graffiti on the railway bridge')).body as ReportDTO;
    await postReport('Graffiti in a different town', 'resident-1', { lat: 52.2, lng: 0.12 });
    const res = await request(app).get('/v1/reports/nearby?lat=51.5033&lng=-0.0866&radiusKm=2');
    expect(res.body.items).toEqual([
      expect.objectContaining({ id: near.id, category: 'graffiti', location: near.location }),
    ]);
    expect((await request(app).get('/v1/reports/nearby?lat=200&lng=0')).status).toBe(400);
  });

  it('404s unknown reports and rejects malformed ids', async () => {
    expect((await request(app).get('/v1/reports/unknown')).status).toBe(404);
    expect((await request(app).get('/v1/reports/a%2Fb')).status).toBe(400);
  });
});

describe('upvotes and comments', () => {
  it('toggles an upvote', async () => {
    const { id } = (await postReport('Broken bench in the park')).body as ReportDTO;
    const up = await request(app).post(`/v1/reports/${id}/upvote`).set(auth('v'));
    expect(up.body).toEqual({ upvoted: true, upvoteCount: 1 });
    const down = await request(app).post(`/v1/reports/${id}/upvote`).set(auth('v'));
    expect(down.body).toEqual({ upvoted: false, upvoteCount: 0 });
  });

  it('adds and lists comments and keeps the count in sync', async () => {
    const { id } = (await postReport('Broken bench in the park')).body as ReportDTO;
    const created = await request(app)
      .post(`/v1/reports/${id}/comments`)
      .set(auth('neighbour', 'Neighbour'))
      .send({ body: '  Same here, it wobbles  ' });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      body: 'Same here, it wobbles',
      author: { displayName: 'Neighbour' },
    });

    const list = await request(app).get(`/v1/reports/${id}/comments`);
    expect(list.body.items).toHaveLength(1);
    expect((await request(app).get(`/v1/reports/${id}`)).body.commentCount).toBe(1);

    const empty = await request(app)
      .post(`/v1/reports/${id}/comments`)
      .set(auth('n'))
      .send({ body: ' ' });
    expect(empty.status).toBe(400);
    const missing = await request(app)
      .post('/v1/reports/nope/comments')
      .set(auth('n'))
      .send({ body: 'hi' });
    expect(missing.status).toBe(404);
  });
});

describe('moderation workflow', () => {
  it('only lets moderators change status, following the workflow', async () => {
    const { id } = (await postReport('Streetlight out on Union Street')).body as ReportDTO;
    const resident = await request(app)
      .patch(`/v1/reports/${id}/status`)
      .set(auth('resident-1'))
      .send({ status: 'resolved' });
    expect(resident.status).toBe(403);

    const mod = await makeModerator();
    const ack = await request(app)
      .patch(`/v1/reports/${id}/status`)
      .set(mod)
      .send({ status: 'in_progress', note: 'Engineer booked for Tuesday' });
    expect(ack.body.status).toBe('in_progress');
    expect(ack.body.statusHistory.at(-1)).toMatchObject({
      status: 'in_progress',
      note: 'Engineer booked for Tuesday',
      by: { id: 'mod-1', displayName: 'Mod' },
    });

    await request(app).patch(`/v1/reports/${id}/status`).set(mod).send({ status: 'resolved' });
    const invalid = await request(app)
      .patch(`/v1/reports/${id}/status`)
      .set(mod)
      .send({ status: 'in_progress' });
    expect(invalid.status).toBe(409);
  });

  it('links confirmed duplicates to the original', async () => {
    const original = (await postReport('Pothole by the bus stop on Tooley Street'))
      .body as ReportDTO;
    const copy = (await postReport('Another pothole report for Tooley Street bus stop'))
      .body as ReportDTO;
    const mod = await makeModerator();
    const self = await request(app)
      .patch(`/v1/reports/${copy.id}/status`)
      .set(mod)
      .send({ status: 'duplicate', duplicateOf: copy.id });
    expect(self.status).toBe(400);
    const res = await request(app)
      .patch(`/v1/reports/${copy.id}/status`)
      .set(mod)
      .send({ status: 'duplicate', duplicateOf: original.id });
    expect(res.body).toMatchObject({ status: 'duplicate', duplicateOf: original.id });
  });

  it('exposes AI usage to moderators only', async () => {
    expect((await request(app).get('/v1/admin/ai-usage').set(auth('r'))).status).toBe(403);
    const res = await request(app)
      .get('/v1/admin/ai-usage')
      .set(await makeModerator());
    expect(res.body).toMatchObject({ spentUsd: 0, budgetUsd: 5, provider: 'mock' });
  });
});

describe('rate limiting', () => {
  it('limits report creation per IP', async () => {
    const limited = createTestDeps({ env: { RATE_LIMIT_REPORTS_PER_HOUR: '2' } });
    app = createApp(limited);
    deps = limited;
    expect((await postReport('Pothole number one on the high street')).status).toBe(201);
    expect((await postReport('Pothole number two on the high street')).status).toBe(201);
    const third = await postReport('Pothole number three on the high street');
    expect(third.status).toBe(429);
    expect(third.body.error.code).toBe('rate_limited');
    expect(third.headers['ratelimit-policy']).toBeDefined();
  });

  it('limits demo sign-ins per IP', async () => {
    app = createApp(createTestDeps({ env: { RATE_LIMIT_DEMO_PER_15M: '1' } }));
    expect((await request(app).post('/v1/auth/demo').send({})).status).toBe(200);
    expect((await request(app).post('/v1/auth/demo').send({})).status).toBe(429);
  });
});

it('returns JSON errors for unknown routes and bad JSON', async () => {
  expect((await request(app).get('/nope')).body.error.code).toBe('not_found');
  const res = await request(app)
    .patch('/v1/me')
    .set(auth('u'))
    .set('Content-Type', 'application/json')
    .send('{bad json');
  expect(res.status).toBe(400);
});
