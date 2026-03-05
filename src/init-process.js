// init-process.js
if (typeof process === 'undefined') {
  window.process = { env: {}, nextTick: (cb) => setTimeout(cb, 0), version: '', platform: 'browser' };
}