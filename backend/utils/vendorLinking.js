// utils/vendorLinking.js
//
// Creates or updates the operator's own Vendor contact record for a given
// VendorUser, pulling their self-reported VendorProfile in as the contact
// details (instead of an operator retyping a vendor's info by hand), and
// grants portal access. Shared by two triggers with the identical outcome:
//   - routes/vendorDirectory/addVendor.js - an operator directly adding a
//     real vendor from the marketplace directory (the normal path now).
//   - utils/connectionRequests.js's acceptConnectionRequest - either side
//     accepting a connection request.

const Vendor = require('../models/Vendor');
const VendorUser = require('../models/VendorUser');
const VendorProfile = require('../models/VendorProfile');

async function linkVendorToOperator(operatorId, vendorUserId) {
  const vendorUser = await VendorUser.findById(vendorUserId);
  if (!vendorUser) {
    const err = new Error('Vendor account no longer exists');
    err.status = 404;
    throw err;
  }
  const profile = await VendorProfile.findOne({ vendorUserId: vendorUser._id });

  let vendorRecord = await Vendor.findOne({ operatorId, email: vendorUser.email });
  if (vendorRecord) {
    vendorRecord.hasPortalAccess = true;
    if (profile) {
      vendorRecord.companyName = profile.companyName || vendorRecord.companyName;
      vendorRecord.phone = profile.phone || vendorRecord.phone;
      vendorRecord.serviceScope = profile.serviceCategories?.join(', ') || vendorRecord.serviceScope;
    }
    await vendorRecord.save();
  } else {
    vendorRecord = await Vendor.create({
      operatorId,
      companyName: profile?.companyName || vendorUser.fullName || vendorUser.email,
      personnelName: vendorUser.fullName || '',
      email: vendorUser.email,
      phone: profile?.phone || '',
      serviceScope: profile?.serviceCategories?.join(', ') || '',
      hasPortalAccess: true,
    });
  }
  return vendorRecord;
}

module.exports = { linkVendorToOperator };
