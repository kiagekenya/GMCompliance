import React, { useState } from 'react';
import './Dashboard.css';
import CompanyLogo from "../../../src/assets/gm_edited.jpg";
import RequirementDetail from '../requirementdetail/RequirementDetail';

const INITIAL_REQUIREMENTS = [
  { id: 'req-1', category: 'Admin & Licensing', citation: '16 TAC §3.1 & §8.51', description: 'P-5 Organization Report renewal', frequencyRule: 'Annually, per RRC-assigned schedule', lastCompleted: null, nextDue: null, assigned: 'Unassigned', status: '' },
  { id: 'req-2', category: 'Admin & Licensing', citation: '16 TAC §3.70', description: 'T-4 Permit to Operate renewal', frequencyRule: 'Annually, filing month by company name (alphabetical)', lastCompleted: null, nextDue: null, assigned: 'Unassigned', status: '' },
  { id: 'req-3', category: 'Admin & Licensing', citation: '16 TAC §8.201', description: 'Pipeline safety/regulatory program fees', frequencyRule: 'Annually, RRC-set due dates', lastCompleted: null, nextDue: null, assigned: 'Unassigned', status: '' },
  { id: 'req-4', category: 'Admin & Licensing', citation: '49 CFR §191.11 / 16 TAC §8.210', description: 'Gas Distribution Annual Report', frequencyRule: 'Annually, by March 15', lastCompleted: null, nextDue: null, assigned: 'Unassigned', status: '' },
  { id: 'req-5', category: 'Admin & Licensing', citation: '49 CFR §191.17 / 16 TAC §8.210', description: 'Gas Transmission & Gathering Annual Report', frequencyRule: 'Annually, by March 15', lastCompleted: null, nextDue: null, assigned: 'Unassigned', status: '' },
  { id: 'req-6', category: 'Admin & Licensing', citation: '16 TAC §8.230', description: 'School piping testing enforcement', frequencyRule: 'Biennially, before school year start', lastCompleted: null, nextDue: null, assigned: 'Unassigned', status: '' },
  { id: 'req-7', category: 'Manuals & OQs', citation: '49 CFR §192.605(a)', description: 'O&M manual review', frequencyRule: '≤15 months, at least once/calendar year', lastCompleted: null, nextDue: null, assigned: 'Unassigned', status: '' },
  { id: 'req-8', category: 'Manuals & OQs', citation: '49 CFR §192.605(c)', description: 'Abnormal response/procedure effectiveness review', frequencyRule: '≤15 months, at least once/calendar year', lastCompleted: null, nextDue: null, assigned: 'Unassigned', status: '' },
  { id: 'req-9', category: 'Manuals & OQs', citation: '49 CFR §192.615(b)', description: 'Emergency plan review & training', frequencyRule: '≤15 months, at least once/calendar year', lastCompleted: null, nextDue: null, assigned: 'Unassigned', status: '' },
  { id: 'req-10', category: 'Manuals & OQs', citation: '49 CFR §192.631(x)', description: 'Control Room Management program review', frequencyRule: 'Annually', lastCompleted: null, nextDue: null, assigned: 'Unassigned', status: '' },
  { id: 'req-11', category: 'Manuals & OQs', citation: '16 TAC §8.206(d)', description: 'Risk-based leak survey program review', frequencyRule: '≤39 months (every 3 years)', lastCompleted: null, nextDue: null, assigned: 'Unassigned', status: '' },
  { id: 'req-12', category: 'Corrosion Control', citation: '49 CFR §192.465(a)', description: 'CP pipeline testing', frequencyRule: '≤15 months, annually', lastCompleted: null, nextDue: null, assigned: 'Unassigned', status: '' },
  { id: 'req-13', category: 'Corrosion Control', citation: '49 CFR §192.465(b)', description: 'Rectifier & CP device inspections', frequencyRule: '≤2.5 months (6x/year)', lastCompleted: null, nextDue: null, assigned: 'Unassigned', status: '' },
  { id: 'req-14', category: 'Corrosion Control', citation: '49 CFR §192.465(c)', description: 'Critical interference bonds/diodes', frequencyRule: '≤15 months, annually', lastCompleted: null, nextDue: null, assigned: 'Unassigned', status: '' },
  { id: 'req-15', category: 'Patrolling & Odorization', citation: '49 CFR §192.705', description: 'ROW patrolling (Class 1-2)', frequencyRule: '≤15 months, annually', lastCompleted: null, nextDue: null, assigned: 'Unassigned', status: '' },
  { id: 'req-16', category: 'Patrolling & Odorization', citation: '49 CFR §192.706', description: 'Transmission leakage surveys', frequencyRule: '≤15 months, annually', lastCompleted: null, nextDue: null, assigned: 'Unassigned', status: '' },
  { id: 'req-17', category: 'Patrolling & Odorization', citation: '49 CFR §192.721', description: 'Distribution line patrolling', frequencyRule: 'Business districts ≥4x/year; outside ≥2x/year', lastCompleted: null, nextDue: null, assigned: 'Unassigned', status: '' },
  { id: 'req-18', category: 'Equipment & Valves', citation: '49 CFR §192.739', description: 'Pressure limiting/regulating station inspections', frequencyRule: '≤15 months, annually', lastCompleted: null, nextDue: null, assigned: 'Unassigned', status: '' },
  { id: 'req-19', category: 'Equipment & Valves', citation: '49 CFR §192.743', description: 'Relief device capacity verification', frequencyRule: '≤15 months, annually', lastCompleted: null, nextDue: null, assigned: 'Unassigned', status: '' },
  { id: 'req-20', category: 'Equipment & Valves', citation: '49 CFR §192.745', description: 'Transmission emergency valve inspections', frequencyRule: '≤15 months, annually', lastCompleted: null, nextDue: null, assigned: 'Unassigned', status: '' },
  { id: 'req-21', category: 'Public Awareness', citation: '49 CFR §192.616 / API RP 1162', description: 'Public awareness messaging', frequencyRule: 'Varies by audience; annual to every 3 years', lastCompleted: null, nextDue: null, assigned: 'Unassigned', status: '' },
  { id: 'req-22', category: 'Public Awareness', citation: '49 CFR §192.616(c)', description: 'Public awareness program effectiveness review', frequencyRule: '≤4 years', lastCompleted: null, nextDue: null, assigned: 'Unassigned', status: '' },
  { id: 'req-23', category: 'Public Awareness', citation: '49 CFR §192.939', description: 'Gas transmission integrity reassessment', frequencyRule: '≤7 years (+6-month extension)', lastCompleted: null, nextDue: null, assigned: 'Unassigned', status: '' },
];

