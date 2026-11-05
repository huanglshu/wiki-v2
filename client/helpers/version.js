import semverCompare from 'semver/functions/compare'
import semverValid from 'semver/functions/valid'

function parseVersion (version) {
  if (typeof version !== 'string') return null

  const parts = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(version)
  const base = parts ? `${parts[1]}.${parts[2]}.${parts[3]}` : version
  const normalized = semverValid(base)
  return normalized ? { version: normalized, revision: parts ? parts[4] : '0' } : null
}

export function isLatestVersion (current, latest) {
  const currentVersion = parseVersion(current)
  const latestVersion = parseVersion(latest)
  if (!currentVersion || !latestVersion) return null

  const comparison = semverCompare(currentVersion.version, latestVersion.version)
  if (comparison !== 0) return comparison > 0
  if (currentVersion.revision.length !== latestVersion.revision.length) {
    return currentVersion.revision.length > latestVersion.revision.length
  }
  return currentVersion.revision >= latestVersion.revision
}
