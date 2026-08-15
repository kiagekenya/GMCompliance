// MarketplacePage.jsx
//
// "FIND OPERATORS" - every operator on the platform, with their FULL list of
// active compliance items (every regulation that applies to them, whatever
// its current status), so a vendor can see actual regulations - not just an
// operator's name - and offer to help with a SPECIFIC one. Visible by
// default for every operator (no per-operator opt-in) - see
// backend/routes/vendorPortal/getOperators.js for exactly what is and isn't
// exposed here (the item itself only, never internal contacts/evidence).

import React, { useState, useEffect } from 'react';
import { getMarketplaceOperators, sendVendorRequest } from '../../api/client';

const STATUS_LABEL = {
  past_due: 'past due', due: 'due soon', compliant: 'compliant',
  pending: 'not yet due', started: 'in progress', done: 'in progress', awaiting_input: 'needs setup',
};
const STATUS_COLOR = {
  past_due: 'var(--color-pastdue, #a23e2a)',
  due: 'var(--color-due, #c98a1e)',
  compliant: 'var(--color-compliant, #3f6b52)',
  pending: 'var(--color-unset, #6b7280)',
  started: 'var(--color-due, #c98a1e)',
  done: 'var(--color-compliant, #3f6b52)',
  awaiting_input: 'var(--color-setup, #8a5fbf)',
};

const formatDate = (dateString) => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

// Offer to help with ONE specific regulation - the primary way to reach out
// now. Sends a connection request tagged with that ComplianceItem's id, so
// the operator sees exactly which regulation is being offered on.
const RequestRowButton = ({ operatorId, complianceItemId, itemLabel }) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    setSending(true);
    setError('');
    try {
      await sendVendorRequest(operatorId, message || `We can help with: ${itemLabel}`, complianceItemId);
      setSent(true);
      setOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  if (sent) return <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-compliant, #3f6b52)' }}>✓ Sent</span>;
  if (!open) return <button type="button" className="vp-link-btn" onClick={() => setOpen(true)}>Offer to help</button>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 220 }}>
      {error && <p style={{ color: '#c0392b', fontSize: 11, margin: 0 }}>⚠ {error}</p>}
      <textarea className="vp-input" rows={2} placeholder="We can handle this for you..." value={message} onChange={(e) => setMessage(e.target.value)} />
      <div style={{ display: 'flex', gap: 6 }}>
        <button type="button" className="vp-primary-btn" style={{ padding: '4px 10px', fontSize: 11 }} onClick={handleSend} disabled={sending}>{sending ? '…' : 'SEND'}</button>
        <button type="button" className="vp-link-btn" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </div>
  );
};

// A general pitch at the operator as a whole, not tied to one regulation -
// still useful for "we do all kinds of compliance work for operators like
// you," kept alongside the per-regulation option above.
const GeneralRequestButton = ({ operatorId }) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    setSending(true);
    setError('');
    try {
      await sendVendorRequest(operatorId, message);
      setSent(true);
      setOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  if (sent) return <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-compliant, #3f6b52)' }}>✓ Request sent</span>;
  if (!open) return <button type="button" className="vp-link-btn" onClick={() => setOpen(true)}>Send a general inquiry instead</button>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 420, marginTop: 8 }}>
      {error && <p style={{ color: '#c0392b', fontSize: 12, margin: 0 }}>⚠ {error}</p>}
      <textarea
        className="vp-input"
        rows={2}
        placeholder="We handle corrosion control testing across your whole system..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="vp-primary-btn" onClick={handleSend} disabled={sending}>{sending ? 'SENDING…' : 'SEND'}</button>
        <button type="button" className="vp-link-btn" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </div>
  );
};

const MarketplacePage = () => {
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    getMarketplaceOperators()
      .then((data) => { setOperators(data.operators || []); setError(''); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <h2>Find Operators</h2>
      <p style={{ opacity: 0.7, fontSize: 13, marginTop: -8, marginBottom: 16 }}>
        Every operator on the platform, with their compliance regulations - open a specific one and offer to help with it directly.
      </p>
      {loading && <p>Loading…</p>}
      {error && <p style={{ color: '#c0392b' }}>⚠ {error}</p>}
      {!loading && !error && operators.length === 0 && (
        <div className="vp-empty-state"><p>No operators found.</p></div>
      )}
      {operators.map((op) => (
        <div key={op.operatorId} className="vp-card">
          <div className="vp-card-header">{op.companyName}{op.county ? ` · ${op.county}` : ''}</div>
          <div className="vp-card-body">
            {op.items.length === 0 ? (
              <p style={{ fontSize: 13, opacity: 0.7, margin: '0 0 12px' }}>No compliance items on file yet.</p>
            ) : (
              <table className="vp-table" style={{ marginBottom: 12 }}>
                <thead><tr><th></th><th>Regulation</th><th>Citation</th><th>Due</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {op.items.map((it) => (
                    <tr key={it.complianceItemId}>
                      <td><span className="vp-status-dot" style={{ background: STATUS_COLOR[it.status] || STATUS_COLOR.pending }}></span></td>
                      <td>{it.title}</td>
                      <td className="vp-mono">{it.sourceRegulation}</td>
                      <td>{formatDate(it.nextDueDate)}</td>
                      <td>{STATUS_LABEL[it.status] || it.status}</td>
                      <td><RequestRowButton operatorId={op.operatorId} complianceItemId={it.complianceItemId} itemLabel={`${it.title} (${it.sourceRegulation})`} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <GeneralRequestButton operatorId={op.operatorId} />
          </div>
        </div>
      ))}
    </>
  );
};

export default MarketplacePage;
