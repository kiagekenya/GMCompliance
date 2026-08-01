import React, { useState, useEffect, useMemo } from 'react';
import './Dashboard.css';
import CompanyLogo from "../../../src/assets/gm_edited.jpg";
import RequirementDetail from '../requirementdetail/RequirementDetail';
import { getComplianceItems, completeComplianceItem } from '../../api/client';

// Everything that used to live here (INITIAL_REQUIREMENTS, calculateNextDue,
// getStatusFromDue, enrichRequirement) is GONE. All dates and statuses now
// come pre-computed from GET /compliance-items - the backend's scheduling
// engine is the single source of truth, so there is no client-side date math
// left in this file at all.

// Backend status values (awaiting_input | compliant | due | started | done |
// past_due) map onto the 3 display states this UI already knows how to draw.
const mapStatusForDisplay = (backendStatus) => {
  if (backendStatus === 'past_due') return 'past due';
  if (backendStatus === 'due' || backendStatus === 'started') return 'due';
  if (backendStatus === 'compliant' || backendStatus === 'done') return 'compliant';
  return ''; // awaiting_input -> shown as "Not set"
};

// Maps one raw ComplianceItem API response into the flat shape this component's
// table/Dial/RequirementDetail already expect (id, category, citation, etc.)
const mapItemForDisplay = (item) => ({
  id: item._id,
  category: item.requirementId?.categoryName || 'Uncategorized',
  citation: item.requirementId?.sourceRegulation || '',
  description: item.requirementId?.title || '',
  referenceUrl: item.requirementId?.referenceUrl || null,
  removable: item.requirementId?.removable,
  frequencyValue: item.resolvedFrequencyValue,
  frequencyUnit: item.resolvedFrequencyUnit,
  requiresOperatorInput: item.requiresOperatorInput,
  lastCompleted: item.lastCompletedDate,
  nextDue: item.nextDueDate,
  assigned: item.assignedVendorId || 'Unassigned', // NOTE: vendor-name display needs a populate on the backend route; left as-is for now
  status: mapStatusForDisplay(item.status),
});

const formatDate = (dateString) => {
  if (!dateString) return 'Not set';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const Dial = ({ status, size = 28 }) => {
  const getStatusColor = (s) => {
    if (s === 'past due') return '#A23E2A';
    if (s === 'due') return '#C98A1E';
    if (s === 'compliant') return '#3F6B52';
    return '#6B7280';
  };

  const color = getStatusColor(status);

  let angle = -120;
  if (status === 'compliant') angle = -60;
  if (status === 'due') angle = 0;
  if (status === 'past due') angle = 60;

  const strokeWidth = size * 0.12;
  const radius = size * 0.38;
  const center = size / 2;
  const startAngle = -120;
  const endAngle = 120;
  const sweep = endAngle - startAngle;
  const needleAngle = startAngle + (sweep * (angle + 120)) / 240;
  const needleRad = (needleAngle * Math.PI) / 180;
  const needleLength = radius * 0.8;
  const needleX = center + needleLength * Math.cos(needleRad);
  const needleY = center + needleLength * Math.sin(needleRad);
  const dialOpacity = status ? 1 : 0.5;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="dial-svg" style={{ opacity: dialOpacity }}>
      <circle cx={center} cy={center} r={radius} fill="none" stroke="#d0d9d4" strokeWidth={strokeWidth * 0.6} />
      <circle cx={center} cy={center} r={radius * 0.3} fill="none" stroke="#3D5560" strokeWidth={strokeWidth * 0.3} />
      <line x1={center} y1={center} x2={needleX} y2={needleY} stroke={color} strokeWidth={strokeWidth * 0.9} strokeLinecap="round" />
      <circle cx={center} cy={center} r={strokeWidth * 0.8} fill="#14191C" />
      <path d={`M ${center + radius * Math.cos((-120 * Math.PI) / 180)} ${center + radius * Math.sin((-120 * Math.PI) / 180)} A ${radius} ${radius} 0 0 1 ${center + radius * Math.cos((-60 * Math.PI) / 180)} ${center + radius * Math.sin((-60 * Math.PI) / 180)}`} fill="none" stroke="#3F6B52" strokeWidth={strokeWidth * 0.5} opacity="0.6" />
      <path d={`M ${center + radius * Math.cos((-20 * Math.PI) / 180)} ${center + radius * Math.sin((-20 * Math.PI) / 180)} A ${radius} ${radius} 0 0 1 ${center + radius * Math.cos((20 * Math.PI) / 180)} ${center + radius * Math.sin((20 * Math.PI) / 180)}`} fill="none" stroke="#C98A1E" strokeWidth={strokeWidth * 0.5} opacity="0.6" />
      <path d={`M ${center + radius * Math.cos((60 * Math.PI) / 180)} ${center + radius * Math.sin((60 * Math.PI) / 180)} A ${radius} ${radius} 0 0 1 ${center + radius * Math.cos((120 * Math.PI) / 180)} ${center + radius * Math.sin((120 * Math.PI) / 180)}`} fill="none" stroke="#A23E2A" strokeWidth={strokeWidth * 0.5} opacity="0.6" />
    </svg>
  );
};

