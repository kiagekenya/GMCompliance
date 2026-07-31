// utils/asyncHandler.js
//
// Wraps an async route function so any thrown error (or rejected promise)
// is automatically forwarded to errorHandler.js instead of hanging the request.
// Usage: router.get('/', asyncHandler(async (req, res) => { ... }));

function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
