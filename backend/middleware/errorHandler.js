// middleware/errorHandler.js
//
// Last middleware in the chain (see server.js). Any route that calls
// next(err) - or throws inside an async handler wrapped by asyncHandler
// (see utils/asyncHandler.js) - ends up here instead of crashing the server.
//
// Logs full context (method, path, body, status) so a failure is never just
// a bare stack trace with no idea which request caused it.

function errorHandler(err, req, res, next) {
  const status = err.status || 500;

  console.error(`✗ ERROR on ${req.method} ${req.originalUrl} -> ${status}`);
  console.error('  message:', err.message);
  if (req.body && Object.keys(req.body).length > 0) {
    console.error('  request body:', JSON.stringify(req.body));
  }
  if (status >= 500) {
    console.error('  stack:', err.stack);
  }

  res.status(status).json({ error: err.message || 'Internal server error' });
}

module.exports = errorHandler;
