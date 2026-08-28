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
  past_due: 'past due',
  due: 'due soon',
  compliant: 'compliant',
  pending: 'not yet due',
  started: 'in progress',
  done: 'in progress',
  awaiting_input: 'needs setup',
};

const STATUS_COLOR = {
  past_due: '#a23e2a',
  due: '#c98a1e',
  compliant: '#3f6b52',
  pending: '#6b7280',
  started: '#c98a1e',
  done: '#3f6b52',
  awaiting_input: '#8a5fbf',
};

const formatDate = (dateString) => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
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
      await sendVendorRequest(
        operatorId,
        message || `We can help with: ${itemLabel}`,
        complianceItemId
      );
      setSent(true);
      setOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  if (sent)
    return (
      <span
        style={{
          fontSize: '12px',
          fontWeight: 600,
          color: '#3f6b52',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        <span style={{ fontSize: '14px' }}>✓</span> Sent
      </span>
    );

  if (!open)
    return (
      <button
        type="button"
        style={{
          background: 'none',
          border: 'none',
          color: '#2c3e50',
          fontSize: '12px',
          fontWeight: 500,
          cursor: 'pointer',
          padding: '4px 8px',
          borderRadius: '4px',
          transition: 'background 0.15s ease, color 0.15s ease',
          textDecoration: 'underline',
          textUnderlineOffset: '2px',
          textDecorationColor: '#dce1e8',
        }}
        onMouseEnter={(e) => {
          e.target.style.background = '#f0f2f5';
          e.target.style.color = '#1a2634';
        }}
        onMouseLeave={(e) => {
          e.target.style.background = 'none';
          e.target.style.color = '#2c3e50';
        }}
        onClick={() => setOpen(true)}
      >
        Offer to help
      </button>
    );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        minWidth: '220px',
        padding: '8px',
        background: '#f8fafc',
        borderRadius: '6px',
        border: '1px solid #eef2f6',
      }}
    >
      {error && (
        <p
          style={{
            color: '#b91c1c',
            fontSize: '11px',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span>⚠️</span> {error}
        </p>
      )}
      <textarea
        style={{
          width: '100%',
          padding: '6px 10px',
          fontSize: '12px',
          borderRadius: '6px',
          border: '1px solid #dce1e8',
          backgroundColor: '#ffffff',
          fontFamily: 'inherit',
          resize: 'vertical',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
          outline: 'none',
          boxSizing: 'border-box',
          minHeight: '40px',
        }}
        rows={2}
        placeholder="We can handle this for you..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onFocus={(e) => {
          e.target.style.borderColor = '#2c3e50';
          e.target.style.boxShadow = '0 0 0 3px rgba(44,62,80,0.08)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = '#dce1e8';
          e.target.style.boxShadow = 'none';
        }}
      />
      <div style={{ display: 'flex', gap: '6px' }}>
        <button
          type="button"
          style={{
            padding: '5px 14px',
            fontSize: '11px',
            fontWeight: 600,
            backgroundColor: '#2c3e50',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'background-color 0.2s ease',
            letterSpacing: '0.3px',
          }}
          onClick={handleSend}
          disabled={sending}
          onMouseEnter={(e) => {
            if (!sending) e.target.style.backgroundColor = '#1a2634';
          }}
          onMouseLeave={(e) => {
            if (!sending) e.target.style.backgroundColor = '#2c3e50';
          }}
        >
          {sending ? '…' : 'SEND'}
        </button>
        <button
          type="button"
          style={{
            background: 'none',
            border: 'none',
            color: '#6b7280',
            fontSize: '11px',
            fontWeight: 500,
            cursor: 'pointer',
            padding: '5px 10px',
            borderRadius: '4px',
            transition: 'background 0.15s ease, color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.target.style.background = '#f0f2f5';
            e.target.style.color = '#2c3e50';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'none';
            e.target.style.color = '#6b7280';
          }}
          onClick={() => setOpen(false)}
        >
          Cancel
        </button>
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

  if (sent)
    return (
      <span
        style={{
          fontSize: '13px',
          fontWeight: 600,
          color: '#3f6b52',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        <span style={{ fontSize: '16px' }}>✓</span> Request sent
      </span>
    );

  if (!open)
    return (
      <button
        type="button"
        style={{
          background: 'none',
          border: 'none',
          color: '#6b7280',
          fontSize: '12px',
          cursor: 'pointer',
          padding: '4px 8px',
          borderRadius: '4px',
          transition: 'background 0.15s ease, color 0.15s ease',
          textDecoration: 'underline',
          textUnderlineOffset: '2px',
          textDecorationColor: '#dce1e8',
        }}
        onMouseEnter={(e) => {
          e.target.style.background = '#f0f2f5';
          e.target.style.color = '#2c3e50';
        }}
        onMouseLeave={(e) => {
          e.target.style.background = 'none';
          e.target.style.color = '#6b7280';
        }}
        onClick={() => setOpen(true)}
      >
        Send a general inquiry instead
      </button>
    );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        maxWidth: '420px',
        marginTop: '8px',
        padding: '12px',
        background: '#f8fafc',
        borderRadius: '8px',
        border: '1px solid #eef2f6',
      }}
    >
      {error && (
        <p
          style={{
            color: '#b91c1c',
            fontSize: '12px',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span>⚠️</span> {error}
        </p>
      )}
      <textarea
        style={{
          width: '100%',
          padding: '8px 12px',
          fontSize: '13px',
          borderRadius: '6px',
          border: '1px solid #dce1e8',
          backgroundColor: '#ffffff',
          fontFamily: 'inherit',
          resize: 'vertical',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
          outline: 'none',
          boxSizing: 'border-box',
          minHeight: '50px',
        }}
        rows={2}
        placeholder="We handle corrosion control testing across your whole system..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onFocus={(e) => {
          e.target.style.borderColor = '#2c3e50';
          e.target.style.boxShadow = '0 0 0 3px rgba(44,62,80,0.08)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = '#dce1e8';
          e.target.style.boxShadow = 'none';
        }}
      />
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          type="button"
          style={{
            padding: '6px 18px',
            fontSize: '12px',
            fontWeight: 600,
            backgroundColor: '#2c3e50',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'background-color 0.2s ease',
            letterSpacing: '0.3px',
          }}
          onClick={handleSend}
          disabled={sending}
          onMouseEnter={(e) => {
            if (!sending) e.target.style.backgroundColor = '#1a2634';
          }}
          onMouseLeave={(e) => {
            if (!sending) e.target.style.backgroundColor = '#2c3e50';
          }}
        >
          {sending ? 'SENDING…' : 'SEND'}
        </button>
        <button
          type="button"
          style={{
            background: 'none',
            border: 'none',
            color: '#6b7280',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer',
            padding: '6px 12px',
            borderRadius: '4px',
            transition: 'background 0.15s ease, color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.target.style.background = '#f0f2f5';
            e.target.style.color = '#2c3e50';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'none';
            e.target.style.color = '#6b7280';
          }}
          onClick={() => setOpen(false)}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