const CATEGORIES = [
  { key: 'Admin & Licensing', label: 'Admin & Licensing' },
  { key: 'Manuals & OQs', label: 'Manuals & OQs' },
  { key: 'Corrosion Control', label: 'Corrosion Control' },
  { key: 'Patrolling & Odorization', label: 'Patrolling & Odorization' },
  { key: 'Equipment & Valves', label: 'Equipment & Valves' },
  { key: 'Public Awareness', label: 'Public Awareness' },
];

const calculateNextDue = (lastCompleted, frequencyRule) => {
  if (!lastCompleted) return null;

  const lastDate = new Date(lastCompleted);
  let monthsToAdd = 12;

  const rule = frequencyRule.toLowerCase();
  if (rule.includes('annually') || rule.includes('year') || rule.includes('≤15 months')) {
    monthsToAdd = 12;
  } else if (rule.includes('biennial') || rule.includes('2 year') || rule.includes('≤39 months') || rule.includes('every 3 years')) {
    monthsToAdd = 24;
  } else if (rule.includes('quarterly') || rule.includes('4x/year')) {
    monthsToAdd = 3;
  } else if (rule.includes('semi-annual') || rule.includes('2x/year')) {
    monthsToAdd = 6;
  } else if (rule.includes('≤7.5 months')) {
    monthsToAdd = 7.5;
  } else if (rule.includes('≤63 months') || rule.includes('5 years')) {
    monthsToAdd = 60;
  } else if (rule.includes('≤4 years')) {
    monthsToAdd = 48;
  } else if (rule.includes('≤7 years')) {
    monthsToAdd = 84;
  } else if (rule.includes('≤2.5 months')) {
    monthsToAdd = 2.5;
  }

  const nextDate = new Date(lastDate);
  nextDate.setMonth(nextDate.getMonth() + monthsToAdd);
  return nextDate.toISOString().split('T')[0];
};

