// utils/connectionRequests.js
//
// Shared by both accept endpoints - a vendor accepting a request an operator
// sent them (routes/vendorPortal/requests.js), and an operator accepting a
// request a vendor sent them (routes/vendorDirectory/requests.js). Either
// direction, acceptance has the identical effect: it establishes the same
// Vendor contact + hasPortalAccess relationship an operator gets today by
// manually adding a vendor in Settings/Vendors (routes/vendors/addVendor.js) -
// this just triggers it from a marketplace handshake instead of a form.

const Vendor = require('../models/Vendor');
const VendorUser = require('../models/VendorUser');
const VendorProfile = require('../models/VendorProfile');

async function acceptConnectionRequest(request) {
  const vendorUser = await VendorUser.findById(request.vendorUserId);
  if (!vendorUser) {
    const err = new Error('Vendor account no longer exists');
    err.status = 404;
    throw err;
  }
  const profile = await VendorProfile.findOne({ vendorUserId: vendorUser._id });

  let vendorRecord = await Vendor.findOne({ operatorId: request.operatorId, email: vendorUser.email });
  if (vendorRecord) {
    vendorRecord.hasPortalAccess = true;
    await vendorRecord.save();
  } else {
    vendorRecord = await Vendor.create({
      operatorId: request.operatorId,
      companyName: profile?.companyName || vendorUser.fullName || vendorUser.email,
      personnelName: vendorUser.fullName || '',
      email: vendorUser.email,
      phone: profile?.phone || '',
      serviceScope: profile?.serviceCategories?.join(', ') || '',
      hasPortalAccess: true,
    });
  }

  request.status = 'accepted';
  request.respondedAt = new Date();
  await request.save();

  return vendorRecord;
}

module.exports = { acceptConnectionRequest };
