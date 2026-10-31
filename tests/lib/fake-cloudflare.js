/* Pretend Cloudflare custom hostnames for the tests of functions/lib/site-domain.js: nothing leaves the computer.
   The test moves a hostname along by hand: cf.setState(hostname, { status, ssl }) (what Cloudflare would report once the customer's DNS is in place and the certificate is issued). */
function create() {
  const byId = new Map(), calls = [];
  let n = 0;
  const cf = {
    calls, failNext: null,
    async create(hostname) {
      calls.push('create ' + hostname);
      if (cf.failNext) { const e = cf.failNext; cf.failNext = null; throw e; }
      if ([...byId.values()].some((h) => h.hostname === hostname)) throw Object.assign(new Error('Duplicate custom hostname found.'), { status: 409, cfCode: 1406 });
      const h = { id: 'cf-host-' + (++n) + '-00000000', hostname, status: 'pending', ssl: { status: 'pending_validation' }, errors: ['custom hostname does not CNAME to this zone.'], ownership: { name: '_cf-custom-hostname.' + hostname, value: 'owner-token-' + n } };
      byId.set(h.id, h); return JSON.parse(JSON.stringify(h));
    },
    async get(id) {
      calls.push('get ' + id);
      if (cf.failGet) throw new Error('Cloudflare is down');
      const h = byId.get(id); return h ? JSON.parse(JSON.stringify(h)) : null;
    },
    async remove(id) { calls.push('remove ' + id); if (cf.failRemove) throw new Error('Cloudflare is down'); byId.delete(id); },
    setState(hostname, patch) { const h = [...byId.values()].find((x) => x.hostname === hostname); Object.assign(h, patch); if (patch.status === 'active') h.errors = []; },
    has(hostname) { return [...byId.values()].some((h) => h.hostname === hostname); },
    failGet: false, failRemove: false
  };
  return cf;
}
module.exports = { create };
