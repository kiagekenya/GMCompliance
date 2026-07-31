// middleware/errorHandler.js
//
// Last middleware in the chain (see server.js). Any route that calls
// next(err) - or throws inside an async handler wrapped by asyncHandler
// (see utils/asyncHandler.js) - ends up here instead of crashing the server.

function errorHandler(err, req, res, next) {
  console.error(err.stack || err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
}

module.exports = errorHandler;