const ComplianceDashboard = ({ configData }) => {
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedRequirement, setSelectedRequirement] = useState(null);
  const [, setActiveCategory] = useState(null);
  const [openBreakdownCat, setOpenBreakdownCat] = useState(null);

  const vendors = configData?.vendors || [];

  const fetchItems = () => {
    setLoading(true);
    getComplianceItems()
      .then((data) => {
        setRequirements((data.items || []).map(mapItemForDisplay));
        setLoadError('');
      })
      .catch((err) => {
        console.error('[Dashboard] getComplianceItems failed:', err);
        setLoadError(err.message);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // The category list is now derived from whatever the backend actually
  // returned, instead of a hardcoded 6-entry array - so it never drifts out
  // of sync with the real catalog again.
  const CATEGORIES = useMemo(() => {
    const seen = new Map();
    requirements.forEach((r) => { if (!seen.has(r.category)) seen.set(r.category, r.category); });
    return Array.from(seen.keys()).map((key) => ({ key, label: key }));
  }, [requirements]);

  // "Save" in RequirementDetail sends { lastCompleted, assigned, ... }. If
  // lastCompleted changed, that's a real completion event - call the backend
  // completion endpoint (which logs to the audit archive and rolls the
  // schedule forward), then refresh from the server rather than guessing
  // the new status/date locally.
  const handleRequirementUpdate = async (id, updates) => {
    const current = requirements.find((r) => r.id === id);
    const completedChanged = updates.lastCompleted && updates.lastCompleted !== current?.lastCompleted;

    if (completedChanged) {
      try {
        await completeComplianceItem(id, { completedDate: updates.lastCompleted });
      } catch (err) {
        console.error('[Dashboard] completeComplianceItem failed:', err);
        setLoadError(err.message);
        return;
      }
    }
    // NOTE: vendor assignment (updates.assigned) is a free-text name in this
    // UI today; wiring it to a real Vendor _id via PATCH /compliance-items/:id
    // is a follow-up once RequirementDetail's vendor picker uses vendor IDs.

    fetchItems();
    setSelectedRequirement(null);
  };

  const categoryStatus = (catKey) => {
    const items = requirements.filter((r) => r.category === catKey);
    if (items.some((r) => r.status === 'past due')) return 'past due';
    if (items.some((r) => r.status === 'due')) return 'due';
    if (items.length > 0 && items.every((r) => r.status === 'compliant')) return 'compliant';
    return '';
  };

  const categoryBreakdown = (catKey) => {
    const items = requirements.filter((r) => r.category === catKey);
    const counts = { compliant: 0, due: 0, pastDue: 0, unset: 0 };
    items.forEach((r) => {
      if (r.status === 'compliant') counts.compliant += 1;
      else if (r.status === 'due') counts.due += 1;
      else if (r.status === 'past due') counts.pastDue += 1;
      else counts.unset += 1;
    });
    return counts;
  };

  const scrollToCategory = (cat) => {
    setActiveCategory(cat);
    const el = document.getElementById(`cat-${cat.replace(/\s/g, '')}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const toggleBreakdown = (catKey) => {
    setOpenBreakdownCat((prev) => (prev === catKey ? null : catKey));
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <img src={CompanyLogo} alt="Galaxy Midstream" className="company-logo" />
        </div>

        <div className="operator-section">
          <div className="operator-label">OPERATOR</div>
          <div className="operator-name">{configData?.operatorName || 'Yunoya LTD'}</div>
        </div>

        <nav className="sidebar-nav">
          <a href="#" className="active">
            <i className="fas fa-calendar-alt" aria-hidden="true"></i>
            <span>CALENDAR</span>
          </a>
          <a href="#">
            <i className="fas fa-arrow-up" aria-hidden="true"></i>
            <span>ESCALATION LADDER</span>
          </a>
          <a href="#">
            <i className="fas fa-store" aria-hidden="true"></i>
            <span>VENDORS</span>
          </a>
          <a href="#">
            <i className="fas fa-chart-bar" aria-hidden="true"></i>
            <span>REPORTS</span>
          </a>
          <a href="#">
            <i className="fas fa-archive" aria-hidden="true"></i>
            <span>AUDIT ARCHIVE</span>
          </a>
          <a href="#">
            <i className="fas fa-cog" aria-hidden="true"></i>
            <span>SYSTEM SETTINGS</span>
          </a>
          <a href="#">
            <i className="fas fa-user-shield" aria-hidden="true"></i>
            <span>SYSTEM ADMIN</span>
          </a>
        </nav>

        <div className="user-badge">
          <strong>Jacob Kiage</strong>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        {loading && <p style={{ padding: 24 }}>Loading your compliance calendar…</p>}
        {loadError && <p style={{ padding: 24, color: '#c0392b' }}>{loadError}</p>}

        {!loading && !loadError && selectedRequirement ? (
          <RequirementDetail
            requirement={selectedRequirement}
            onBack={() => setSelectedRequirement(null)}
            onUpdate={handleRequirementUpdate}
            vendorList={vendors}
          />
        ) : (!loading && !loadError && (
          <>
            {/* Route spine */}
            <div className="route-spine-wrapper">
              <div className="route-spine">
                {CATEGORIES.map((cat, idx) => (
                  <React.Fragment key={cat.key}>
                    <button className="spine-node" onClick={() => scrollToCategory(cat.key)}>
                      <Dial status={categoryStatus(cat.key)} size={28} />
                      <span className="node-label">{cat.label}</span>
                    </button>
                    {idx < CATEGORIES.length - 1 && <span className="spine-connector"></span>}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Ledger + Escalation */}
            <div className="dashboard-grid">
              <div className="ledger-scroll">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 32 }}></th>
                      <th>Reference</th>
                      <th>Requirement</th>
                      <th>Due Date</th>
                      <th>Assigned To</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CATEGORIES.map((cat) => {
                      const items = requirements.filter((r) => r.category === cat.key);
                      const catStatus = categoryStatus(cat.key);
                      const counts = categoryBreakdown(cat.key);
                      const isOpen = openBreakdownCat === cat.key;
                      return (
                        <React.Fragment key={cat.key}>
                          <tr className="category-label" id={`cat-${cat.key.replace(/\s/g, '')}`}>
                            <td colSpan="6" className="category-label-cell">
                              <span className="category-header">
                                <Dial status={catStatus} size={24} />
                                <strong>{cat.label}</strong>
                                <button
                                  type="button"
                                  className="breakdown-toggle"
                                  onClick={() => toggleBreakdown(cat.key)}
                                  aria-expanded={isOpen}
                                >
                                  <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'}`} aria-hidden="true"></i>
                                </button>
                              </span>

                              {isOpen && (
                                <div className="category-breakdown-dropdown category-breakdown-dropdown--floating">
                                  <div className={`cat-count-row cat-count-row--compliant ${counts.compliant === 0 ? 'is-zero' : ''}`}>
                                    <span className="cat-count-dot"></span>
                                    <span className="cat-count-name">Compliant</span>
                                    <span className="cat-count-value">{counts.compliant}</span>
                                  </div>
                                  <div className={`cat-count-row cat-count-row--due ${counts.due === 0 ? 'is-zero' : ''}`}>
                                    <span className="cat-count-dot"></span>
                                    <span className="cat-count-name">Due</span>
                                    <span className="cat-count-value">{counts.due}</span>
                                  </div>
                                  <div className={`cat-count-row cat-count-row--pastdue ${counts.pastDue === 0 ? 'is-zero' : ''}`}>
                                    <span className="cat-count-dot"></span>
                                    <span className="cat-count-name">Past Due</span>
                                    <span className="cat-count-value">{counts.pastDue}</span>
                                  </div>
                                  <div className={`cat-count-row cat-count-row--unset ${counts.unset === 0 ? 'is-zero' : ''}`}>
                                    <span className="cat-count-dot"></span>
                                    <span className="cat-count-name">Not Set</span>
                                    <span className="cat-count-value">{counts.unset}</span>
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                          {items.map((req) => (
                            <tr
                              key={req.id}
                              className="clickable-row"
                              tabIndex={0}
                              role="button"
                              onClick={() => setSelectedRequirement(req)}
                              onKeyDown={(e) => e.key === 'Enter' && setSelectedRequirement(req)}
                            >
                              <td className="td-dial"><Dial status={req.status} size={26} /></td>
                              <td className="td-citation">{req.citation}</td>
                              <td>
                                {req.description}
                                {req.requiresOperatorInput && !req.frequencyValue && (
                                  <span style={{ marginLeft: 8, color: '#C98A1E', fontSize: 11 }}>⚠ needs interval</span>
                                )}
                              </td>
                              <td className="td-due">{req.nextDue ? formatDate(req.nextDue) : 'Not set'}</td>
                              <td className="td-assign">{req.assigned || 'Unassigned'}</td>
                              <td className="td-status">
                                {req.status ? (
                                  <>
                                    <span
                                      className="status-dot"
                                      style={{
                                        background:
                                          req.status === 'past due' ? '#A23E2A' :
                                          req.status === 'due' ? '#C98A1E' : '#3F6B52',
                                      }}
                                    ></span>
                                    {req.status}
                                  </>
                                ) : (
                                  <span className="status-unset">Not set</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Escalation ladder */}
              <div className="escalation-rail">
                <h4>Escalation Ladder</h4>
                <p style={{ padding: '8px 12px', fontSize: 12, opacity: 0.7 }}>
                  Wire this list to GET /api/contacts (sorted by escalationLevel) as a follow-up -
                  it's currently still the placeholder names from the original UI.
                </p>
              </div>
            </div>
          </>
        ))}
      </main>
    </div>
  );
};

export default ComplianceDashboard;
