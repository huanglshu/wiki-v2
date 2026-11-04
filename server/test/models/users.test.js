const Users = require('../../models/users')

describe('models/users', () => {
  function createUser(groups) {
    const user = Object.create(Users.prototype)
    user.groups = groups
    return user
  }

  describe('getLoginRedirect', () => {
    it('uses the first configured group redirect that is not the site root', () => {
      const user = createUser([
        { id: 1, redirectOnLogin: '/' },
        { id: 2, redirectOnLogin: '/zh/home' },
        { id: 3, redirectOnLogin: '/zh/guide' }
      ])

      expect(user.getLoginRedirect()).toBe('/zh/home')
    })

    it('falls back to the site root when no group has a redirect', () => {
      const user = createUser([
        { id: 1, redirectOnLogin: '/' },
        { id: 2, redirectOnLogin: '' }
      ])

      expect(user.getLoginRedirect()).toBe('/')
    })
  })
})
