// RequestsPage.jsx
//
// "REQUESTS" - the vendor's half of the two-way connection-request inbox.
// Two sections: requests this vendor sent to operators (waiting on them),
// and requests operators sent this vendor (which this vendor can accept or
// decline). Accepting either direction has the operator's Vendor contact
// record created/updated with hasPortalAccess: true - see
// backend/utils/connectionRequests.js.

import React, { useState, useEffect } from 'react';
import { getVendorRequests, respondToVendorRequest, startCollaboration } from '../../api/client';

const STATUS_LABEL = {
  pending: 'Pending',
  accepted: 'Accepted',
  declined: 'Declined',
};
const STATUS_COLOR = {
  pending: '#c98a1e',
  accepted: '#3f6b52',
  declined: '#94a3b8',
};

const formatDate = (dateString) =>
  new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

// The "notification" for a vendor-sent, regulation-specific request the
// operator has accepted: accepting only connects the two sides (see
// backend/utils/connectionRequests.js) - it does NOT put the vendor on the
// operator's calendar yet. Clicking here is what tells the operator
// directly (an email, not just an in-app row - see
// backend/routes/vendorPortal/startCollaboration.js) that this vendor is
// ready to actually start, and is the trigger for the operator's own
// CONFIRM COLLABORATION step that finishes the assignment.
const CollaborationAction = ({ request, onStarted }) => {
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  if (request.collaborationConfirmedAt) {
    return (
      <span style={{ fontSize: '11px', fontWeight: 600, color: '#3f6b52' }}>
        ✓ Collaboration confirmed — check My Tasks
      </span>
    );
  }

  if (request.collaborationRequestedAt) {
    return (
      <span style={{ fontSize: '11px', fontWeight: 500, color: '#c98a1e' }}>
        ⏳ Waiting for the operator to confirm collaboration
      </span>
    );
  }

  const handleStart = async () => {
    setStarting(true);
    setError('');
    try {
      await startCollaboration(request._id);
      onStarted();
    } catch (err) {
      setError(err.message);
    } finally {
      setStarting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
      {error && <span style={{ fontSize: '11px', color: '#b91c1c' }}>⚠ {error}</span>}
      <button
        type="button"
        onClick={handleStart}
        disabled={starting}
        style={{
          padding: '6px 16px',
          fontSize: '11px',
          fontWeight: 700,
          backgroundColor: '#3f6b52',
          color: '#ffffff',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          letterSpacing: '0.3px',
        }}
      >
        {starting ? 'SENDING…' : '🎉 ACCEPTED — START COLLABORATING NOW'}
      </button>
    </div>
  );
};

const RequestRow = ({ request, isReceived, onRespond, onStarted }) => {
  const [responding, setResponding] = useState(false);
  const companyName = request.operatorId?.companyName || 'Unknown operator';
  const regulation = request.complianceItemId?.requirementId;

  const respond = async (status) => {
    setResponding(true);
    try {
      await onRespond(request._id, status);
    } finally {
      setResponding(false);
    }
  };

  return (
    <div
      style={{
        padding: '12px 16px',
        backgroundColor: '#fafbfc',
        borderRadius: '8px',
        border: '1px solid #eef2f6',
        transition: 'border-color 0.15s ease, background 0.15s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#dce1e8';
        e.currentTarget.style.background = '#f8fafc';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#eef2f6';
        e.currentTarget.style.background = '#fafbfc';
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <strong
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#1a2634',
          }}
        >
          {companyName}
        </strong>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 600,
            color: STATUS_COLOR[request.status] || '#6b7280',
            textTransform: 'capitalize',
            background:
              request.status === 'pending'
                ? '#fef9e7'
                : request.status === 'accepted'
                ? '#edf7f2'
                : '#f1f2f4',
            padding: '3px 10px',
            borderRadius: '12px',
            letterSpacing: '0.3px',
          }}
        >
          {STATUS_LABEL[request.status] || request.status}
        </span>
      </div>

      {regulation && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: '#4a5568',
          }}
        >
          <span
            style={{
              fontWeight: 500,
              opacity: 0.7,
              fontSize: '10px',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
            }}
          >
            RE:
          </span>
          <span style={{ fontWeight: 500 }}>{regulation.title}</span>
          <span
            style={{
              fontFamily: 'ui-monospace, SFMono-Regular, monospace',
              fontSize: '11px',
              color: '#6b7280',
              background: '#f0f2f5',
              padding: '1px 8px',
              borderRadius: '4px',
            }}
          >
            {regulation.sourceRegulation}
          </span>
        </div>
      )}

      {request.message && (
        <p
          style={{
            fontSize: '13px',
            margin: 0,
            color: '#2c3e50',
            lineHeight: '1.5',
            padding: '4px 0',
          }}
        >
          {request.message}
        </p>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '2px',
        }}
      >
        <span
          style={{
            fontSize: '11px',
            color: '#94a3b8',
          }}
        >
          {formatDate(request.createdAt)}
        </span>

        {isReceived && request.status === 'pending' && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              style={{
                padding: '5px 16px',
                fontSize: '11px',
                fontWeight: 600,
                backgroundColor: '#2c3e50',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease, transform 0.1s ease',
                letterSpacing: '0.3px',
              }}
              onClick={() => respond('accepted')}
              disabled={responding}
              onMouseEnter={(e) => {
                if (!responding) e.target.style.backgroundColor = '#1a2634';
              }}
              onMouseLeave={(e) => {
                if (!responding) e.target.style.backgroundColor = '#2c3e50';
              }}
            >
              ACCEPT
            </button>
            <button
              type="button"
              style={{
                padding: '5px 14px',
                fontSize: '11px',
                fontWeight: 500,
                backgroundColor: 'transparent',
                color: '#6b7280',
                border: '1px solid #dce1e8',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease',
              }}
              onClick={() => respond('declined')}
              disabled={responding}
              onMouseEnter={(e) => {
                if (!responding) {
                  e.target.style.backgroundColor = '#f1f2f4';
                  e.target.style.color = '#2c3e50';
                  e.target.style.borderColor = '#bcc3cd';
                }
              }}
              onMouseLeave={(e) => {
                if (!responding) {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = '#6b7280';
                  e.target.style.borderColor = '#dce1e8';
                }
              }}
            >
              Decline
            </button>
          </div>
        )}

        {isReceived && request.status !== 'pending' && (
          <span
            style={{
              fontSize: '11px',
              fontWeight: 500,
              color:
                request.status === 'accepted' ? '#3f6b52' : '#94a3b8',
            }}
          >
            {request.status === 'accepted' ? '✓ You accepted this request' : 'You declined this request'}
          </span>
        )}

        {!isReceived && request.status === 'accepted' && request.complianceItemId && (
          <CollaborationAction request={request} onStarted={onStarted} />
        )}

        {!isReceived && !(request.status === 'accepted' && request.complianceItemId) && (
          <span
            style={{
              fontSize: '11px',
              fontWeight: 500,
              color:
                request.status === 'accepted'
                  ? '#3f6b52'
                  : request.status === 'declined'
                  ? '#94a3b8'
                  : '#c98a1e',
            }}
          >
            {request.status === 'accepted'
              ? '✓ '
              : request.status === 'declined'
              ? '✗ '
              : '⏳ Waiting for response'}
          </span>
        )}
      </div>
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
      .then((data) => {
        setRequests(data.requests || []);
        setError('');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleRespond = async (id, status) => {
    await respondToVendorRequest(id, status);
    fetchRequests();
  };

  const received = requests.filter((r) => r.initiatedBy === 'operator');
  const sent = requests.filter((r) => r.initiatedBy === 'vendor');

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '4px',
        }}
      >
        <h2
  style={{
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    margin: '0 0 25px',
    color: 'var(--vp-navy-deep, #1a2634)',
    fontSize: '26px',
    lineHeight: 1.2,
    fontWeight: 650,
    letterSpacing: '-0.025em',
  }}
