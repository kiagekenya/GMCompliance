// routes/evidence/serveEvidence.js
// Mounted at /api/evidence in server.js.
//
// GET /api/evidence/*  - the wildcard is the relative storedName saved on
// upload (see utils/evidenceStorage.js), e.g. "public/<token>/<uuid>-x.pdf"
// or "items/<itemId>/<uuid>-x.pdf".
//
// This is the ONLY way evidence files are ever served - never raw static
// file hosting. The real access control lives here, and now serves BOTH
// identities in this app: an operator (owns via ComplianceItem.operatorId
// or CompletionLog.operatorId) or a vendor-portal vendor (owns via
// ComplianceItem.assignedVendorId matching one of their hasPortalAccess
// Vendor records - vendors don't get CompletionLog access, that's the
// operator's full audit archive, out of scope for a vendor). The folder
// layout at upload time is about where bytes land, not about who's allowed
// to read them back.
//
// Inline-vs-download is also decided here (see isInlineSafe) - an upload
// submitted through the unauthenticated public link could claim any MIME
// type, so rendering it inline in an authenticated browser is only allowed
// for a small safe allowlist; everything else forces a download instead of
// an in-browser render.

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { verifyClerkToken } = require('../../middleware/clerkAuth');
const { UPLOADS_ROOT, isInlineSafe } = require('../../utils/evidenceStorage');
const Operator = require('../../models/Operator');
const VendorUser = require('../../models/VendorUser');
const Vendor = require('../../models/Vendor');
const ComplianceItem = require('../../models/ComplianceItem');
const CompletionLog = require('../../models/CompletionLog');
const asyncHandler = require('../../utils/asyncHandler');

// Deliberately does NOT auto-create an Operator - this route only ever
// reads, so a brand new Clerk user with neither an Operator nor a
// VendorUser record simply gets denied, rather than silently being
// enrolled as an operator just for looking at a file link.
async function resolveEvidenceIdentity(req, res, next) {
  let claims;
  try {
    claims = await verifyClerkToken(req);
  } catch (err) {
    return res.status(err.status || 401).json({ error: err.message });
  }

  const operator = await Operator.findOne({ clerkUserId: claims.sub });
  if (operator) {
    req.identity = { type: 'operator', operatorId: operator._id };
    return next();
  }

  const vendorUser = await VendorUser.findOne({ clerkUserId: claims.sub });
  if (vendorUser) {
    const vendorRecords = await Vendor.find({ email: vendorUser.email, hasPortalAccess: true });
    req.identity = { type: 'vendor', vendorIds: vendorRecords.map((v) => v._id) };
    return next();
  }

  return res.status(403).json({ error: 'No access' });
}

router.use(resolveEvidenceIdentity);

router.get('/*', asyncHandler(async (req, res) => {
  const storedName = req.params[0];
  if (!storedName) return res.status(400).json({ error: 'Missing file path' });

  const owns = await isOwnedByIdentity(storedName, req.identity);
  if (!owns) {
    console.warn(`[evidence] ${req.identity.type} denied access to "${storedName}" - not found in any of their records`);
    return res.status(404).json({ error: 'File not found' });
  }

  const absolutePath = path.join(UPLOADS_ROOT, storedName);
  // Defense in depth against path traversal, even though storedName only
  // ever comes from values we generated ourselves at upload time.
  if (!absolutePath.startsWith(UPLOADS_ROOT)) {
    return res.status(400).json({ error: 'Invalid file path' });
  }
  if (!fs.existsSync(absolutePath)) {
    return res.status(404).json({ error: 'File not found on disk' });
  }

  const entry = owns; // the matched evidence entry, for mimeType/originalName
  const disposition = isInlineSafe(entry.mimeType) ? 'inline' : 'attachment';
  res.setHeader('Content-Type', isInlineSafe(entry.mimeType) ? entry.mimeType : 'application/octet-stream');
  res.setHeader('Content-Disposition', `${disposition}; filename="${entry.originalName || path.basename(storedName)}"`);
  fs.createReadStream(absolutePath).pipe(res);
}));

// Returns the matched evidence entry object if found (truthy), else null.
async function isOwnedByIdentity(storedName, identity) {
  const itemFilter = identity.type === 'operator'
    ? { operatorId: identity.operatorId }
    : { assignedVendorId: { $in: identity.vendorIds } };

  const item = await ComplianceItem.findOne({
    ...itemFilter,
    $or: [
      { pendingEvidenceUrls: { $elemMatch: { storedName } } },
      { completedEvidenceUrls: { $elemMatch: { storedName } } },
    ],
  });
  if (item) {
    const found = [...(item.pendingEvidenceUrls || []), ...(item.completedEvidenceUrls || [])]
      .find((e) => e && typeof e === 'object' && e.storedName === storedName);
    if (found) return found;
  }

  if (identity.type === 'operator') {
    const log = await CompletionLog.findOne({ operatorId: identity.operatorId, evidenceUrls: { $elemMatch: { storedName } } });
    if (log) {
      const found = (log.evidenceUrls || []).find((e) => e && typeof e === 'object' && e.storedName === storedName);
      if (found) return found;
    }
  }

  return null;
}

module.exports = router;
