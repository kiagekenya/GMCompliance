// middleware/requestLogger.js
//
// Mounted first, before every route. Logs method + path on the way in, and
// status code + timing on the way out. This is deliberately simple (no
// external logging library) so it's easy to read straight from the
// terminal running `npm run dev`.

function requestLogger(req, res, next) {
  const start = Date.now();
  console.log(`--> ${req.method} ${req.originalUrl}`);

  res.on('finish', () => {
    const ms = Date.now() - start;
    const marker = res.statusCode >= 400 ? '✗' : '✓';
    console.log(`${marker} ${req.method} ${req.originalUrl} ${res.statusCode} (${ms}ms)`);
  });

  next();
}

module.exports = requestLogger;
