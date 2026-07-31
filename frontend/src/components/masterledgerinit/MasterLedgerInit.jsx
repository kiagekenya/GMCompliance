// MasterLedgerInit.jsx
//
// This used to be a static confirmation screen with no real logic. It now
// calls the real applicability engine (GET /requirements/suggested), shows
// the operator what was matched, and on "INITIALIZE CALENDAR" submits the
// confirmed list to POST /compliance-items/confirm - which is where the
// backend enforces that any operator-defined requirement has a value.

import React, { useEffect, useState } from 'react';
import './MasterLedgerInit.css';
import CompanyLogo from "../../../src/assets/gm_edited.jpg";
import { getSuggestedRequirements, confirmComplianceItems } from '../../api/client';

const MasterLedgerInit = ({ configData, onInitializeDashboard }) => {
  const {
    phmsa = true,
    trrc = true,
    material = 'Steel',
    type = 'Transmission',
    operatorName = 'Yunoya LTD',
  } = configData || {};

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [suggested, setSuggested] = useState([]);
  // operator-entered values for any item where requiresOperatorInput is true
  const [operatorInputs, setOperatorInputs] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSuggestedRequirements()
      .then((data) => {
        if (cancelled) return;
        setSuggested(data.suggestedItems || []);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const getRegulationText = () => {
    let regs = [];
    if (phmsa) regs.push('49 CFR Part 192');
    if (trrc) regs.push('TRRC (16 TAC)');
    return regs.length > 0 ? regs.join(' and ') : 'applicable regulations';
  };

  const handleOperatorInputChange = (requirementId, value) => {
    setOperatorInputs((prev) => ({ ...prev, [requirementId]: value }));
  };

  const handleInitialize = async () => {
    setError('');

    // Enforce (client-side, mirroring the backend's own 422 check) that every
    // operator_defined item has a value before we even submit.
    const missing = suggested.filter(
      (item) => item.requiresOperatorInput && !operatorInputs[item.requirementId]
    );
    if (missing.length > 0) {
      setError(`Set an interval for: ${missing.map((m) => m.title).join(', ')}`);
      return;
    }

    setSubmitting(true);
    const today = new Date().toISOString().slice(0, 10);

    const items = suggested.map((item) => ({
      requirementId: item.requirementId,
      frequencyVariantId: item.frequencyVariantId || undefined,
      anchorDate: today,
      operatorDefinedFrequencyValue: item.requiresOperatorInput ? Number(operatorInputs[item.requirementId]) : undefined,
      operatorDefinedFrequencyUnit: item.requiresOperatorInput ? 'months' : undefined,
    }));

    try {
      await confirmComplianceItems(items);
      onInitializeDashboard(configData);
    } catch (err) {
      setError(err.details ? `${err.message}: ${JSON.stringify(err.details)}` : err.message);
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
            <strong>{material.toLowerCase()} {type.toLowerCase()} pipeline</strong>.
          </p>

          {loading && <p className="master-note">Running the applicability engine…</p>}
          {error && <p className="master-note" style={{ color: '#c0392b' }}>{error}</p>}

          {!loading && !error && (
            <>
              <p className="master-note">
                {suggested.length} requirement{suggested.length === 1 ? '' : 's'} matched for {operatorName}.
              </p>

              {/* Any requirement with no fixed regulatory interval needs the
                  operator to supply one before the calendar can go live -
                  this is the concrete "operator sets their own interval" case. */}
              {suggested.filter((i) => i.requiresOperatorInput).length > 0 && (
                <div className="operator-defined-list" style={{ textAlign: 'left', margin: '16px 0' }}>
                  <p><strong>These requirements have no fixed regulatory interval - set your own:</strong></p>
                  {suggested.filter((i) => i.requiresOperatorInput).map((item) => (
                    <div key={item.requirementId} className="init-form-group">
                      <label className="init-label">{item.title} (months)</label>
                      <input
                        type="number"
                        min="1"
                        className="init-input"
                        placeholder={item.suggestedDefaultFrequencyValue || 'e.g. 12'}
                        value={operatorInputs[item.requirementId] || ''}
                        onChange={(e) => handleOperatorInputChange(item.requirementId, e.target.value)}
                      />
                    </div>
                  ))}
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
