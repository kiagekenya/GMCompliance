// middleware/requestLogger.js
//
// Mounted first, before every route. Only logs a request if it errored
// (status >= 400) or was unusually slow - healthy, fast requests produce no
// output, so the terminal isn't flooded during normal polling/browsing.
// Set VERBOSE_HTTP_LOGS=true to log every request for debugging.

const SLOW_REQUEST_MS = 1000;

function requestLogger(req, res, next) {
  const start = Date.now();
  const verbose = process.env.VERBOSE_HTTP_LOGS === 'true';

  if (verbose) console.log(`--> ${req.method} ${req.originalUrl}`);

  res.on('finish', () => {
    const ms = Date.now() - start;
    const isError = res.statusCode >= 400;
    const isSlow = ms >= SLOW_REQUEST_MS;

    if (verbose || isError || isSlow) {
      const marker = isError ? '✗' : '✓';
      const slowTag = isSlow ? ' [SLOW]' : '';
      console.log(`${marker} ${req.method} ${req.originalUrl} ${res.statusCode} (${ms}ms)${slowTag}`);
    }
  });

  next();
}

module.exports = requestLogger;