// A collapsed-by-default operator row: name + basic stats as a clickable
// button, expanding to the full regulation table only when opened - keeps a
// long operator list scannable instead of dumping every table at once.
const OperatorCard = ({ op }) => {
  const [expanded, setExpanded] = useState(false);

  const pastDueCount = op.items.filter((it) => it.status === 'past_due').length;
  const dueCount = op.items.filter((it) => it.status === 'due').length;

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #eef2f6',
        overflow: 'hidden',
        marginBottom: '12px',
        transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
        boxShadow: expanded
          ? '0 4px 16px rgba(0,0,0,0.06)'
          : '0 1px 4px rgba(0,0,0,0.02)',
      }}
    >
      <button
        type="button"
        style={{
          width: '100%',
          padding: '16px 20px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          transition: 'background 0.15s ease',
          borderRadius: '0',
          textAlign: 'left',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#f8fafc';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'none';
        }}
        onClick={() => setExpanded((v) => !v)}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: '#1a2634',
            }}
          >
            {op.companyName}
          </span>
          {op.county && (
            <span
              style={{
                fontSize: '12px',
                color: '#6b7280',
                background: '#f0f2f5',
                padding: '2px 10px',
                borderRadius: '12px',
              }}
            >
              {op.county}
            </span>
          )}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: '12px',
              fontWeight: 500,
              color: '#6b7280',
              background: '#f0f2f5',
              padding: '4px 10px',
              borderRadius: '12px',
            }}
          >
            {op.items.length} regulation{op.items.length === 1 ? '' : 's'}
          </span>
          {pastDueCount > 0 && (
            <span
              style={{
                fontSize: '12px',
                fontWeight: 500,
                color: '#ffffff',
                background: '#a23e2a',
                padding: '4px 10px',
                borderRadius: '12px',
              }}
            >
              {pastDueCount} past due
            </span>
          )}
          {dueCount > 0 && (
            <span
              style={{
                fontSize: '12px',
                fontWeight: 500,
                color: '#ffffff',
                background: '#c98a1e',
                padding: '4px 10px',
                borderRadius: '12px',
              }}
            >
              {dueCount} due soon
            </span>
          )}
          <span
            style={{
              fontSize: '14px',
              color: '#6b7280',
              marginLeft: '4px',
              transition: 'transform 0.2s ease',
              display: 'inline-block',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          >
            ▼
          </span>
        </div>
      </button>

      {expanded && (
        <div
          style={{
            padding: '0 20px 20px 20px',
            borderTop: '1px solid #eef2f6',
          }}
        >
          {op.items.length === 0 ? (
            <p
              style={{
                fontSize: '13px',
                color: '#8a94a6',
                margin: '16px 0 8px',
              }}
            >
              No compliance items on file yet.
            </p>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '13px',
                    marginTop: '16px',
                    marginBottom: '12px',
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        borderBottom: '2px solid #eef2f6',
                        textAlign: 'left',
                      }}
                    >
                      <th
                        style={{
                          padding: '8px 6px 8px 0',
                          fontWeight: 600,
                          color: '#4a5568',
                          fontSize: '11px',
                          letterSpacing: '0.3px',
                          textTransform: 'uppercase',
                          width: '20px',
                        }}
                      ></th>
                      <th
                        style={{
                          padding: '8px 6px',
                          fontWeight: 600,
                          color: '#4a5568',
                          fontSize: '11px',
                          letterSpacing: '0.3px',
                          textTransform: 'uppercase',
                        }}
                      >
                        Regulation
                      </th>
                      <th
                        style={{
                          padding: '8px 6px',
                          fontWeight: 600,
                          color: '#4a5568',
                          fontSize: '11px',
                          letterSpacing: '0.3px',
                          textTransform: 'uppercase',
                        }}
                      >
                        Citation
                      </th>
                      <th
                        style={{
                          padding: '8px 6px',
                          fontWeight: 600,
                          color: '#4a5568',
                          fontSize: '11px',
                          letterSpacing: '0.3px',
                          textTransform: 'uppercase',
                        }}
                      >
                        Due
                      </th>
                      <th
                        style={{
                          padding: '8px 6px',
                          fontWeight: 600,
                          color: '#4a5568',
                          fontSize: '11px',
                          letterSpacing: '0.3px',
                          textTransform: 'uppercase',
                        }}
                      >
                        Status
                      </th>
                      <th
                        style={{
                          padding: '8px 0 8px 6px',
                          fontWeight: 600,
                          color: '#4a5568',
                          fontSize: '11px',
                          letterSpacing: '0.3px',
                          textTransform: 'uppercase',
                          textAlign: 'right',
                        }}
                      ></th>
                    </tr>
                  </thead>
                  <tbody>
                    {op.items.map((it) => (
                      <tr
                        key={it.complianceItemId}
                        style={{
                          borderBottom: '1px solid #f0f2f5',
                          transition: 'background 0.1s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#fafbfc';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'none';
                        }}
                      >
                        <td
                          style={{
                            padding: '10px 6px 10px 0',
                            verticalAlign: 'middle',
                          }}
                        >
                          <span
                            style={{
                              display: 'inline-block',
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background:
                                STATUS_COLOR[it.status] || STATUS_COLOR.pending,
                              flexShrink: 0,
                            }}
                          ></span>
                        </td>
                        <td
                          style={{
                            padding: '10px 6px',
                            verticalAlign: 'middle',
                            fontWeight: 500,
                            color: '#1a2634',
                          }}
                        >
                          {it.title}
                        </td>
                        <td
                          style={{
                            padding: '10px 6px',
                            verticalAlign: 'middle',
                            fontFamily:
                              'ui-monospace, SFMono-Regular, monospace',
                            fontSize: '12px',
                            color: '#4a5568',
                          }}
                        >
                          {it.sourceRegulation}
                        </td>
                        <td
                          style={{
                            padding: '10px 6px',
                            verticalAlign: 'middle',
                            color: '#4a5568',
                          }}
                        >
                          {formatDate(it.nextDueDate)}
                        </td>
                        <td
                          style={{
                            padding: '10px 6px',
                            verticalAlign: 'middle',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 500,
                              color:
                                STATUS_COLOR[it.status] || STATUS_COLOR.pending,
                              textTransform: 'capitalize',
                            }}
                          >
                            {STATUS_LABEL[it.status] || it.status}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: '10px 0 10px 6px',
                            verticalAlign: 'middle',
                            textAlign: 'right',
                          }}
                        >
                          <RequestRowButton
                            operatorId={op.operatorId}
                            complianceItemId={it.complianceItemId}
                            itemLabel={`${it.title} (${it.sourceRegulation})`}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: '4px' }}>
                <GeneralRequestButton operatorId={op.operatorId} />
              </div>
            </>
          )}
        </div>
      )}
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
      .then((data) => {
        setOperators(data.operators || []);
        setError('');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '8px 16px',
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
          Find Operators
        </h2>
      </div>
      <p
        style={{
          color: '#6b7280',
          fontSize: '13px',
          marginTop: '4px',
          marginBottom: '20px',
        }}
      >
        Every operator on the platform, with their compliance regulations - open
        a specific one and offer to help with it directly.
      </p>

      {loading && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '40px 0',
            color: '#6b7280',
            fontSize: '10px',
          }}
        >
          <span>Loading operators…</span>
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
          }}
        >
          <span>⚠️</span> {error}
        </div>
      )}

      {!loading && !error && operators.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '48px 20px',
            color: '#6b7280',
          }}
        >
          <p style={{ fontSize: '14px', margin: 0 }}>
            No operators found.
          </p>
        </div>
      )}

      {operators.map((op) => (
        <OperatorCard key={op.operatorId} op={op} />
      ))}
    </div>
  );
};

export default MarketplacePage;