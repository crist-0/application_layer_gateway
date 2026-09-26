const { test } = require('node:test');
const assert = require('node:assert');
const { rateLimiter } = require('../pipeline/rateLimiter');

function makeFakeReq(ip) {
  return { socket: { remoteAddress: ip } };
}

test('a single request from a fresh IP passes', () => {
  const req = makeFakeReq('1.1.1.1');
  const result = rateLimiter(req);
  assert.strictEqual(result.pass, true);
});

test('exceeding the limit blocks the request', () => {
  const request= makeFakeReq('2.2.2.2');
  for (let i = 0; i < 9; i++) {
    rateLimiter(request);
  }
  const result = rateLimiter(request);
  assert.strictEqual(result.pass, false);
  assert.strictEqual(result.status, 429);
});

test('a different IP is unaffected by another IP being near/at its limit', () => {
  // fill this in: hammer IP 'A' close to or past its limit,
  // then assert a fresh request from IP 'B' still passes
  //
  const request = makeFakeReq('3.2.2.2');
  for (let i = 0; i < 9; i++) {
    rateLimiter(request);
  }
  const request1 = makeFakeReq('4.2.2.2');
  const result = rateLimiter(request1);
  assert.strictEqual(result.pass, true);
});
