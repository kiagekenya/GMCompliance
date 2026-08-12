import React, { useState, useEffect, useMemo } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import './Dashboard.css';
import CompanyLogo from "../../../src/assets/gm_edited.jpg";
import RequirementDetail from '../requirementdetail/RequirementDetail';
import SettingsPage from '../settings/SettingsPage';
import {
  getComplianceItems, completeComplianceItem, updateComplianceItem, setItemFrequency, setReminderDates,
  listContacts, addContact, getArchive, listVendors, addVendor, runStatusCheck,
  uploadEvidence, acknowledgeReview, getEvidenceBlobUrl,
} from '../../api/client';

// 'pending' is the honest default for a never-completed item.
const mapStatusForDisplay = (backendStatus) => {
  if (backendStatus === 'past_due') return 'past due';
  if (backendStatus === 'due' || backendStatus === 'started') return 'due';
  if (backendStatus === 'compliant' || backendStatus === 'done') return 'compliant';
  if (backendStatus === 'pending') return 'pending';
  if (backendStatus === 'awaiting_input') return 'needs setup';
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
  assignedAt: item.assignedAt,
  nextDue: item.nextDueDate,
  pendingCompletedDate: item.pendingCompletedDate,
  pendingEvidenceUrls: item.pendingEvidenceUrls || [],
  pendingNotes: item.pendingNotes,
  completedEvidenceUrls: item.completedEvidenceUrls || [],
  reminderCheckpoints: item.reminderCheckpoints || [],
  hasCustomReminderDates: Boolean(item.hasCustomReminderDates),
  needsReview: Boolean(item.pendingSubmittedByAssignee) && !item.pendingReviewedAt && (item.pendingEvidenceUrls || []).length > 0,
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

// Evidence entries can be a plain string (legacy - no real file behind it)
// or an object { originalName, storedName, mimeType, ... } - see
// backend/utils/evidenceStorage.js.
const evidenceLabel = (entry) => (typeof entry === 'string' ? entry : entry.originalName);
const evidenceKey = (entry, idx) => (typeof entry === 'string' ? entry : entry.storedName || idx);
const isViewableEvidence = (entry) => typeof entry === 'object' && entry.storedName;

const Dial = ({ status, size = 28 }) => {
  const getStatusColor = (s) => {
    if (s === 'past due') return '#A23E2A';
    if (s === 'due') return '#C98A1E';
    if (s === 'needs setup') return '#8A5FBF';
    if (s === 'compliant') return '#3F6B52';
    return '#6B7280';
  };
  const color = getStatusColor(status);
  let angle = -120;
  if (status === 'compliant') angle = -60;
  if (status === 'due') angle = 0;
  if (status === 'needs setup') angle = 30;
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

// Worst-first: a day with even one past-due item reads as past-due
// regardless of what else is due that day, and so on down the list.
const STATUS_PRIORITY = ['past due', 'due', 'needs review', 'compliant', 'needs setup', 'pending'];
const STATUS_CLASS = {
  'past due': 'status-pastdue',
  due: 'status-due',
  'needs review': 'status-needsreview',
  compliant: 'status-compliant',
  'needs setup': 'status-setup',
  pending: 'status-pending',
};

const statusKeyForItem = (r) => {
  if (r.status === 'past due') return 'past due';
  if (r.status === 'due') return 'due';
  if (r.needsReview) return 'needs review';
  if (r.status === 'compliant') return 'compliant';
  if (r.status === 'needs setup') return 'needs setup';
  return 'pending';
};

// A plain month-grid calendar. Each day is colored by the worst status
// among its due items (see STATUS_PRIORITY) so compliant and non-compliant
// days actually look different at a glance, not just a uniform badge.
// Clicking a day with exactly one item jumps straight to its regulation; a
// day with several shows a small picker (via onDayClick, which receives
// that day's items); an empty day just goes to the ledger.
const MonthCalendar = ({ requirements, onDayClick }) => {
  const [cursor, setCursor] = useState(new Date());

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const itemsByDay = useMemo(() => {
    const map = {};
    requirements.forEach((r) => {
      if (!r.nextDue) return;
      const d = new Date(r.nextDue);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(r);
      }
    });
    return map;
  }, [requirements, year, month]);

  const dueCountByDay = useMemo(() => {
    const counts = {};
    Object.keys(itemsByDay).forEach((day) => { counts[day] = itemsByDay[day].length; });
    return counts;
  }, [itemsByDay]);

  // Reminder checkpoint dates (see backend/utils/dateMath.js's
  // resolveReminderCheckpoints) plotted separately from due dates - a
  // checkpoint is usually a different day than the actual due date, so this
  // needs its own map rather than reusing itemsByDay.
  const reminderDaysByDay = useMemo(() => {
    const map = {};
    requirements.forEach((r) => {
      if (r.status !== 'due' || !r.reminderCheckpoints) return;
      r.reminderCheckpoints.forEach((cpRaw) => {
        const d = new Date(cpRaw);
        if (d.getFullYear() === year && d.getMonth() === month) {
          const day = d.getDate();
          if (!map[day]) map[day] = [];
          if (!map[day].some((x) => x.id === r.id)) map[day].push(r);
        }
      });
    });
    return map;
  }, [requirements, year, month]);

  const dominantStatusByDay = useMemo(() => {
    const result = {};
    Object.keys(itemsByDay).forEach((day) => {
      const statuses = itemsByDay[day].map(statusKeyForItem);
      result[day] = STATUS_PRIORITY.find((s) => statuses.includes(s)) || 'pending';
    });
    return result;
  }, [itemsByDay]);

  const cells = [];
  for (let i = 0; i < startWeekday; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);

  const today = new Date();
  const isToday = (d) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  return (
    <div className="mini-calendar">
      <div className="mini-calendar-header">
        <button type="button" onClick={() => setCursor(new Date(year, month - 1, 1))} aria-label="Previous month">‹</button>
        <span>{firstOfMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
        <button type="button" onClick={() => setCursor(new Date(year, month + 1, 1))} aria-label="Next month">›</button>
      </div>
      <div className="mini-calendar-weekdays">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={i}>{d}</span>)}
      </div>
      <div className="mini-calendar-grid">
        {cells.map((d, i) => (
          <button
            type="button"
            key={i}
            className={`mini-calendar-day ${d ? '' : 'empty'} ${isToday(d) ? 'today' : ''} ${d && dueCountByDay[d] ? 'has-due' : ''} ${d && dueCountByDay[d] ? STATUS_CLASS[dominantStatusByDay[d]] : ''}`}
            disabled={!d}
            onClick={() => {
              if (!d) return;
              const due = itemsByDay[d] || [];
              const reminders = reminderDaysByDay[d] || [];
              const merged = [...due];
              reminders.forEach((r) => { if (!merged.some((x) => x.id === r.id)) merged.push(r); });
              onDayClick(merged);
            }}
          >
            {d && (
              <>
                <span>{d}</span>
                {dueCountByDay[d] && <span className="mini-calendar-badge">{dueCountByDay[d]}</span>}
                {reminderDaysByDay[d] && <span className="mini-calendar-reminder-dot" title="Reminder scheduled"></span>}
              </>
            )}
          </button>
        ))}
      </div>
      <div className="mini-calendar-legend">
        <span><i className="mini-calendar-legend-dot status-pastdue"></i>Past due</span>
        <span><i className="mini-calendar-legend-dot status-due"></i>Due soon</span>
        <span><i className="mini-calendar-legend-dot status-needsreview"></i>Needs review</span>
        <span><i className="mini-calendar-legend-dot status-compliant"></i>Compliant</span>
        <span><i className="mini-calendar-reminder-dot mini-calendar-reminder-dot--legend"></i>Reminder date</span>
      </div>
    </div>
  );
};

