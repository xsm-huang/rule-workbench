import { describe, expect, it } from 'vitest'

import router from '../router'

describe('application routes', () => {
  it.each(['/login', '/schemes'])('resolves route %s', (path) => {
    const resolvedRoute = router.resolve(path)

    expect(resolvedRoute.matched.length).toBeGreaterThan(0)
  })
})
