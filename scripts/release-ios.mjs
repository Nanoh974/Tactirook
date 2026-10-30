// SPDX-License-Identifier: MPL-2.0
// Bumps the app version through a PR, tags the merge commit and follows the
// TestFlight build. Usage: npm run release:ios -- [patch|minor|major|X.Y.Z] [--yes] [--dry-run]
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { createInterface } from 'node:readline/promises'

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const assumeYes = args.includes('--yes')
const bump = args.find((a) => !a.startsWith('--')) ?? 'patch'

const run = (cmd, cmdArgs) =>
  execFileSync(cmd, cmdArgs, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim()
const live = (cmd, cmdArgs) => execFileSync(cmd, cmdArgs, { stdio: 'inherit' })
const step = (msg) => console.log(`\n▶ ${msg}`)
const fail = (msg) => {
  console.error(`\n✖ ${msg}`)
  process.exit(1)
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function nextVersion(current, kind) {
  if (/^\d+\.\d+\.\d+$/.test(kind)) return kind
  const [major, minor, patch] = current.split('.').map(Number)
  if (kind === 'major') return `${major + 1}.0.0`
  if (kind === 'minor') return `${major}.${minor + 1}.0`
  if (kind === 'patch') return `${major}.${minor}.${patch + 1}`
  fail(`Unknown version "${kind}". Use patch, minor, major or X.Y.Z.`)
}

const isGreater = (a, b) => {
  const [x, y] = [a, b].map((v) => v.split('.').map(Number))
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i]
  return false
}

step('Checking prerequisites')
try {
  execFileSync('gh', ['auth', 'status'], { stdio: 'ignore' })
} catch (error) {
  fail(error.code === 'ENOENT' ? 'GitHub CLI not found. Install it: brew install gh' : 'GitHub CLI is not logged in. Run: gh auth login')
}
if (run('git', ['branch', '--show-current']) !== 'main') fail('Switch to main first: git checkout main')
if (run('git', ['status', '--porcelain'])) fail('Working tree is not clean. Commit or stash your changes first.')
run('git', ['fetch', '--quiet', 'origin', 'main', '--tags'])
if (run('git', ['rev-parse', 'HEAD']) !== run('git', ['rev-parse', 'origin/main'])) {
  fail('Local main differs from origin/main. Run: git pull --ff-only')
}

const appJsonText = readFileSync('app.json', 'utf8')
const current = JSON.parse(appJsonText).expo.version
const version = nextVersion(current, bump)
const tag = `v${version}`
if (!isGreater(version, current)) fail(`New version ${version} must be greater than ${current}.`)
if (run('git', ['ls-remote', '--tags', 'origin', `refs/tags/${tag}`])) fail(`Tag ${tag} already exists on GitHub.`)

const branch = `release/${tag}`
console.log(`  ${current} → ${version} (tag ${tag}, branch ${branch})`)
if (dryRun) {
  console.log('\nDry run: nothing changed.')
  process.exit(0)
}
if (!assumeYes) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const answer = await rl.question(`\nRelease ${tag} to TestFlight? [y/N] `)
  rl.close()
  if (!/^y(es)?$/i.test(answer.trim())) fail('Cancelled.')
}

step(`Bumping version to ${version}`)
run('git', ['switch', '--quiet', '-c', branch])
const updatedAppJson = appJsonText.replace(/("version"\s*:\s*")[^"]+(")/, `$1${version}$2`)
if (JSON.parse(updatedAppJson).expo.version !== version) fail('Could not update expo.version in app.json.')
writeFileSync('app.json', updatedAppJson)
run('npm', ['version', version, '--no-git-tag-version', '--allow-same-version'])
run('git', ['add', 'app.json', 'package.json', 'package-lock.json'])
run('git', ['commit', '--quiet', '-m', `Release ${tag}`])

step('Opening the release pull request')
run('git', ['push', '--quiet', '-u', 'origin', branch])
const prBody = `## Summary

Bumps the app version from ${current} to ${version}. Once merged, \`${tag}\` is tagged on the merge commit and the iOS TestFlight workflow uploads the build.

## Related issue

None.

## Validation

- [x] Typecheck, lint and relevant tests pass. (Run by the required \`Validate\` check.)
- [ ] Documentation is updated where needed. (Version bump only.)
- [x] No secrets, signing files or personal data are included.

## Limitations

Created by \`npm run release:ios\`.`
const prUrl = run('gh', ['pr', 'create', '--base', 'main', '--head', branch, '--title', `Release ${tag}`, '--body', prBody])
console.log(`  ${prUrl}`)

step('Waiting for required checks')
await sleep(15000)
try {
  live('gh', ['pr', 'checks', prUrl, '--watch', '--required', '--fail-fast', '--interval', '20'])
} catch {
  fail(`Checks failed. Fix them on ${prUrl}, then merge, tag and push ${tag} manually.`)
}

step('Merging')
live('gh', ['pr', 'merge', prUrl, '--merge', '--delete-branch'])
const mergeSha = run('gh', ['pr', 'view', prUrl, '--json', 'mergeCommit', '--jq', '.mergeCommit.oid'])
if (!mergeSha) fail('Could not find the merge commit.')
run('git', ['switch', '--quiet', 'main'])
run('git', ['pull', '--quiet', '--ff-only', 'origin', 'main'])

step(`Tagging ${tag} on ${mergeSha.slice(0, 7)}`)
run('git', ['tag', '-a', tag, mergeSha, '-m', `Tactirook ${tag}`])
run('git', ['push', '--quiet', 'origin', tag])

step('Following the TestFlight build')
let runId = ''
for (let i = 0; i < 12 && !runId; i++) {
  await sleep(5000)
  runId = run('gh', ['run', 'list', '--workflow', 'ios-testflight.yml', '--branch', tag, '--limit', '1', '--json', 'databaseId', '--jq', '.[0].databaseId // empty'])
}
if (!runId) fail(`Tag pushed, but no TestFlight run found yet. Check: gh run list --workflow ios-testflight.yml`)
try {
  live('gh', ['run', 'watch', runId, '--exit-status', '--interval', '30'])
} catch {
  fail(`TestFlight build failed. Logs: gh run view ${runId} --log-failed`)
}
console.log(`\n✔ ${tag} uploaded to TestFlight. Apple usually needs 5–15 minutes to process it.`)
