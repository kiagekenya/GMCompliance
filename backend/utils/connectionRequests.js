// utils/connectionRequests.js
//
// Shared by both accept endpoints - a vendor accepting a request an operator
// sent them (routes/vendorPortal/requests.js), and an operator accepting a
// request a vendor sent them (routes/vendorDirectory/requests.js). Either
// direction, acceptance has the identical effect as directly adding a
// vendor from the marketplace directory - see utils/vendorLinking.js for
// the shared logic.

const { linkVendorToOperator } = require('./vendorLinking');

async function acceptConnectionRequest(request) {
  const vendorRecord = await linkVendorToOperator(request.operatorId, request.vendorUserId);

  request.status = 'accepted';
  request.respondedAt = new Date();
  await request.save();

  return vendorRecord;
}

module.exports = { acceptConnectionRequest };