>
          Requests
        </h2>
        <span
          style={{
            fontSize: '12px',
            color: '#6b7280',
            background: '#f0f2f5',
            padding: '4px 12px',
            borderRadius: '12px',
            fontWeight: 500,
          }}
        >
          {requests.length} total
        </span>
      </div>

      {loading && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '40px 0',
            color: '#6b7280',
            fontSize: '14px',
          }}
        >
          <span>Loading requests…</span>
        </div>
      )}

      {error && (
        <div
          style={{
            backgroundColor: '#fef6f6',
            borderRadius: '8px',
            padding: '12px 16px',
            border: '1px solid #fad2d2',
            color: '#b91c1c',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px',
          }}
        >
          <span>⚠️</span> {error}
        </div>
      )}

      {!loading && !error && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Received from operators */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #eef2f6',
              overflow: 'hidden',
              boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
            }}
          >
            <div
              style={{
                padding: '14px 20px',
                backgroundColor: '#f8fafc',
                borderBottom: '1px solid #eef2f6',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '3px',
                  height: '20px',
                  backgroundColor: '#3f6b52',
                  borderRadius: '4px',
                }}
              />
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#1a2634',
                  letterSpacing: '0.3px',
                }}
              >
                RECEIVED FROM OPERATORS
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 500,
                  color: '#6b7280',
                  background: '#f0f2f5',
                  padding: '1px 10px',
                  borderRadius: '12px',
                  marginLeft: 'auto',
                }}
              >
                {received.length}
              </span>
            </div>
            <div
              style={{
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              {received.length === 0 && (
                <p
                  style={{
                    fontSize: '13px',
                    color: '#94a3b8',
                    margin: 0,
                    textAlign: 'center',
                    padding: '16px 0',
                  }}
                >
                  No requests from operators yet.
                </p>
              )}
              {received.map((r) => (
                <RequestRow
                  key={r._id}
                  request={r}
                  isReceived
                  onRespond={handleRespond}
                />
              ))}
            </div>
          </div>

          {/* Sent to operators */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #eef2f6',
              overflow: 'hidden',
              boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
            }}
          >
            <div
              style={{
                padding: '14px 20px',
                backgroundColor: '#f8fafc',
                borderBottom: '1px solid #eef2f6',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '3px',
                  height: '20px',
                  backgroundColor: '#c98a1e',
                  borderRadius: '4px',
                }}
              />
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#1a2634',
                  letterSpacing: '0.3px',
                }}
              >
                SENT TO OPERATORS
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 500,
                  color: '#6b7280',
                  background: '#f0f2f5',
                  padding: '1px 10px',
                  borderRadius: '12px',
                  marginLeft: 'auto',
                }}
              >
                {sent.length}
              </span>
            </div>
            <div
              style={{
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              {sent.length === 0 && (
                <p
                  style={{
                    fontSize: '13px',
                    color: '#94a3b8',
                    margin: 0,
                    textAlign: 'center',
                    padding: '16px 0',
                  }}
                >
                  You haven't reached out to any operators yet — see{' '}
                  <span style={{ color: '#2c3e50', fontWeight: 500 }}>
                    Find Operators
                  </span>
                  .
                </p>
              )}
              {sent.map((r) => (
                <RequestRow
                  key={r._id}
                  request={r}
                  isReceived={false}
                  onRespond={handleRespond}
                  onStarted={fetchRequests}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestsPage;