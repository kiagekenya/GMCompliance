// RequestsPage.jsx
//
// "REQUESTS" - the vendor's half of the two-way connection-request inbox.
// Two sections: requests this vendor sent to operators (waiting on them),
// and requests operators sent this vendor (which this vendor can accept or
// decline). Accepting either direction has the operator's Vendor contact
// record created/updated with hasPortalAccess: true - see
// backend/utils/connectionRequests.js.

import React, { useState, useEffect } from 'react';
import { getVendorRequests, respondToVendorRequest } from '../../api/client';

const STATUS_LABEL = { pending: 'Pending', accepted: 'Accepted', declined: 'Declined' };
const STATUS_COLOR = {
  pending: 'var(--color-due, #c98a1e)',
  accepted: 'var(--color-compliant, #3f6b52)',
  declined: 'var(--text-muted, #64748b)',
};

const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

const RequestRow = ({ request, isReceived, onRespond }) => {
  const [responding, setResponding] = useState(false);
  const companyName = request.operatorId?.companyName || 'Unknown operator';

  const respond = async (status) => {
    setResponding(true);
    try {
      await onRespond(request._id, status);
    } finally {
      setResponding(false);
    }
  };

  return (
    <div className="vp-doc-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6, padding: '0.7rem 0.9rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong style={{ fontSize: 13 }}>{companyName}</strong>
        <span style={{ fontSize: 11, fontWeight: 700, color: STATUS_COLOR[request.status] }}>{STATUS_LABEL[request.status]}</span>
      </div>
      {request.message && <p style={{ fontSize: 13, margin: 0, opacity: 0.85 }}>{request.message}</p>}
      <span style={{ fontSize: 11, opacity: 0.6 }}>{formatDate(request.createdAt)}</span>
      {isReceived && request.status === 'pending' && (
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button type="button" className="vp-primary-btn" onClick={() => respond('accepted')} disabled={responding}>ACCEPT</button>
          <button type="button" className="vp-link-btn" onClick={() => respond('declined')} disabled={responding}>Decline</button>
        </div>
      )}
    </div>
  );
};

const RequestsPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchRequests = () => {
    setLoading(true);
    getVendorRequests()
      .then((data) => { setRequests(data.requests || []); setError(''); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleRespond = async (id, status) => {
    await respondToVendorRequest(id, status);
    fetchRequests();
  };

  const received = requests.filter((r) => r.initiatedBy === 'operator');
  const sent = requests.filter((r) => r.initiatedBy === 'vendor');

  return (
    <>
      <h2>Requests</h2>
      {loading && <p>Loading…</p>}
      {error && <p style={{ color: '#c0392b' }}>⚠ {error}</p>}

      {!loading && !error && (
        <>
          <div className="vp-card">
            <div className="vp-card-header">RECEIVED FROM OPERATORS</div>
            <div className="vp-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {received.length === 0 && <p style={{ fontSize: 13, opacity: 0.7, margin: 0 }}>Nothing yet.</p>}
              {received.map((r) => <RequestRow key={r._id} request={r} isReceived onRespond={handleRespond} />)}
            </div>
          </div>

          <div className="vp-card">
            <div className="vp-card-header">SENT TO OPERATORS</div>
            <div className="vp-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sent.length === 0 && <p style={{ fontSize: 13, opacity: 0.7, margin: 0 }}>You haven't reached out to any operators yet - see Find Operators.</p>}
              {sent.map((r) => <RequestRow key={r._id} request={r} isReceived={false} onRespond={handleRespond} />)}
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default RequestsPage;
