import React, { useState } from 'react';
import './SystemInit.css';
import MasterLedgerInit from '../masterledgerinit/MasterLedgerInit';

const STEPS = [
  { key: 1, label: 'Pipeline Asset Profile', hint: 'Pipeline parameters' },
  { key: 2, label: 'Contacts', hint: 'Ownership & escalation' },
  { key: 3, label: 'Vendor Configuration', hint: 'Third party service providers' },
  { key: 4, label: 'Compliance', hint: 'Reporting frameworks' },
];

const DEFAULT_VENDOR = {
  id: 'default-galaxy',
  companyName: 'Galaxy Midstream',
  personnelName: 'George Hayman',
  email: 'ops@galaxymidstream.com',
  phone: '800-555-0199',
  serviceScope: 'Pipeline Integrity & Maintenance',
};

const SystemInit = ({ onComplete }) => {
  const [activeStep, setActiveStep] = useState(1);
  const [showMasterLedger, setShowMasterLedger] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);

  const [formData, setFormData] = useState({
    operatorName: 'Yunoya LTD',
    county: 'Midland',
    location: 'Permian Basin',
    material: 'Steel',
    type: 'Transmission',
    notes: '',
    phmsa: true,
    trrc: true,
  });

  const [contacts, setContacts] = useState([
    {
      id: 1,
      name: 'Jacob Kiage',
      role: 'Engineer',
      email: 'jacobkiage4@gmail.com',
      phone: '0741357536',
    },
  ]);

  // Vendor state initialized with Galaxy Midstream as default
  const [vendors, setVendors] = useState([DEFAULT_VENDOR]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  /* Contact Management */
  const addContact = () => {
    setContacts([
      ...contacts,
      { id: Date.now(), name: '', role: '', email: '', phone: '' },
    ]);
  };

  const updateContact = (id, field, value) => {
    setContacts(contacts.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };

  const removeContact = (id) => {
    if (contacts.length > 1) {
      setContacts(contacts.filter((c) => c.id !== id));
    }
  };

  /* Vendor Management */
  const addVendor = () => {
    setVendors([
      ...vendors,
      {
        id: Date.now(),
        companyName: '',
        personnelName: '',
        email: '',
        phone: '',
        serviceScope: '',
      },
    ]);
  };

  const updateVendor = (id, field, value) => {
    setVendors(vendors.map((v) => (v.id === id ? { ...v, [field]: value } : v)));
  };

  const removeVendor = (id) => {
    // Keep at least one if preferred, or allow deletion
    if (vendors.length > 1) {
      setVendors(vendors.filter((v) => v.id !== id));
    }
  };

  const buildFinalData = () => ({
    ...formData,
    contacts,
    vendors,
  });

  const handleNext = () => {
    if (activeStep < 4) {
      setActiveStep(activeStep + 1);
    } else if (onComplete) {
      onComplete(buildFinalData());
    }
  };

  const handlePrev = () => {
    if (activeStep > 1) setActiveStep(activeStep - 1);
  };

  const handleStepClick = (step) => {
    if (step <= activeStep) setActiveStep(step);
  };

  const handleSkip = () => {
    if (activeStep < 4) {
      setActiveStep(activeStep + 1);
    } else if (onComplete) {
      onComplete(buildFinalData());
    }
  };

  const handleInitializeDashboard = () => {
    if (onComplete) onComplete(buildFinalData());
  };

  if (showMasterLedger) {
    return (
      <MasterLedgerInit
        configData={buildFinalData()}
        onInitializeDashboard={handleInitializeDashboard}
      />
    );
  }

  return (
    <div className="init-page">
      <div className="init-body">
        {/* Step Rail */}
        <aside className="init-rail">
          {STEPS.map((step, idx) => {
            const state =
              step.key === activeStep
                ? 'active'
                : step.key < activeStep
                ? 'done'
                : 'pending';
            return (
              <React.Fragment key={step.key}>
                <button
                  className={`init-rail-step init-rail-step--${state}`}
                  onClick={() => handleStepClick(step.key)}
                  disabled={state === 'pending'}
                >
                  <span className="init-rail-index">
                    {state === 'done' ? '✓' : String(step.key).padStart(2, '0')}
                  </span>
                  <span className="init-rail-copy">
                    <span className="init-rail-label">{step.label}</span>
                    <span className="init-rail-hint">{step.hint}</span>
                  </span>
                </button>
                {idx < STEPS.length - 1 && (
                  <span className="init-rail-connector"></span>
                )}
              </React.Fragment>
            );
          })}
        </aside>

        {/* Main Panel */}
        <section className="init-panel">
          <div>
            <div className="init-panel-head">
              <span className="init-panel-eyebrow">
                STEP {String(activeStep).padStart(2, '0')} / 04
              </span>
              <h2 className="init-panel-title">
                {STEPS[activeStep - 1].label}
              </h2>
              <p className="init-panel-sub">
                {activeStep === 1 && 'Configure your primary pipeline parameters.'}
                {activeStep === 2 && 'Define the contact hierarchy for overdue requirement alerts.'}
                {activeStep === 3 && 'Register third party vendor companies and personnel.'}
                {activeStep === 4 && 'Confirm which reporting frameworks apply.'}
              </p>
            </div>

            <div className="init-form">
              {/* STEP 1: Pipeline Asset Profile */}
              {activeStep === 1 && (
                <>
                  <div className="init-form-group">
                    <label className="init-label">Operator Name</label>
                    <input
                      type="text"
                      name="operatorName"
                      className="init-input"
                      value={formData.operatorName}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="init-form-row">
                    <div className="init-form-group">
                      <label className="init-label">County</label>
                      <input
                        type="text"
                        name="county"
                        className="init-input"
                        value={formData.county}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="init-form-group">
                      <label className="init-label">Location</label>
                      <input
                        type="text"
                        name="location"
                        className="init-input"
                        value={formData.location}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div className="init-form-row">
                    <div className="init-form-group">
                      <label className="init-label">Material</label>
                      <select
                        name="material"
                        className="init-select"
                        value={formData.material}
                        onChange={handleInputChange}
                      >
                        <option value="Steel">Steel</option>
                        <option value="Plastic">Plastic</option>
                      </select>
                    </div>
                    <div className="init-form-group">
                      <label className="init-label">Type</label>
                      <select
                        name="type"
                        className="init-select"
                        value={formData.type}
                        onChange={handleInputChange}
                      >
                        <option value="Transmission">Transmission</option>
                        <option value="Distribution">Distribution</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* STEP 2: Escalation Contacts */}
              {activeStep === 2 && (
                <>
                  <div className="contacts-hint-row">
                    <span className="contacts-hint-label">Escalation Order</span>
                    <button
                      type="button"
                      className="contacts-info-icon"
                      onClick={() => setShowContactInfo((prev) => !prev)}
                      aria-label="Escalation order info"
                    >
                      ⓘ
                    </button>

                    {showContactInfo && (
                      <div className="contacts-info-tooltip">
                        <p>
                          Contacts are ranked by position. The{' '}
                          <strong>first contact</strong> is top level escalation
                          and is notified last when a requirement goes overdue.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="contacts-list">
                    {contacts.map((contact, index) => (
                      <div key={contact.id} className="contact-row">
                        <div className="contact-number">{index + 1}</div>

                        <div className="contact-fields">
                          <input
                            type="text"
                            placeholder="Full Name"
                            value={contact.name}
                            onChange={(e) =>
                              updateContact(contact.id, 'name', e.target.value)
                            }
                            className="init-input"
                          />
                          <input
                            type="text"
                            placeholder="Role / Title"
                            value={contact.role}
                            onChange={(e) =>
                              updateContact(contact.id, 'role', e.target.value)
                            }
                            className="init-input"
                          />
                        </div>

                        <div className="contact-fields">
                          <input
                            type="email"
                            placeholder="Email Address"
                            value={contact.email}
                            onChange={(e) =>
                              updateContact(contact.id, 'email', e.target.value)
                            }
                            className="init-input"
                          />
                          <input
                            type="tel"
                            placeholder="Phone Number"
                            value={contact.phone}
                            onChange={(e) =>
                              updateContact(contact.id, 'phone', e.target.value)
                            }
                            className="init-input"
                          />
                        </div>

                        {contacts.length > 1 && (
                          <button
                            className="remove-contact"
                            onClick={() => removeContact(contact.id)}
                            title="Remove contact"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <button className="add-contact-btn" onClick={addContact}>
                    + ADD CONTACT
                  </button>
                </>
              )}

              {/* STEP 3: Vendor Configuration */}
              {activeStep === 3 && (
                <>
                  <div className="contacts-hint-row">
                    <span className="contacts-hint-label">Service Providers & Vendors</span>
                  </div>

                  <div className="contacts-list">
                    {vendors.map((vendor, index) => (
                      <div key={vendor.id} className="contact-row vendor-row">
                        <div className="contact-number">V{index + 1}</div>

                        <div className="contact-fields">
                          <input
                            type="text"
                            placeholder="Company Name (e.g. Galaxy Midstream)"
                            value={vendor.companyName}
                            onChange={(e) =>
                              updateVendor(vendor.id, 'companyName', e.target.value)
                            }
                            className="init-input"
                          />
                          <input
                            type="text"
                            placeholder="Personnel / Contact Name"
                            value={vendor.personnelName}
                            onChange={(e) =>
                              updateVendor(vendor.id, 'personnelName', e.target.value)
                            }
                            className="init-input"
                          />
                        </div>

                        <div className="contact-fields">
                          <input
                            type="email"
                            placeholder="Vendor Email"
                            value={vendor.email}
                            onChange={(e) =>
                              updateVendor(vendor.id, 'email', e.target.value)
                            }
                            className="init-input"
                          />
                          <input
                            type="tel"
                            placeholder="Phone Number"
                            value={vendor.phone}
                            onChange={(e) =>
                              updateVendor(vendor.id, 'phone', e.target.value)
                            }
                            className="init-input"
                          />
                        </div>

                        <div className="contact-fields" style={{ width: '100%', marginTop: '8px' }}>
                          <input
                            type="text"
                            placeholder="Service Scope (e.g. Inline Inspection, Cathodic Protection)"
                            value={vendor.serviceScope}
                            onChange={(e) =>
                              updateVendor(vendor.id, 'serviceScope', e.target.value)
                            }
                            className="init-input"
                          />
                        </div>

                        {vendors.length > 1 && (
                          <button
                            className="remove-contact"
                            onClick={() => removeVendor(vendor.id)}
                            title="Remove vendor"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <button className="add-contact-btn" onClick={addVendor}>
                    + ADD VENDOR
                  </button>
                </>
              )}

              {/* STEP 4: Compliance */}
              {activeStep === 4 && (
                <>
                  <div className="init-checkbox-group">
                    <label className="init-checkbox-row">
                      <input
                        type="checkbox"
                        name="phmsa"
                        checked={formData.phmsa}
                        onChange={handleInputChange}
                      />
                      <span className="init-checkbox-box"></span>
                      <span className="init-checkbox-copy">
                        <span className="init-checkbox-title">
                          PHMSA (49 CFR)
                        </span>
                        <span className="init-checkbox-desc">
                          Federal pipeline safety framework
                        </span>
                      </span>
                    </label>

                    <label className="init-checkbox-row">
                      <input
                        type="checkbox"
                        name="trrc"
                        checked={formData.trrc}
                        onChange={handleInputChange}
                      />
                      <span className="init-checkbox-box"></span>
                      <span className="init-checkbox-copy">
                        <span className="init-checkbox-title">
                          Texas TRRC (16 TAC)
                        </span>
                        <span className="init-checkbox-desc">
                          State railroad commission rules
                        </span>
                      </span>
                    </label>
                  </div>

                  <div className="init-form-group">
                    <label className="init-label">Notes</label>
                    <textarea
                      name="notes"
                      className="init-textarea"
                      rows={3}
                      placeholder="Anything the compliance lead should know before go-live..."
                      value={formData.notes}
                      onChange={handleInputChange}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="init-actions">
            {activeStep === 3 ? (
              <>
                <button className="init-btn-ghost" onClick={handleSkip}>
                  SKIP VENDOR CONFIG
                </button>
                <button className="init-btn-primary" onClick={handleNext}>
                  COMPLIANCE FRAMEWORK →
                </button>
              </>
            ) : (
              <>
                <button
                  className="init-btn-ghost"
                  onClick={handlePrev}
                  disabled={activeStep === 1}
                >
                  ← BACK
                </button>
                <button
                  className="init-btn-primary"
                  onClick={
                    activeStep < 4 ? handleNext : () => setShowMasterLedger(true)
                  }
                >
                  {activeStep < 4 ? 'PROCEED →' : 'INITIALIZE SYSTEM ✓'}
                </button>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default SystemInit;