// MasterLedgerInit.jsx
//
// Calls the real applicability engine (GET /requirements/suggested), shows
// the operator what was matched, and on "INITIALIZE CALENDAR" submits the
// confirmed list to POST /compliance-items/confirm - which is where the
// backend enforces that any operator-defined requirement has a value.
//
// Every failure path here logs full detail to console.error AND shows a
// specific, actionable message in the UI - no generic "something went
// wrong" text anywhere in this file.

import React, { useEffect, useState } from 'react';
import './MasterLedgerInit.css';
import CompanyLogo from "../../../src/assets/gm_edited.jpg";
import { getSuggestedRequirements, confirmComplianceItems, notifySetupComplete } from '../../api/client';

const MasterLedgerInit = ({ configData, onInitializeDashboard }) => {
  const {
    material = 'Steel',
    type = 'Transmission',
    operatorName = 'Yunoya LTD',
  } = configData || {};

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [suggested, setSuggested] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchSuggestions = () => {
    setLoading(true);
    setError('');
    getSuggestedRequirements()
      .then((data) => {
        const items = data.suggestedItems || [];
        console.log(`[MasterLedgerInit] received ${items.length} suggested requirements`, items);

        if (items.length === 0) {
          // This is the exact bug reported: the applicability engine ran
          // successfully but matched nothing. Almost always means the
          // regulatory catalog collection is empty (forgot `npm run seed`),
          // NOT a real "no requirements apply to your pipeline" situation -
          // every pipeline matches at least the Core (license/fee) items.
          console.error('[MasterLedgerInit] 0 requirements matched - this should never happen for a real pipeline profile, since Core items (licenses/fees) always apply. Most likely cause: the backend database has not been seeded.');
          setError(
            'No compliance requirements were matched. This almost always means the backend database has not been seeded yet - ' +
            'ask whoever runs the backend to run "npm run seed", then click Retry below. ' +
            '(If that\u2019s already been done, check the backend terminal log for a line starting with [requirements].)'
          );
        }

        setSuggested(items);
        setLoading(false);
      })
      .catch((err) => {
        console.error('[MasterLedgerInit] getSuggestedRequirements failed:', err);
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Every pipeline is matched against both frameworks - the applicability
  // engine scopes individual requirements via their own smart filter
  // expression, so there's no operator-level PHMSA/TRRC toggle.
  const getRegulationText = () => '49 CFR Part 192 and TRRC (16 TAC)';

  const describeMaterial = (m) => (m === 'Both' ? 'steel and plastic' : m.toLowerCase());
  const describeType = (t) => (t === 'Both' ? 'transmission and distribution' : t.toLowerCase());

  const handleInitialize = async () => {
    setError('');

    if (suggested.length === 0) {
      setError('Nothing to initialize - 0 requirements were matched. See the message above for how to fix this, then click Retry.');
      return;
    }

    setSubmitting(true);

    // NOTE: no anchorDate here on purpose. Every item is created as
    // 'pending' (never completed) - the operator marks each one complete
    // for real, from the dashboard, as they actually verify/perform it.
    // Requirements with no fixed regulatory interval (requiresOperatorInput)
    // go live flagged as "awaiting_input" instead of being blocked here -
    // the operator sets their own interval later, from that requirement's
    // own page (see RequirementDetail.jsx).
    const items = suggested.map((item) => ({
      requirementId: item.requirementId,
      frequencyVariantId: item.frequencyVariantId || undefined,
    }));

    console.log(`[MasterLedgerInit] submitting ${items.length} items to confirm`, items);

    try {
      await confirmComplianceItems(items);
      console.log('[MasterLedgerInit] calendar confirmed successfully');
      notifySetupComplete().catch((err) => console.error('[MasterLedgerInit] notifySetupComplete failed (non-blocking):', err));
      onInitializeDashboard(configData);
    } catch (err) {
      console.error('[MasterLedgerInit] confirmComplianceItems failed:', err);
      const detailText = err.details
        ? ' — ' + err.details.map((d) => `${d.title || d.requirementId}: ${d.error}`).join('; ')
        : '';
      setError(`${err.message}${detailText}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="master-ledger-page">
      <div className="master-ledger-container">
        <div className="master-ledger-content">
          <div className="icon-circle">
            <i className="fas fa-file-alt"></i>
          </div>

          <h1 className="master-title">GENERATE COMPLIANCE CALENDAR</h1>

          <p className="master-description">
            Matching your site against <strong>{getRegulationText()}</strong> for a{' '}
            <strong>{describeMaterial(material)} {describeType(type)} pipeline</strong>.
          </p>

          {loading && <p className="master-note">Running the applicability engine…</p>}

          {error && (
            <div className="master-note" style={{ color: '#c0392b', textAlign: 'left', border: '1px solid #c0392b', borderRadius: 8, padding: 12, margin: '12px 0' }}>
              <strong>⚠ {error}</strong>
              <div style={{ marginTop: 8 }}>
                <button className="init-btn-ghost" onClick={fetchSuggestions}>RETRY</button>
              </div>
            </div>
          )}

          {!loading && !error && (
            <>
              <p className="master-note">
                {suggested.length} requirement{suggested.length === 1 ? '' : 's'} matched for {operatorName}.
              </p>

              {suggested.filter((i) => i.requiresOperatorInput).length > 0 && (
                <div className="operator-defined-list" style={{ textAlign: 'left', margin: '16px 0' }}>
                  <p>
                    <strong>{suggested.filter((i) => i.requiresOperatorInput).length} requirement(s) have no fixed regulatory interval:</strong>{' '}
                    they'll go onto your calendar flagged "Needs frequency" - open each one from the dashboard to set your own review interval.
                  </p>
                </div>
              )}

              <button
                className="init-dashboard-btn"
                onClick={handleInitialize}
                disabled={submitting}
              >
                {submitting ? 'INITIALIZING…' : 'INITIALIZE CALENDAR'}
              </button>
            </>
          )}

          <p className="master-note">
            This process will populate your compliance calendar with requirements tailored to {operatorName}.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MasterLedgerInit;
