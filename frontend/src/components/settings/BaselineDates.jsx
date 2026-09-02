// BaselineDates.jsx
//
// A new page/section, deliberately kept in its own file instead of growing
// SettingsPage.jsx: lets the operator tell the system when a requirement
// was ACTUALLY last done in real life, instead of the calendar's due dates
// being counted from "today" (the day the calendar was generated - see
// MasterLedgerInit.jsx) as if that were the completion date.
//
// Two-step, nothing changes on the live calendar until Confirm is clicked:
//   1) pick a real last-completed date and hit Calculate - the backend
//      computes what that implies for the next due date but only stages it
//      (see backend/services/baselineScheduling.js's proposeBaseline).
//   2) review the proposed next due date, then Confirm to make it official
//      (or Discard to throw it away and try again). Once confirmed, the new
//      date is exactly what the calendar, dashboard and requirement detail
//      pages already read from - no changes needed there.

import React, { useEffect, useState } from 'react';
import './SettingsPage.css';
import {
  getComplianceItems, proposeBaselineDate, confirmBaselineDate, clearBaselineDate,
} from '../../api/client';

const toInputDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
const formatDate = (d) => (d ? new Date(d).toLocaleDateString() : '—');

const BaselineDates = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [drafts, setDrafts] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [rowErrors, setRowErrors] = useState({});

  const load = () => {
    setLoading(true);
    setError('');
    getComplianceItems()
      .then((data) => setItems(data.items || []))
      .catch((err) => {
        console.error('[BaselineDates] getComplianceItems failed:', err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const withBusy = async (item, fn) => {
    setBusyId(item._id);
    setRowErrors((prev) => ({ ...prev, [item._id]: '' }));
    try {
      const updated = await fn();
      setItems((prev) => prev.map((i) => (i._id === item._id ? updated : i)));
    } catch (err) {
      console.error('[BaselineDates] action failed:', err);
      setRowErrors((prev) => ({ ...prev, [item._id]: err.message }));
    } finally {
      setBusyId(null);
    }
  };

  const handlePropose = (item) => {
    const draft = drafts[item._id];
    if (!draft) return;
    withBusy(item, () => proposeBaselineDate(item._id, draft));
  };
  const handleConfirm = (item) => withBusy(item, () => confirmBaselineDate(item._id));
  const handleDiscard = (item) => withBusy(item, () => clearBaselineDate(item._id));

  return (
    <div>
      <div className="settings-section-label">Baseline last-completed dates</div>
      <p className="settings-loading" style={{ marginTop: -4, marginBottom: 12 }}>
        Each requirement's "next due" date starts out counted from today, purely as a
        placeholder. Enter the date it was actually last done, review the due date that
        produces, then confirm it to make that the official date on your calendar —
        nothing changes until you confirm.
      </p>

      {loading && <p className="settings-loading">Loading requirements…</p>}
      {error && <p className="settings-error">⚠ {error}</p>}

      {!loading && !error && (
        <div className="settings-table-wrap" style={{ marginBottom: 24 }}>
          <table className="settings-table">
            <thead>
              <tr>
                <th>Requirement</th>
                <th>Current next due</th>
                <th>Actually last done on</th>
                <th>Proposed next due</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan="5" className="settings-empty-cell">No requirements on your calendar yet.</td></tr>
              ) : items.map((item) => {
                const requirement = item.requirementId || {};
                const canPropose = Boolean(item.customFrequencyValue || item.resolvedFrequencyValue);
                const hasProposal = Boolean(item.baselineProposedNextDueDate);
                const isBusy = busyId === item._id;

                return (
                  <tr key={item._id}>
                    <td>
                      <div>{requirement.title || 'Untitled requirement'}</div>
                      {item.variantLabel && (
                        <div style={{ fontSize: 11, opacity: 0.7 }}>{item.variantLabel}</div>
                      )}
                    </td>
                    <td>{formatDate(item.nextDueDate)}</td>
                    <td>
                      {!canPropose ? (
                        <span style={{ fontSize: 12, opacity: 0.7 }}>Set a review interval first</span>
                      ) : (
                        <input
                          type="date"
                          className="settings-table-input"
                          max={toInputDate(new Date())}
                          value={drafts[item._id] ?? toInputDate(item.baselineProposedLastCompletedDate || item.lastCompletedDate)}
                          onChange={(e) => setDrafts((prev) => ({ ...prev, [item._id]: e.target.value }))}
                          disabled={isBusy}
                        />
                      )}
                    </td>
                    <td>{hasProposal ? formatDate(item.baselineProposedNextDueDate) : '—'}</td>
                    <td className="settings-row-actions">
                      {hasProposal ? (
                        <>
                          <button className="settings-row-save" disabled={isBusy} onClick={() => handleConfirm(item)}>Confirm</button>
                          <button className="settings-row-cancel" disabled={isBusy} onClick={() => handleDiscard(item)}>Discard</button>
                        </>
                      ) : (
                        <button
                          className="settings-edit-btn"
                          disabled={!canPropose || isBusy || !drafts[item._id]}
                          onClick={() => handlePropose(item)}
                        >
                          Calculate
                        </button>
                      )}
                      {rowErrors[item._id] && (
                        <div className="settings-error" style={{ fontSize: 11 }}>⚠ {rowErrors[item._id]}</div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default BaselineDates;
