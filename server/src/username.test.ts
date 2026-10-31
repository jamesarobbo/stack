import { describe, expect, it } from 'vitest';
import { createTestEnv, ensureUsername, json, request, signIn } from '../test/env';

const magnesium = {
  id: 'mag',
  name: 'Magnesium glycinate',
  brand: 'Acme',
  servingsPerContainer: 60,
  servingsPerDay: 1,
  ingredients: [{ key: 'magnesium', name: 'Magnesium', amount: 200, unit: 'mg' }],
};

describe('usernames', () => {
  it('requires a username before a stack can be shared', async () => {
    const { env } = createTestEnv();
    const token = await signIn(env, 'maker@example.com');
    const response = await request(env, '/v1/shares', { method: 'POST', token, body: { products: [magnesium] } });
    expect(response.status).toBe(400);
    expect(await json<{ error: string }>(response)).toEqual({ error: 'Choose a username before sharing.' });
  });

  it('keeps usernames unique without regard to case, and hides why a name is blocked', async () => {
    const { env, sqlite } = createTestEnv();
    const first = await signIn(env, 'one@example.com');
    const taken = await request(env, '/v1/me/username', { method: 'PUT', token: first, body: { username: 'Sam_Lifts' } });
    expect(taken.status).toBe(200);
    expect(await json<{ username: string }>(taken)).toEqual({ username: 'sam_lifts' });
    const stored = sqlite.prepare('SELECT username FROM users WHERE email = ?').get('one@example.com') as { username: string };
    expect(stored.username).toBe('sam_lifts');

    const second = await signIn(env, 'two@example.com');
    const check = await json<{ available: boolean; error?: string }>(
      await request(env, '/v1/usernames/available?name=sam_lifts', { token: second }),
    );
    expect(check).toEqual({ available: false, error: 'That username is not available.' });
    const again = await request(env, '/v1/me/username', { method: 'PUT', token: second, body: { username: 'SAM_LIFTS' } });
    expect(again.status).toBe(400);
    expect((await json<{ error: string }>(again)).error).toBe('That username is not available.');

    const own = await json<{ available: boolean }>(await request(env, '/v1/usernames/available?name=@Sam_Lifts', { token: first }));
    expect(own.available).toBe(true);

    for (const name of ['admin', 'stack_admin', 'xxwhore', 'ab', 'a name']) {
      const response = await request(env, '/v1/me/username', { method: 'PUT', token: second, body: { username: name } });
      const body = await json<{ error: string }>(response);
      expect(response.status).toBe(400);
      expect(body.error).not.toMatch(/reserved|offensive|taken/i);
      if (name === 'ab' || name === 'a name') expect(body.error).toBe('Use 3 to 20 letters, numbers, or underscores.');
      else expect(body.error).toBe('That username is not available.');
    }
  });

  it('limits username changes and leaves the current name free to save again', async () => {
    const { env } = createTestEnv();
    const token = await signIn(env, 'maker@example.com');
    for (let index = 1; index <= 5; index += 1) {
      const saved = await request(env, '/v1/me/username', { method: 'PUT', token, body: { username: `lifter_${index}` } });
      expect(saved.status).toBe(200);
    }
    const same = await request(env, '/v1/me/username', { method: 'PUT', token, body: { username: 'lifter_5' } });
    expect(same.status).toBe(200);
    const blocked = await request(env, '/v1/me/username', { method: 'PUT', token, body: { username: 'lifter_6' } });
    expect(blocked.status).toBe(429);
  });

  it('shows the username on shares, updates it everywhere, and does not index a real name', async () => {
    const { env, sqlite } = createTestEnv();
    const token = await signIn(env, 'maker@example.com');
    await request(env, '/v1/me/profile', { method: 'PUT', token, body: { displayName: 'Penelope' } });
    await ensureUsername(env, token, 'sam_lifts');
    const share = await json<{ slug: string }>(
      await request(env, '/v1/shares', { method: 'POST', token, body: { products: [magnesium], listed: true, displayName: 'Penelope' } }),
    );
    const row = sqlite.prepare('SELECT creator_name, snapshot FROM shares WHERE slug = ?').get(share.slug) as {
      creator_name: string;
      snapshot: string;
    };
    expect(row.creator_name).toBe('sam_lifts');
    expect(row.snapshot).not.toContain('Penelope');

    const page = await (await request(env, `/s/${share.slug}`)).text();
    expect(page).toContain('@sam_lifts');
    expect(page).not.toContain('Penelope');
    const svg = await (await request(env, `/s/${share.slug}/og.svg`)).text();
    expect(svg).toContain('@sam_lifts');
    expect(svg).not.toContain('Penelope');
    const story = await (await request(env, `/s/${share.slug}/story.svg`)).text();
    expect(story).toContain('@sam_lifts');
    expect(story).not.toContain('Penelope');

    const byName = await json<{ items: { stackName: string }[] }>(await request(env, '/v1/library?q=penelope'));
    expect(byName.items).toHaveLength(0);
    const byHandle = await json<{ items: { creatorName: string | null }[] }>(await request(env, '/v1/library?q=sam_lifts'));
    expect(byHandle.items[0]?.creatorName).toBe('@sam_lifts');

    const renamed = await request(env, '/v1/me/username', { method: 'PUT', token, body: { username: 'nova_lifts' } });
    expect(renamed.status).toBe(200);
    const listed = await json<{ items: { creatorName: string | null }[] }>(await request(env, '/v1/library?q=nova'));
    expect(listed.items[0]?.creatorName).toBe('@nova_lifts');
    const stale = await json<{ items: unknown[] }>(await request(env, '/v1/library?q=sam_lifts'));
    expect(stale.items).toHaveLength(0);
    const after = await (await request(env, `/s/${share.slug}`)).text();
    expect(after).toContain('@nova_lifts');
    expect(after).not.toContain('@sam_lifts');

    sqlite.prepare('UPDATE users SET username = NULL WHERE email = ?').run('maker@example.com');
    sqlite.prepare("UPDATE shares SET creator_name = ''").run();
    sqlite.prepare('DELETE FROM share_search').run();
    const legacy = await (await request(env, `/s/${share.slug}`)).text();
    expect(legacy).toContain('A Stack user');
    expect(legacy).not.toContain('@nova_lifts');
    expect(legacy).not.toContain('Penelope');
    const hidden = await json<{ items: unknown[] }>(await request(env, '/v1/library?q=penelope'));
    expect(hidden.items).toHaveLength(0);
  });
});
