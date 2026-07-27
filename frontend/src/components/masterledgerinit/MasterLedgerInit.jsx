// MasterLedgerInit.jsx
import React from 'react';
import './MasterLedgerInit.css';
import CompanyLogo from "../../../src/assets/gm_edited.jpg";

const MasterLedgerInit = ({ configData, onInitializeDashboard }) => {
  const {
    phmsa = true,
    trrc = true,
    material = 'Steel',
    type = 'Transmission',
    operatorName = 'Yunoya LTD',
  } = configData || {};

  const getRegulationText = () => {
    let regs = [];
    if (phmsa) regs.push('49 CFR Part 192');
    if (trrc) regs.push('TRRC (16 TAC)');
    return regs.length > 0 ? regs.join(' and ') : 'applicable regulations';
  };

  return (
    <div className="master-ledger-page">
      <div className="master-ledger-container">
        

        {/* Main Content */}
        <div className="master-ledger-content">
          <div className="icon-circle">
            <i className="fas fa-file-alt"></i>
          </div>

          <h1 className="master-title">GENERATE COMPLIANCE CALENDAR</h1>

          <p className="master-description">
            We will now generate your site specific compliance requirements based on{' '}
            <strong>{getRegulationText()}</strong> for a{' '}
            <strong>{material.toLowerCase()} {type.toLowerCase()} pipeline</strong>.
          </p>

          <button 
  className="init-dashboard-btn" 
  onClick={() => onInitializeDashboard(configData)}
>
  INITIALIZE CALENDAR
</button>

          <p className="master-note">
            This process will populate your compliance calendar with requirements tailored to {operatorName}.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MasterLedgerInit;