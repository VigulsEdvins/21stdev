/* "Send to GitHub" for one paid page (plan E7.6). Order of checks: the paid entitlement first (an unpaid page is refused before
   any GitHub call), then the rate limit, then a token is minted, then the push. Everything outside is injected:
   deps = { now, limiter(accountId) -> bool, audit(event), mintToken(installationId) -> token, gh(token) -> gh function, buildFiles() -> files }.
   The token never leaves this function: it is not in the result, the audit event or any error message. */
const Entitlement = require('./entitlement.js');
const { push } = require('./github-push.js');

const WHY = {
  'not-paid': 'This page has not been paid for yet.',
  expired: 'The 12 months of downloads for this page have ended. Renew to send it again.',
  'payment-needed': 'The page has more blocks than you paid for. Pay for the extra blocks first.'
};

/**
 * input: { accountId, projectId, entitlement, blocks, editor, installationId, target:{owner,repo,branch,folder}, overwrite }
 * Resolves the push() result, or { ok:false, status } with status 'not-paid'|'expired'|'payment-needed'|'rate-limited'|'access-revoked'|'invalid'.
 */
async function sendToGithub(input, deps) {
  const now = deps.now();
  const c = Entitlement.check(input.entitlement, { blocks: input.blocks, editor: input.editor }, now);
  if (!c.ok) return { ok: false, status: c.reason, message: WHY[c.reason] || 'Not allowed.', total: c.total };
  if (!(await deps.limiter(input.accountId))) return { ok: false, status: 'rate-limited', message: 'Too many sends. Wait a little and try again.' };
  let token;
  try { token = await deps.mintToken(input.installationId); } catch (e) {
    await deps.audit({ type: 'github.push', outcome: 'access-revoked', accountId: input.accountId, projectId: input.projectId, at: new Date(now).toISOString() });
    return { ok: false, status: 'access-revoked', message: 'edvlabs can no longer reach your GitHub. Install the app again, then try again.' };
  }
  const files = await deps.buildFiles();
  const r = await push(deps.gh(token), input.target, files, { overwrite: !!input.overwrite, message: 'Add my edvlabs site' });
  await deps.audit({ type: 'github.push', outcome: r.status, accountId: input.accountId, projectId: input.projectId, repo: input.target && input.target.owner + '/' + input.target.repo, branch: input.target && input.target.branch, commit: r.commit, files: r.written ? r.written.length : 0, at: new Date(now).toISOString() });
  return r;
}

module.exports = { sendToGithub, WHY };