const getStatusFromDue = (dueDate) => {
  if (!dueDate) return '';

  const now = new Date();
  const due = new Date(dueDate);
  const daysUntilDue = Math.ceil((due - now) / (1000 * 60 * 60 * 24));

  if (daysUntilDue < 0) return 'past due';
  if (daysUntilDue <= 90) return 'due';
  return 'compliant';
};

const enrichRequirement = (req) => {
  const nextDue = calculateNextDue(req.lastCompleted, req.frequencyRule);
  const status = getStatusFromDue(nextDue);
  return { ...req, nextDue, status };
};

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
  const [requirements, setRequirements] = useState(() => INITIAL_REQUIREMENTS.map(enrichRequirement));
  const [selectedRequirement, setSelectedRequirement] = useState(null);
  const [, setActiveCategory] = useState(null);
  const [openBreakdownCat, setOpenBreakdownCat] = useState(null);

  // Vendors collected during setup (SystemInit -> App.js userConfig -> here)
  const vendors = configData?.vendors || [];

  const handleRequirementUpdate = (id, updates) => {
    setRequirements((prev) =>
      prev.map((req) => {
        if (req.id === id) {
          const updated = enrichRequirement({ ...req, ...updates });
          if (selectedRequirement?.id === id) {
            setSelectedRequirement(updated);
          }
          return updated;
        }
        return req;
      })
    );
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
        {selectedRequirement ? (
          <RequirementDetail
            requirement={selectedRequirement}
            onBack={() => setSelectedRequirement(null)}
            onUpdate={handleRequirementUpdate}
            vendorList={vendors}
          />
        ) : (
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
                              <td>{req.description}</td>
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

  {/* Top Contact: Overdue */}
  <div className="escalation-item item-overdue">
    <span className="name">Jacob Kiage</span>
    <span className="role">Compliance Lead</span>
    {/* <span className="badge badge-overdue">Overdue</span> */}
  </div>

  {/* Middle Contacts: Due Orange */}
  <div className="escalation-item item-due">
    <span className="name">Paul Wanjau</span>
    <span className="role">Permits Specialist</span>
    {/* <span className="badge badge-due">Due</span> */}
  </div>

  <div className="escalation-item item-due">
    <span className="name">Reuben Moses</span>
    <span className="role">Field Ops</span>
    {/* <span className="badge badge-due">Due</span> */}
  </div>

  <div className="escalation-item item-due">
    <span className="name">Aisha Patel</span>
    <span className="role">Reporting</span>
    {/* <span className="badge badge-due">Due</span> */}
  </div>

  {/* Last Two Contacts: Compliant Green */}
  <div className="escalation-item item-compliant">
    <span className="name">Brian Bollo</span>
    <span className="role">Safety</span>
    {/* <span className="badge badge-compliant">Compliant</span> */}
  </div>

  <div className="escalation-item item-compliant" style={{ borderBottom: 'none' }}>
    <span className="name">Dana Chebet</span>
    <span className="role">OQ Coordinator</span>
    {/* <span className="badge badge-compliant">Compliant</span> */}
  </div>
</div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default ComplianceDashboard;