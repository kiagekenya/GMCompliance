// routes/evidence/serveEvidence.js
// Mounted at /api/evidence in server.js.
//
// GET /api/evidence/*  - the wildcard is the relative storedName saved on
// upload (see utils/evidenceStorage.js), e.g. "public/<token>/<uuid>-x.pdf"
// or "items/<itemId>/<uuid>-x.pdf".
//
// This is the ONLY way evidence files are ever served - never raw static
// file hosting. The real access control lives here: a file is only ever
// streamed if the requesting operator actually owns a ComplianceItem
// (pending or completed) or CompletionLog entry that references this exact
// storedName. The folder layout at upload time is about where bytes land,
// not about who's allowed to read them back.
//
// Inline-vs-download is also decided here (see isInlineSafe) - an upload
// submitted through the unauthenticated public link could claim any MIME
// type, so rendering it inline in the authenticated admin's browser is
// only allowed for a small safe allowlist; everything else forces a
// download instead of an in-browser render.

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { requireAuth } = require('../../middleware/clerkAuth');
const { UPLOADS_ROOT, isInlineSafe } = require('../../utils/evidenceStorage');
const ComplianceItem = require('../../models/ComplianceItem');
const CompletionLog = require('../../models/CompletionLog');
const asyncHandler = require('../../utils/asyncHandler');

router.use(requireAuth);

router.get('/*', asyncHandler(async (req, res) => {
  const storedName = req.params[0];
  if (!storedName) return res.status(400).json({ error: 'Missing file path' });

  const owns = await isOwnedByOperator(storedName, req.operatorId);
  if (!owns) {
    console.warn(`[evidence] operator ${req.operatorId}: denied access to "${storedName}" - not found in any of their records`);
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
async function isOwnedByOperator(storedName, operatorId) {
  const item = await ComplianceItem.findOne({
    operatorId,
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

  const log = await CompletionLog.findOne({ operatorId, evidenceUrls: { $elemMatch: { storedName } } });
  if (log) {
    const found = (log.evidenceUrls || []).find((e) => e && typeof e === 'object' && e.storedName === storedName);
    if (found) return found;
  }

  return null;
}

module.exports = router;
