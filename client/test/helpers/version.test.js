import { isLatestVersion } from '../../helpers/version'

describe('version comparison', () => {
  it.each([
    ['2.5.317.1', '2.5.317.1', true],
    ['2.5.317.1', '2.5.317', true],
    ['2.5.317', '2.5.317.1', false],
    ['2.5.317.2', '2.5.317.10', false],
    ['2.5.317.10000000000000000000', '2.5.317.9999999999999999999', true],
    ['2.5.317.999', '2.5.318', false],
    ['2.5.317-rc.1', '2.5.317', false],
    ['2.5.317+build.1', '2.5.317+build.2', true],
    ['n/a', '2.5.317', null],
    ['2.5.317.1', 'n/a', null],
    ['2.5.317.1.2', '2.5.317', null],
    [null, '2.5.317', null]
  ])('compares %s against %s', (current, latest, expected) => {
    expect(isLatestVersion(current, latest)).toBe(expected)
  })
})
