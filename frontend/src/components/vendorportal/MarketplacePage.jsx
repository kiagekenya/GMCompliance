// MarketplacePage.jsx
//
// "FIND OPERATORS" - every operator on the platform, with their open
// compliance gaps, so a vendor can see who needs what and send them a
// connection request. Visible by default for every operator (no per-operator
// opt-in) - see backend/routes/vendorPortal/getOperators.js for exactly what
// is and isn't exposed here (gaps only, never internal contacts/evidence).

import React, { useState, useEffect } from 'react';
import { getMarketplaceOperators, sendVendorRequest } from '../../api/client';

const STATUS_LABEL = { past_due: 'past due', due: 'due soon' };
const STATUS_COLOR = { past_due: 'var(--color-pastdue, #a23e2a)', due: 'var(--color-due, #c98a1e)' };

const formatDate = (dateString) => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const RequestButton = ({ operatorId, onSent }) => {
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
      if (onSent) onSent();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-compliant, #3f6b52)' }}>✓ Request sent</span>;
  }

  if (!open) {
    return <button type="button" className="vp-primary-btn" onClick={() => setOpen(true)}>SEND REQUEST</button>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 420 }}>
      {error && <p style={{ color: '#c0392b', fontSize: 12, margin: 0 }}>⚠ {error}</p>}
      <textarea
        className="vp-input"
        rows={2}
        placeholder="We can help with your corrosion control testing..."
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

  const fetchOperators = () => {
    setLoading(true);
    getMarketplaceOperators()
      .then((data) => { setOperators(data.operators || []); setError(''); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchOperators(); }, []);

  return (
    <>
      <h2>Find Operators</h2>
      <p style={{ opacity: 0.7, fontSize: 13, marginTop: -8, marginBottom: 16 }}>
        Every operator on the platform, with their open compliance items - a place to look for work and pitch your services.
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
            {op.gaps.length === 0 ? (
              <p style={{ fontSize: 13, opacity: 0.7, margin: '0 0 12px' }}>No open compliance items right now.</p>
            ) : (
              <table className="vp-table" style={{ marginBottom: 12 }}>
                <thead><tr><th></th><th>Regulation</th><th>Citation</th><th>Due</th><th>Status</th></tr></thead>
                <tbody>
                  {op.gaps.map((g, idx) => (
                    <tr key={idx}>
                      <td><span className="vp-status-dot" style={{ background: STATUS_COLOR[g.status] }}></span></td>
                      <td>{g.title}</td>
                      <td className="vp-mono">{g.sourceRegulation}</td>
                      <td>{formatDate(g.nextDueDate)}</td>
                      <td>{STATUS_LABEL[g.status] || g.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <RequestButton operatorId={op.operatorId} onSent={fetchOperators} />
          </div>
        </div>
      ))}
    </>
  );
};

export default MarketplacePage;
