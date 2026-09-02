// VendorNotificationBanner.jsx
//
// The vendor-portal mirror of the operator dashboard's notification bell:
// a persistent, sidebar-visible nudge for anything actually waiting on this
// vendor - a request an operator sent them, or their own accepted offer
// that still needs them to click "start collaborating now" (see
// RequestsPage.jsx). Deliberately shows nothing when there's nothing to
// act on, rather than a permanent "all clear" banner - it's a "something
// happened" signal, not a status readout.

import React from 'react';

const VendorNotificationBanner = ({ pendingReceived = 0, readyToStart = 0, onClick }) => {
  const total = pendingReceived + readyToStart;
  if (total === 0) return null;

  const parts = [];
  if (pendingReceived > 0) parts.push(`${pendingReceived} request${pendingReceived === 1 ? '' : 's'} to respond to`);
  if (readyToStart > 0) parts.push(`${readyToStart} accepted - ready to start`);

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        border: 'none',
        borderRadius: 8,
        cursor: 'pointer',
        padding: '10px 12px',
        margin: '10px 0',
        fontSize: 12,
        fontWeight: 700,
        lineHeight: 1.4,
        color: '#fff',
        background: '#c98a1e',
      }}
    >
      🔔 {total} notification{total === 1 ? '' : 's'}
      <div style={{ fontWeight: 400, marginTop: 2, opacity: 0.9 }}>{parts.join(' · ')}</div>
    </button>
  );
};

export default VendorNotificationBanner;
