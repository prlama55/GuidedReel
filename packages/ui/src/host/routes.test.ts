import { describe, expect, it } from 'vitest';
import { pathToRoute, routeToPath } from './types';

describe('routes', () => {
  it('round-trips every route', () => {
    for (const r of [
      { name: 'dashboard' },
      { name: 'projects' },
      { name: 'templates' },
      { name: 'assets' },
      { name: 'renders' },
      { name: 'settings' },
      { name: 'editor', projectId: 'prj_1' },
    ] as const) {
      expect(pathToRoute(routeToPath(r))).toEqual(r);
    }
    expect(pathToRoute('/nope')).toEqual({ name: 'dashboard' });
    expect(pathToRoute('/editor/a%20b/')).toEqual({ name: 'editor', projectId: 'a b' });
  });
});
