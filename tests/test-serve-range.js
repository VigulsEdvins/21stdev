// The vault server must answer HTTP Range requests, or browsers cannot seek inside a video (scroll-scrubbed features).
const assert = require('assert');
const http = require('http');
const { server } = require('../scripts/serve');

function get(port, urlPath, headers = {}) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port, path: urlPath, headers }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    }).on('error', reject);
  });
}

server.listen(0, '127.0.0.1', async () => {
  const port = server.address().port;
  try {
    const url = '/package.json';
    const whole = await get(port, url);
    assert.strictEqual(whole.status, 200);
    assert.strictEqual(whole.headers['accept-ranges'], 'bytes');
    assert.strictEqual(Number(whole.headers['content-length']), whole.body.length);

    const part = await get(port, url, { Range: 'bytes=2-9' });
    assert.strictEqual(part.status, 206);
    assert.strictEqual(part.headers['content-range'], `bytes 2-9/${whole.body.length}`);
    assert(part.body.equals(whole.body.subarray(2, 10)), 'range body matches the file slice');

    const open = await get(port, url, { Range: 'bytes=5-' });
    assert.strictEqual(open.status, 206);
    assert(open.body.equals(whole.body.subarray(5)), 'open-ended range runs to the end');

    const tail = await get(port, url, { Range: 'bytes=-4' });
    assert.strictEqual(tail.status, 206);
    assert(tail.body.equals(whole.body.subarray(whole.body.length - 4)), 'suffix range returns the last bytes');

    const bad = await get(port, url, { Range: `bytes=${whole.body.length + 10}-` });
    assert.strictEqual(bad.status, 416);
    console.log('✅ HTTP Range tests passed!');
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    server.close();
  }
});
