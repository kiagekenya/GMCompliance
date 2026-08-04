import React, { useState, useEffect, useMemo } from 'react';
import './Dashboard.css';
import CompanyLogo from "../../../src/assets/gm_edited.jpg";
import RequirementDetail from '../requirementdetail/RequirementDetail';
import {
  getComplianceItems, completeComplianceItem, updateComplianceItem,
  listContacts, addContact, getArchive, listVendors, addVendor,
} from '../../api/client';

// 'pending' is the honest default for a never-completed item - it is
// deliberately NOT the same visual state as 'compliant'. A fresh install
// should show everything as not-yet-done, not falsely green.
const mapStatusForDisplay = (backendStatus) => {
  if (backendStatus === 'past_due') return 'past due';
  if (backendStatus === 'due' || backendStatus === 'started') return 'due';
  if (backendStatus === 'compliant' || backendStatus === 'done') return 'compliant';
  if (backendStatus === 'pending') return 'pending';
  return '';
};

const mapItemForDisplay = (item) => ({
  id: item._id,
  requirementId: item.requirementId?._id,
  category: item.requirementId?.categoryName || 'Uncategorized',
  citation: item.requirementId?.sourceRegulation || '',
  description: item.requirementId?.title || '',
  referenceUrl: item.requirementId?.referenceUrl || null,
  removable: item.requirementId?.removable,
  frequencyValue: item.resolvedFrequencyValue,
  frequencyUnit: item.resolvedFrequencyUnit,
  frequencyRule: item.resolvedFrequencyValue
    ? `Every ${item.resolvedFrequencyValue} ${item.resolvedFrequencyUnit}`
    : 'Interval not yet set',
  requiresOperatorInput: item.requiresOperatorInput,
  lastCompleted: item.lastCompletedDate,
  nextDue: item.nextDueDate,
  pendingCompletedDate: item.pendingCompletedDate,
  pendingEvidenceUrl: item.pendingEvidenceUrl,
  pendingNotes: item.pendingNotes,
  assignedContactId: item.assignedContactId?._id || null,
  assignedContactName: item.assignedContactId?.fullName || null,
  assignedVendorId: item.assignedVendorId?._id || null,
  assignedVendorName: item.assignedVendorId?.companyName || null,
  assigned: item.assignedContactId?.fullName || item.assignedVendorId?.companyName || 'Unassigned',
  status: mapStatusForDisplay(item.status),
});

const formatDate = (dateString) => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
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
  const needleAngle = -120 + (240 * (angle + 120)) / 240;
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
    </svg>
  );
};