const ComplianceDashboard = ({ configData }) => {
  const navigate = useNavigate();
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [openBreakdownCat, setOpenBreakdownCat] = useState(null);
  const [calendarDayPicker, setCalendarDayPicker] = useState(null); // array of items when a multi-item day is clicked
  const [showReviewPopover, setShowReviewPopover] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [archiveEntries, setArchiveEntries] = useState([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [newContact, setNewContact] = useState({ fullName: '', title: '', email: '', phone: '', escalationLevel: '' });
  const [addingContact, setAddingContact] = useState(false);
  const [addContactError, setAddContactError] = useState('');
  const [expandedContactId, setExpandedContactId] = useState(null);
  const [testingNotifications, setTestingNotifications] = useState(false);
  const [testResult, setTestResult] = useState(null);

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
    fetchArchive();
  }, []);

  const CATEGORIES = useMemo(() => {
    const seen = new Map();
    requirements.forEach((r) => { if (!seen.has(r.category)) seen.set(r.category, r.category); });
    return Array.from(seen.keys()).map((key) => ({ key, label: key }));
  }, [requirements]);

  const needsReviewItems = useMemo(() => requirements.filter((r) => r.needsReview), [requirements]);

  const handleRequirementUpdate = async (id, updates) => {
    try {
      if (updates.kind === 'edit') {
        const payload = {};
        if (updates.assignedId) {
          if (updates.assigneeType === 'vendor') payload.assignedVendorId = updates.assignedId;
          else payload.assignedContactId = updates.assignedId;
        }
        if (updates.pendingEvidenceUrls !== undefined) payload.pendingEvidenceUrls = updates.pendingEvidenceUrls;
        if (updates.pendingNotes !== undefined) payload.pendingNotes = updates.pendingNotes;
        await updateComplianceItem(id, payload);
        console.log(`[Dashboard] edited item ${id}`, payload);
      } else if (updates.kind === 'complete') {
        await completeComplianceItem(id, {});
        console.log(`[Dashboard] confirmed compliant on item ${id}`);
        fetchArchive();
      } else if (updates.kind === 'setFrequency') {
        await setItemFrequency(id, { frequencyValue: updates.frequencyValue, frequencyUnit: updates.frequencyUnit || 'months' });
        console.log(`[Dashboard] set frequency on item ${id}`, updates);
        fetchItems();
        return; // stay on the requirement page so the operator sees the new due date
      } else if (updates.kind === 'acknowledgeReview') {
        await acknowledgeReview(id);
        console.log(`[Dashboard] acknowledged review on item ${id}`);
        fetchItems();
        return; // silent - no navigation, this fires automatically on page open
      } else if (updates.kind === 'setReminderDates') {
        await setReminderDates(id, updates.dates);
        console.log(`[Dashboard] set reminder dates on item ${id}`, updates.dates);
        fetchItems();
        return; // stay on the requirement page so the operator sees the updated schedule
      }
    } catch (err) {
      console.error('[Dashboard] handleRequirementUpdate failed:', err);
      setLoadError(err.message);
      return;
    }
    fetchItems();
    navigate('/dashboard');
  };

  // Admin's own direct-attach action (distinct from an assignee's public
  // upload link). Returns the updated item so RequirementDetail can update
  // its local evidence list immediately, without waiting on this refetch.
  const handleUploadEvidence = async (id, files) => {
    const updated = await uploadEvidence(id, files);
    console.log(`[Dashboard] uploaded ${files.length} file(s) to item ${id}`);
    fetchItems();
    return updated;
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

  const handleTestNotifications = async () => {
    setTestingNotifications(true);
    setTestResult(null);
    try {
      const result = await runStatusCheck();
      console.log('[Dashboard] manual notification check result:', result);
      setTestResult(result);
      fetchItems();
    } catch (err) {
      console.error('[Dashboard] runStatusCheck failed:', err);
      setTestResult({ error: err.message });
    } finally {
      setTestingNotifications(false);
    }
  };

  const categoryStatus = (catKey) => {
    const items = requirements.filter((r) => r.category === catKey);
    if (items.some((r) => r.status === 'past due')) return 'past due';
    if (items.some((r) => r.status === 'due')) return 'due';
    if (items.some((r) => r.status === 'needs setup')) return 'needs setup';
    if (items.length > 0 && items.every((r) => r.status === 'compliant')) return 'compliant';
    return '';
  };

  const categoryBreakdown = (catKey) => {
    const items = requirements.filter((r) => r.category === catKey);
    const counts = { compliant: 0, due: 0, pastDue: 0, needsSetup: 0, unset: 0 };
    items.forEach((r) => {
      if (r.status === 'compliant') counts.compliant += 1;
      else if (r.status === 'due') counts.due += 1;
      else if (r.status === 'past due') counts.pastDue += 1;
      else if (r.status === 'needs setup') counts.needsSetup += 1;
      else counts.unset += 1;
    });
    return counts;
  };

  const scrollToCategory = (cat) => {
    const el = document.getElementById(`cat-${cat.replace(/\s/g, '')}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const toggleBreakdown = (catKey) => setOpenBreakdownCat((prev) => (prev === catKey ? null : catKey));

  const assignedItemsFor = (contactId) => requirements.filter((r) => r.assignedContactId === contactId);

  const handleCalendarDayClick = (itemsForDay) => {
    if (!itemsForDay || itemsForDay.length === 0) {
      setCalendarDayPicker(null);
      navigate('/dashboard');
    } else if (itemsForDay.length === 1) {
      setCalendarDayPicker(null);
      navigate(`/dashboard/requirement/${itemsForDay[0].id}`);
    } else {
      setCalendarDayPicker(itemsForDay);
    }
  };

  // ---- Page components (each is a real route, so browser back/forward works) ----

  const LedgerPage = () => (
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
                          <div className={`cat-count-row cat-count-row--needssetup ${counts.needsSetup === 0 ? 'is-zero' : ''}`}>
                            <span className="cat-count-dot" style={{ background: '#8A5FBF' }}></span><span className="cat-count-name">Needs Frequency</span><span className="cat-count-value">{counts.needsSetup}</span>
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
                      onClick={() => navigate(`/dashboard/requirement/${req.id}`)}
                      onKeyDown={(e) => e.key === 'Enter' && navigate(`/dashboard/requirement/${req.id}`)}
                    >
                      <td className="td-dial"><Dial status={req.status} size={26} /></td>
                      <td className="td-citation">{req.citation}</td>
                      <td>
                        {req.description}
                        {req.requiresOperatorInput && !req.frequencyValue && (
                          <span style={{ marginLeft: 8, color: '#C98A1E', fontSize: 11 }}>⚠ needs interval</span>
                        )}
                        {req.needsReview && (
                          <span style={{ marginLeft: 8, color: '#2b7a4b', fontSize: 11 }} title="Evidence uploaded by assignee - needs review">📎 uploaded, needs review</span>
                        )}
                      </td>
                      <td className="td-due">{formatDate(req.nextDue)}</td>
                      <td className="td-due">{formatDate(req.lastCompleted)}</td>
                      <td className="td-assign">{req.assigned}</td>
                      <td className="td-status">
                        {req.status === 'pending' ? (
                          <><span className="status-dot" style={{ background: '#6B7280' }}></span>Not completed</>
                        ) : req.status === 'needs setup' ? (
                          <><span className="status-dot" style={{ background: '#8A5FBF' }}></span>⚠ Needs frequency</>
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
  );

  const RequirementDetailPage = () => {
    const { id } = useParams();
    const requirement = requirements.find((r) => r.id === id);
    if (!requirement) {
      return <p>Loading requirement… (if this doesn't load, it may not exist - go <button onClick={() => navigate('/dashboard')} style={{ textDecoration: 'underline', border: 'none', background: 'none', cursor: 'pointer' }}>back to the calendar</button>)</p>;
    }
    return (
      <RequirementDetail
        requirement={requirement}
        onBack={() => navigate('/dashboard')}
        onUpdate={handleRequirementUpdate}
        onAddContact={handleAddContact}
        onUploadEvidence={handleUploadEvidence}
        vendorList={vendorList}
        contactList={contacts}
      />
    );
  };

  const handleViewArchiveEvidence = async (entry) => {
    try {
      const url = await getEvidenceBlobUrl(entry.storedName);
      window.open(url, '_blank');
    } catch (err) {
      console.error('[Dashboard] failed to open archived evidence:', err);
      setLoadError(err.message);
    }
  };

  const ArchivePage = () => (
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
                  <td><strong>{entry.regulationTitle}</strong><div style={{ fontSize: 12, opacity: 0.7 }}>{entry.sourceRegulation}</div></td>
                  <td>{entry.categoryName}</td>
                  <td>{entry.completedBy}</td>
                  <td>
                    {(entry.evidenceUrls || []).length === 0 ? '—' : (entry.evidenceUrls || []).map((ev, idx) => (
                      <div key={evidenceKey(ev, idx)} style={{ fontSize: 12 }}>
                        {evidenceLabel(ev)}
                        {isViewableEvidence(ev) && (
                          <button
                            type="button"
                            onClick={() => handleViewArchiveEvidence(ev)}
                            style={{ border: 'none', background: 'none', color: '#2b5c8a', cursor: 'pointer', textDecoration: 'underline', marginLeft: 6, fontSize: 12, padding: 0 }}
                          >
                            VIEW
                          </button>
                        )}
                      </div>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );

  const EscalationPage = () => (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Escalation Ladder</h2>
        <div style={{ textAlign: 'right' }}>
          <button className="action-button save" onClick={handleTestNotifications} disabled={testingNotifications}>
            {testingNotifications ? 'CHECKING…' : 'TEST NOTIFICATIONS NOW'}
          </button>
          {testResult && (
            <p style={{ fontSize: 12, marginTop: 6, opacity: 0.8 }}>
              {testResult.error
                ? `⚠ ${testResult.error}`
                : `Checked ${testResult.checked} item(s), ${testResult.updated} status change(s), ${testResult.notified} notification(s) sent. Check the backend console (or your inbox if SMTP is set up).`}
            </p>
          )}
        </div>
      </div>
      <p style={{ opacity: 0.7, fontSize: 13, marginTop: -8 }}>
        Reminders fire automatically once a day as items enter their due window - use the button above to check right now instead of waiting.
      </p>

      <div className="ledger-scroll" style={{ height: 'auto', marginTop: 12 }}>
        <table>
          <thead>
            <tr><th>Level</th><th>Name</th><th>Title</th><th>Email</th><th>Phone</th><th>Assigned Tasks</th></tr>
          </thead>
          <tbody>
            {contacts.length === 0 ? (
              <tr><td colSpan="6" style={{ padding: 16, opacity: 0.7 }}>No contacts yet - add one below.</td></tr>
            ) : contacts.map((c) => {
              const assigned = assignedItemsFor(c._id);
              const isOpen = expandedContactId === c._id;
              return (
                <React.Fragment key={c._id}>
                  <tr>
                    <td>{c.escalationLevel}</td>
                    <td>{c.fullName}</td>
                    <td>{c.title}</td>
                    <td>{c.email}</td>
                    <td>{c.phone}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => setExpandedContactId(isOpen ? null : c._id)}
                        style={{ border: 'none', background: 'none', cursor: assigned.length ? 'pointer' : 'default', textDecoration: assigned.length ? 'underline' : 'none' }}
                        disabled={assigned.length === 0}
                      >
                        {assigned.length} task{assigned.length === 1 ? '' : 's'}
                      </button>
                    </td>
                  </tr>
                  {isOpen && assigned.length > 0 && (
                    <tr>
                      <td colSpan="6" style={{ background: 'rgba(0,0,0,0.03)', padding: 12 }}>
                        {assigned.map((r) => (
                          <div key={r.id} style={{ padding: '4px 0' }}>
                            <button
                              type="button"
                              onClick={() => navigate(`/dashboard/requirement/${r.id}`)}
                              style={{ border: 'none', background: 'none', color: '#2b5c8a', cursor: 'pointer', textDecoration: 'underline', textAlign: 'left' }}
                            >
                              {r.description} <span style={{ opacity: 0.6 }}>({r.status || 'not completed'})</span>
                            </button>
                          </div>
                        ))}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <form onSubmit={handleSubmitNewContact} className="ledger-scroll" style={{ height: 'auto', padding: 16, marginTop: 16 }}>
        <div className="card-label" style={{ marginBottom: 10 }}>ADD CONTACT</div>
        {addContactError && <p style={{ color: '#c0392b', fontSize: 13 }}>{addContactError}</p>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <input className="form-input" placeholder="Full name" value={newContact.fullName} onChange={(e) => setNewContact({ ...newContact, fullName: e.target.value })} />
          <input className="form-input" placeholder="Title" value={newContact.title} onChange={(e) => setNewContact({ ...newContact, title: e.target.value })} />
          <input className="form-input" placeholder="Email" value={newContact.email} onChange={(e) => setNewContact({ ...newContact, email: e.target.value })} />
          <input className="form-input" placeholder="Phone" value={newContact.phone} onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })} />
          <input className="form-input" placeholder="Escalation level (1 = notified first)" type="number" min="1" value={newContact.escalationLevel} onChange={(e) => setNewContact({ ...newContact, escalationLevel: e.target.value })} />
        </div>
        <button type="submit" className="action-button save" disabled={addingContact}>
          {addingContact ? 'ADDING…' : 'ADD CONTACT'}
        </button>
      </form>
    </>
  );

  const VendorsPage = () => (
    <>
      <h2>Vendors</h2>
      <div className="ledger-scroll" style={{ height: 'auto' }}>
        <div className="settings-section-header"><div className="card-label">VENDOR DIRECTORY</div></div>
        <table>
          <thead>
            <tr><th>Company</th><th>Contact Person</th><th>Email</th><th>Phone</th><th>Service Scope</th></tr>
          </thead>
          <tbody>
            {vendorList.length === 0 ? (
              <tr><td colSpan="5" style={{ padding: 16, opacity: 0.7 }}>No vendors yet - add one below.</td></tr>
            ) : vendorList.map((v) => (
              <tr key={v._id || v.id}>
                <td>{v.companyName}</td><td>{v.personnelName}</td><td>{v.email}</td><td>{v.phone}</td><td>{v.serviceScope}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form onSubmit={handleSubmitNewVendor} className="ledger-scroll" style={{ height: 'auto', padding: 16, marginTop: 16 }}>
        <div className="card-label" style={{ marginBottom: 10 }}>ADD VENDOR</div>
        {addVendorError && <p style={{ color: '#c0392b', fontSize: 13 }}>{addVendorError}</p>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <input className="form-input" placeholder="Company name" value={newVendor.companyName} onChange={(e) => setNewVendor({ ...newVendor, companyName: e.target.value })} />
          <input className="form-input" placeholder="Contact person" value={newVendor.personnelName} onChange={(e) => setNewVendor({ ...newVendor, personnelName: e.target.value })} />
          <input className="form-input" placeholder="Email" value={newVendor.email} onChange={(e) => setNewVendor({ ...newVendor, email: e.target.value })} />
          <input className="form-input" placeholder="Phone" value={newVendor.phone} onChange={(e) => setNewVendor({ ...newVendor, phone: e.target.value })} />
          <input className="form-input" placeholder="Service scope" value={newVendor.serviceScope} onChange={(e) => setNewVendor({ ...newVendor, serviceScope: e.target.value })} style={{ gridColumn: '1 / -1' }} />
        </div>
        <button type="submit" className="action-button save" disabled={addingVendor}>
          {addingVendor ? 'ADDING…' : 'ADD VENDOR'}
        </button>
      </form>
    </>
  );

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="brand">
          <img src={CompanyLogo} alt="Galaxy Midstream" className="company-logo" />
        </div>

        <div className="operator-section" style={{ position: 'relative' }}>
          <div className="operator-label">OPERATOR</div>
          <div className="operator-name">{configData?.operatorName || 'Yunoya LTD'}</div>
          {needsReviewItems.length > 0 && (
            <button
              type="button"
              onClick={() => setShowReviewPopover((v) => !v)}
              style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#2b7a4b', fontSize: 12, padding: 0, marginTop: 6 }}
            >
              🔔 {needsReviewItems.length} need{needsReviewItems.length === 1 ? 's' : ''} review
            </button>
          )}
          {showReviewPopover && (
            <div className="category-breakdown-dropdown category-breakdown-dropdown--floating" style={{ position: 'absolute', top: '100%', left: 0, zIndex: 20, minWidth: 240 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <strong style={{ fontSize: 12 }}>NEEDS REVIEW</strong>
                <button type="button" onClick={() => setShowReviewPopover(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }} aria-label="Close">✕</button>
              </div>
              {needsReviewItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { setShowReviewPopover(false); navigate(`/dashboard/requirement/${item.id}`); }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer', padding: '6px 0', fontSize: 12 }}
                >
                  📎 {item.description}
                </button>
              ))}
            </div>
          )}
        </div>

        <nav className="sidebar-nav">
          <a href="/dashboard" onClick={(e) => { e.preventDefault(); navigate('/dashboard'); }}>
            <i className="fas fa-calendar-alt" aria-hidden="true"></i><span>CALENDAR</span>
          </a>
          <a href="/dashboard/escalation" onClick={(e) => { e.preventDefault(); navigate('/dashboard/escalation'); }}>
            <i className="fas fa-arrow-up" aria-hidden="true"></i><span>ESCALATION LADDER</span>
          </a>
          <a href="/dashboard/vendors" onClick={(e) => { e.preventDefault(); navigate('/dashboard/vendors'); }}>
            <i className="fas fa-store" aria-hidden="true"></i><span>VENDORS</span>
          </a>
          <a href="/dashboard/archive" onClick={(e) => { e.preventDefault(); navigate('/dashboard/archive'); }}>
            <i className="fas fa-archive" aria-hidden="true"></i><span>AUDIT ARCHIVE</span>
          </a>
          <a href="/dashboard/settings" onClick={(e) => { e.preventDefault(); navigate('/dashboard/settings'); }}>
            <i className="fas fa-cog" aria-hidden="true"></i><span>SYSTEM SETTINGS</span>
          </a>
        </nav>

        {/* The physical calendar - a real month grid. Days with due items
            show a count badge; clicking a day with one item jumps straight
            to its regulation, a day with several shows the picker below. */}
        <div style={{ position: 'relative' }}>
          <MonthCalendar requirements={requirements} onDayClick={handleCalendarDayClick} />
          {calendarDayPicker && (
            <div className="category-breakdown-dropdown category-breakdown-dropdown--floating" style={{ position: 'absolute', top: 0, left: '100%', zIndex: 20, minWidth: 220 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <strong style={{ fontSize: 12 }}>DUE THIS DAY</strong>
                <button type="button" onClick={() => setCalendarDayPicker(null)} style={{ border: 'none', background: 'none', cursor: 'pointer' }} aria-label="Close">✕</button>
              </div>
              {calendarDayPicker.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { setCalendarDayPicker(null); navigate(`/dashboard/requirement/${item.id}`); }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer', padding: '6px 0', fontSize: 12 }}
                >
                  <span className="status-dot" style={{ background: item.status === 'past due' ? '#A23E2A' : item.status === 'due' ? '#C98A1E' : item.status === 'needs setup' ? '#8A5FBF' : item.status === 'compliant' ? '#3F6B52' : '#6B7280', marginRight: 6 }}></span>
                  {item.description}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="user-badge">
          <strong>Jacob Kiage</strong>
        </div>
      </aside>

      <main className="main-content">
        {loading && <p>Loading your compliance calendar…</p>}
        {loadError && <p style={{ color: '#c0392b' }}>⚠ {loadError}</p>}

        {!loading && !loadError && (
          <Routes>
            <Route path="/dashboard" element={<LedgerPage />} />
            <Route path="/dashboard/archive" element={<ArchivePage />} />
            <Route path="/dashboard/escalation" element={<EscalationPage />} />
            <Route path="/dashboard/vendors" element={<VendorsPage />} />
            <Route path="/dashboard/settings" element={<SettingsPage contacts={contacts} vendorList={vendorList} onContactsChanged={fetchContacts} onVendorsChanged={fetchVendors} onItemsChanged={fetchItems} />} />
            <Route path="/dashboard/requirement/:id" element={<RequirementDetailPage />} />
          </Routes>
        )}
      </main>
    </div>
  );
};

export default ComplianceDashboard;