const ComplianceDashboard = ({ configData }) => {
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedRequirement, setSelectedRequirement] = useState(null);
  const [openBreakdownCat, setOpenBreakdownCat] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [mainView, setMainView] = useState('ledger'); // 'ledger' | 'archive' | 'escalation' | 'vendors'
  const [archiveEntries, setArchiveEntries] = useState([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [newContact, setNewContact] = useState({ fullName: '', title: '', email: '', phone: '', escalationLevel: '' });
  const [addingContact, setAddingContact] = useState(false);
  const [addContactError, setAddContactError] = useState('');

  const [vendorList, setVendorList] = useState(configData?.vendors || []);
  const [newVendor, setNewVendor] = useState({ companyName: '', personnelName: '', email: '', phone: '', serviceScope: '' });
  const [addingVendor, setAddingVendor] = useState(false);
  const [addVendorError, setAddVendorError] = useState('');

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

  const fetchContacts = () => {
    listContacts()
      .then((data) => {
        const sorted = [...(data.contacts || [])].sort((a, b) => a.escalationLevel - b.escalationLevel);
        setContacts(sorted);
      })
      .catch((err) => console.error('[Dashboard] listContacts failed:', err));
  };

  const fetchArchive = () => {
    setArchiveLoading(true);
    getArchive()
      .then((data) => setArchiveEntries(data.entries || []))
      .catch((err) => console.error('[Dashboard] getArchive failed:', err))
      .finally(() => setArchiveLoading(false));
  };

  const fetchVendors = () => {
    listVendors()
      .then((data) => setVendorList(data.vendors || []))
      .catch((err) => console.error('[Dashboard] listVendors failed:', err));
  };

  useEffect(() => {
    fetchItems();
    fetchContacts();
    fetchVendors();
  }, []);

  const CATEGORIES = useMemo(() => {
    const seen = new Map();
    requirements.forEach((r) => { if (!seen.has(r.category)) seen.set(r.category, r.category); });
    return Array.from(seen.keys()).map((key) => ({ key, label: key }));
  }, [requirements]);

  // Two distinct kinds of update from RequirementDetail:
  //  'edit'     - assignment + draft completion info. No status change.
  //  'complete' - the gated confirm step. The backend itself enforces that
  //               an owner + evidence already exist (422 if not) - this
  //               just surfaces that error clearly if it happens.
  const handleRequirementUpdate = async (id, updates) => {
    try {
      if (updates.kind === 'edit') {
        const payload = {};
        if (updates.assignedId) {
          if (updates.assigneeType === 'vendor') payload.assignedVendorId = updates.assignedId;
          else payload.assignedContactId = updates.assignedId;
        }
        if (updates.pendingCompletedDate !== undefined) payload.pendingCompletedDate = updates.pendingCompletedDate;
        if (updates.pendingEvidenceUrl !== undefined) payload.pendingEvidenceUrl = updates.pendingEvidenceUrl;
        if (updates.pendingNotes !== undefined) payload.pendingNotes = updates.pendingNotes;
        await updateComplianceItem(id, payload);
        console.log(`[Dashboard] edited item ${id}`, payload);
      } else if (updates.kind === 'complete') {
        await completeComplianceItem(id, {});
        console.log(`[Dashboard] confirmed compliant on item ${id}`);
        fetchArchive();
      }
    } catch (err) {
      console.error('[Dashboard] handleRequirementUpdate failed:', err);
      setLoadError(err.message);
      return;
    }

    fetchItems();
    setSelectedRequirement(null);
  };

  const handleAddContact = async (contactData) => {
    try {
      await addContact({
        fullName: contactData.fullName,
        title: contactData.title,
        email: contactData.email,
        phone: contactData.phone,
        escalationLevel: contactData.escalationLevel || contacts.length + 1,
      });
      console.log('[Dashboard] contact added');
      fetchContacts();
    } catch (err) {
      console.error('[Dashboard] addContact failed:', err);
      setLoadError(err.message);
    }
  };

  const handleSubmitNewContact = async (e) => {
    e.preventDefault();
    setAddContactError('');
    if (!newContact.fullName || !newContact.email || !newContact.phone) {
      setAddContactError('Name, email, and phone are all required.');
      return;
    }
    setAddingContact(true);
    try {
      await addContact({
        fullName: newContact.fullName,
        title: newContact.title,
        email: newContact.email,
        phone: newContact.phone,
        escalationLevel: Number(newContact.escalationLevel) || contacts.length + 1,
      });
      setNewContact({ fullName: '', title: '', email: '', phone: '', escalationLevel: '' });
      fetchContacts();
    } catch (err) {
      console.error('[Dashboard] addContact failed:', err);
      setAddContactError(err.message);
    } finally {
      setAddingContact(false);
    }
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
    const el = document.getElementById(`cat-${cat.replace(/\s/g, '')}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const toggleBreakdown = (catKey) => {
    setOpenBreakdownCat((prev) => (prev === catKey ? null : catKey));
  };

  const goToLedger = () => { setMainView('ledger'); setSelectedRequirement(null); };
  const goToArchive = () => { setMainView('archive'); fetchArchive(); };
  const goToEscalation = () => { setMainView('escalation'); fetchContacts(); };
  const goToVendors = () => { setMainView('vendors'); fetchVendors(); };

  const handleSubmitNewVendor = async (e) => {
    e.preventDefault();
    setAddVendorError('');
    if (!newVendor.companyName) {
      setAddVendorError('Company name is required.');
      return;
    }
    setAddingVendor(true);
    try {
      await addVendor(newVendor);
      setNewVendor({ companyName: '', personnelName: '', email: '', phone: '', serviceScope: '' });
      fetchVendors();
    } catch (err) {
      console.error('[Dashboard] addVendor failed:', err);
      setAddVendorError(err.message);
    } finally {
      setAddingVendor(false);
    }
  };

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="brand">
          <img src={CompanyLogo} alt="Galaxy Midstream" className="company-logo" />
        </div>

        <div className="operator-section">
          <div className="operator-label">OPERATOR</div>
          <div className="operator-name">{configData?.operatorName || 'Yunoya LTD'}</div>
        </div>

        <nav className="sidebar-nav">
          <a href="#calendar" className={mainView === 'ledger' ? 'active' : ''} onClick={(e) => { e.preventDefault(); goToLedger(); }}>
            <i className="fas fa-calendar-alt" aria-hidden="true"></i>
            <span>CALENDAR</span>
          </a>
          <a href="#escalation" className={mainView === 'escalation' ? 'active' : ''} onClick={(e) => { e.preventDefault(); goToEscalation(); }}>
            <i className="fas fa-arrow-up" aria-hidden="true"></i>
            <span>ESCALATION LADDER</span>
          </a>
          <a href="#vendors" className={mainView === 'vendors' ? 'active' : ''} onClick={(e) => { e.preventDefault(); goToVendors(); }}>
            <i className="fas fa-store" aria-hidden="true"></i>
            <span>VENDORS</span>
          </a>
          <a href="#">
            <i className="fas fa-chart-bar" aria-hidden="true"></i>
            <span>REPORTS</span>
          </a>
          <a href="#archive" className={mainView === 'archive' ? 'active' : ''} onClick={(e) => { e.preventDefault(); goToArchive(); }}>
            <i className="fas fa-archive" aria-hidden="true"></i>
            <span>AUDIT ARCHIVE</span>
          </a>
          <a href="#">
            <i className="fas fa-cog" aria-hidden="true"></i>
            <span>SYSTEM SETTINGS</span>
          </a>
        </nav>

        <div className="user-badge">
          <strong>Jacob Kiage</strong>
        </div>
      </aside>

      <main className="main-content">
        {loading && <p>Loading your compliance calendar…</p>}
        {loadError && <p style={{ color: '#c0392b' }}>⚠ {loadError}</p>}

        {!loading && !loadError && mainView === 'escalation' && (
          <>
            <h2>Escalation Ladder</h2>
            <div className="ledger-scroll" style={{ height: 'auto' }}>
              <table>
                <thead>
                  <tr><th>Level</th><th>Name</th><th>Title</th><th>Email</th><th>Phone</th></tr>
                </thead>
                <tbody>
                  {contacts.length === 0 ? (
                    <tr><td colSpan="5" style={{ padding: 16, opacity: 0.7 }}>No contacts yet - add one below.</td></tr>
                  ) : contacts.map((c) => (
                    <tr key={c._id}>
                      <td>{c.escalationLevel}</td>
                      <td>{c.fullName}</td>
                      <td>{c.title}</td>
                      <td>{c.email}</td>
                      <td>{c.phone}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <form onSubmit={handleSubmitNewContact} className="ledger-scroll" style={{ height: 'auto', padding: 16, marginTop: 16 }}>
              <div className="card-label" style={{ marginBottom: 10 }}>ADD CONTACT</div>
              {addContactError && <p style={{ color: '#c0392b', fontSize: 13 }}>{addContactError}</p>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <input placeholder="Full name" value={newContact.fullName} onChange={(e) => setNewContact({ ...newContact, fullName: e.target.value })} />
                <input placeholder="Title" value={newContact.title} onChange={(e) => setNewContact({ ...newContact, title: e.target.value })} />
                <input placeholder="Email" value={newContact.email} onChange={(e) => setNewContact({ ...newContact, email: e.target.value })} />
                <input placeholder="Phone" value={newContact.phone} onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })} />
                <input placeholder="Escalation level (1 = notified first)" type="number" min="1" value={newContact.escalationLevel} onChange={(e) => setNewContact({ ...newContact, escalationLevel: e.target.value })} />
              </div>
              <button type="submit" className="action-button save" disabled={addingContact}>
                {addingContact ? 'ADDING…' : 'ADD CONTACT'}
              </button>
            </form>
          </>
        )}

        {!loading && !loadError && mainView === 'vendors' && (
          <>
            <h2>Vendors</h2>
            <div className="ledger-scroll" style={{ height: 'auto' }}>
              <table>
                <thead>
                  <tr><th>Company</th><th>Contact Person</th><th>Email</th><th>Phone</th><th>Service Scope</th></tr>
                </thead>
                <tbody>
                  {vendorList.length === 0 ? (
                    <tr><td colSpan="5" style={{ padding: 16, opacity: 0.7 }}>No vendors yet - add one below.</td></tr>
                  ) : vendorList.map((v) => (
                    <tr key={v._id || v.id}>
                      <td>{v.companyName}</td>
                      <td>{v.personnelName}</td>
                      <td>{v.email}</td>
                      <td>{v.phone}</td>
                      <td>{v.serviceScope}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <form onSubmit={handleSubmitNewVendor} className="ledger-scroll" style={{ height: 'auto', padding: 16, marginTop: 16 }}>
              <div className="card-label" style={{ marginBottom: 10 }}>ADD VENDOR</div>
              {addVendorError && <p style={{ color: '#c0392b', fontSize: 13 }}>{addVendorError}</p>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <input placeholder="Company name" value={newVendor.companyName} onChange={(e) => setNewVendor({ ...newVendor, companyName: e.target.value })} />
                <input placeholder="Contact person" value={newVendor.personnelName} onChange={(e) => setNewVendor({ ...newVendor, personnelName: e.target.value })} />
                <input placeholder="Email" value={newVendor.email} onChange={(e) => setNewVendor({ ...newVendor, email: e.target.value })} />
                <input placeholder="Phone" value={newVendor.phone} onChange={(e) => setNewVendor({ ...newVendor, phone: e.target.value })} />
                <input placeholder="Service scope (e.g. Cathodic Protection Testing)" value={newVendor.serviceScope} onChange={(e) => setNewVendor({ ...newVendor, serviceScope: e.target.value })} style={{ gridColumn: '1 / -1' }} />
              </div>
              <button type="submit" className="action-button save" disabled={addingVendor}>
                {addingVendor ? 'ADDING…' : 'ADD VENDOR'}
              </button>
            </form>
          </>
        )}

        {!loading && !loadError && mainView === 'archive' && (
          <>
            <h2>Audit Archive</h2>
            {archiveLoading && <p>Loading archive…</p>}
            {!archiveLoading && archiveEntries.length === 0 && (
              <p style={{ opacity: 0.7 }}>Nothing logged yet. Entries appear here the moment anything is marked compliant.</p>
            )}
            {!archiveLoading && archiveEntries.length > 0 && (
              <div className="ledger-scroll" style={{ height: 'auto' }}>
                <table>
                  <thead>
                    <tr><th>Date Completed</th><th>Regulation</th><th>Category</th><th>Completed By</th><th>Evidence</th></tr>
                  </thead>
                  <tbody>
                    {archiveEntries.map((entry) => (
                      <tr key={entry.id}>
                        <td>{formatDate(entry.completedDate)}</td>
                        <td>
                          <strong>{entry.regulationTitle}</strong>
                          <div style={{ fontSize: 12, opacity: 0.7 }}>{entry.sourceRegulation}</div>
                        </td>
                        <td>{entry.categoryName}</td>
                        <td>{entry.completedBy}</td>
                        <td>{entry.evidenceUrl || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {!loading && !loadError && mainView === 'ledger' && selectedRequirement && (
          <RequirementDetail
            requirement={selectedRequirement}
            onBack={() => setSelectedRequirement(null)}
            onUpdate={handleRequirementUpdate}
            onAddContact={handleAddContact}
            vendorList={vendorList}
            contactList={contacts}
          />
        )}

        {!loading && !loadError && mainView === 'ledger' && !selectedRequirement && (
          <>
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

            <div className="ledger-scroll">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 32 }}></th>
                    <th>Reference</th>
                    <th>Requirement</th>
                    <th>Due Date</th>
                    <th>Last Completed</th>
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
                          <td colSpan="7" className="category-label-cell">
                            <span className="category-header">
                              <Dial status={catStatus} size={24} />
                              <strong>{cat.label}</strong>
                              <button type="button" className="breakdown-toggle" onClick={() => toggleBreakdown(cat.key)} aria-expanded={isOpen}>
                                <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'}`} aria-hidden="true"></i>
                              </button>
                            </span>
                            {isOpen && (
                              <div className="category-breakdown-dropdown category-breakdown-dropdown--floating">
                                <div className={`cat-count-row cat-count-row--compliant ${counts.compliant === 0 ? 'is-zero' : ''}`}>
                                  <span className="cat-count-dot"></span><span className="cat-count-name">Compliant</span><span className="cat-count-value">{counts.compliant}</span>
                                </div>
                                <div className={`cat-count-row cat-count-row--due ${counts.due === 0 ? 'is-zero' : ''}`}>
                                  <span className="cat-count-dot"></span><span className="cat-count-name">Due</span><span className="cat-count-value">{counts.due}</span>
                                </div>
                                <div className={`cat-count-row cat-count-row--pastdue ${counts.pastDue === 0 ? 'is-zero' : ''}`}>
                                  <span className="cat-count-dot"></span><span className="cat-count-name">Past Due</span><span className="cat-count-value">{counts.pastDue}</span>
                                </div>
                                <div className={`cat-count-row cat-count-row--unset ${counts.unset === 0 ? 'is-zero' : ''}`}>
                                  <span className="cat-count-dot"></span><span className="cat-count-name">Not Completed</span><span className="cat-count-value">{counts.unset}</span>
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
                            <td className="td-due">{formatDate(req.nextDue)}</td>
                            <td className="td-due">{formatDate(req.pendingCompletedDate || req.lastCompleted)}</td>
                            <td className="td-assign">{req.assigned}</td>
                            <td className="td-status">
                              {req.status === 'pending' ? (
                                <><span className="status-dot" style={{ background: '#6B7280' }}></span>Not completed</>
                              ) : req.status ? (
                                <>
                                  <span className="status-dot" style={{ background: req.status === 'past due' ? '#A23E2A' : req.status === 'due' ? '#C98A1E' : '#3F6B52' }}></span>
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
          </>
        )}
      </main>
    </div>
  );
};

export default ComplianceDashboard;
