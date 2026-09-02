// RequirementDetail.jsx
//
// Two-step workflow:
//  1. EDIT - assign an owner, set the date work was done, attach evidence
//     (multiple files supported - add or remove any of them before saving).
//     Does NOT change status.
//  2. MARK COMPLIANT - gated: disabled until an owner is assigned AND at
//     least one evidence file is attached. Finalizes the completion.
//
// Evidence entries can be either a plain string (legacy - from before real
// file storage existed, no actual file behind it) or an object
// { originalName, storedName, mimeType, size, uploadedBy, uploadedAt } -
// see backend/utils/evidenceStorage.js. Only object entries have a real
// file that can be viewed.

import React, { useState, useEffect } from 'react';
import './RequirementDetail.css';
import { getEvidenceBlobUrl } from '../../api/client';

const CUSTOM_VALUE = '__custom__';

const evidenceLabel = (entry) => (typeof entry === 'string' ? entry : entry.originalName);
const evidenceKey = (entry, idx) => (typeof entry === 'string' ? entry : entry.storedName || idx);
const isViewable = (entry) => typeof entry === 'object' && entry.storedName;

const formatDate = (dateString) => {
  if (!dateString) return 'Not set';
  return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

// Shared row renderer for every place evidence shows up (pending list in
// the ASSIGNMENT card, the EDIT panel, and the COMPLIANCE RECORD card) -
// keeps all three visually identical instead of three hand-rolled versions.
const EvidenceRow = ({ entry, idx, onView, viewing, onRemove }) => (
  <div className="document-item">
    <i className="fas fa-paperclip doc-icon" aria-hidden="true"></i>
    <div className="doc-details">
      <span className="doc-name">{evidenceLabel(entry)}</span>
      {typeof entry === 'object' && entry.uploadedBy && (
        <span className="doc-meta">{entry.uploadedBy === 'assignee' ? 'Submitted by assignee' : 'Attached by admin'}</span>
      )}
    </div>
    {isViewable(entry) && (
      <button type="button" className="doc-view-btn" onClick={() => onView(entry)} disabled={viewing}>
        {viewing ? 'opening…' : 'VIEW'}
      </button>
    )}
    {onRemove && (
      <button type="button" className="doc-remove-btn" onClick={() => onRemove(entry)} aria-label={`Remove ${evidenceLabel(entry)}`}>
        <i className="fas fa-times"></i>
      </button>
    )}
  </div>
);

const RequirementDetail = ({ requirement, onBack, onUpdate, onAddContact, onUploadEvidence, vendorList = [], contactList = [], onGoToBaselineSettings }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [viewingKey, setViewingKey] = useState(null);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Opening this page is what clears the "needs review" notification (see
  // Dashboard.jsx's sidebar badge and ledger icon). Keyed on requirement.id,
  // not an empty dep array, since React Router reuses this same mounted
  // component across different :id params rather than remounting it.
  useEffect(() => {
    if (requirement.needsReview) {
      onUpdate(requirement.id, { kind: 'acknowledgeReview' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requirement.id]);

  const handleViewEvidence = async (entry) => {
    const key = evidenceKey(entry);
    setViewingKey(key);
    try {
      const url = await getEvidenceBlobUrl(entry.storedName);
      window.open(url, '_blank');
    } catch (err) {
      console.error('[RequirementDetail] failed to open evidence:', err);
      setUploadError(err.message);
    } finally {
      setViewingKey(null);
    }
  };

  const [assigneeType, setAssigneeType] = useState(requirement.assignedVendorId ? 'vendor' : 'employee');
  const currentAssignedId = assigneeType === 'vendor' ? requirement.assignedVendorId : requirement.assignedContactId;
  const [selectedId, setSelectedId] = useState(currentAssignedId || CUSTOM_VALUE);

  // No manual date picker here anymore - a date only means something once
  // real evidence exists, and the backend auto-stamps "today" if evidence
  // is attached here without one. See the "Assigned On" display instead,
  // which is a separate, honest timestamp of when the assignment happened.
  const [evidenceFiles, setEvidenceFiles] = useState(requirement.pendingEvidenceUrls || []);
  const [notes, setNotes] = useState(requirement.pendingNotes || '');

  const [showAddContact, setShowAddContact] = useState(false);
  const [newContact, setNewContact] = useState({ fullName: '', title: '', email: '', phone: '' });
  const [addingContact, setAddingContact] = useState(false);

  const needsFrequency = requirement.requiresOperatorInput && !requirement.frequencyValue;
  // The interval is known, but no due date has ever been calculated - the
  // operator hasn't entered a real baseline last-completed date yet (see
  // backend/services/baselineScheduling.js: no fake placeholder is shown
  // instead). Worth flagging loudly once someone is actually assigned to
  // this and waiting on it.
  const needsBaselineDate = !needsFrequency && !requirement.nextDue;
  const [frequencyInput, setFrequencyInput] = useState('');
  const [savingFrequency, setSavingFrequency] = useState(false);

  const employeeOptions = contactList.map((c) => ({ id: c._id, label: c.fullName }));
  const vendorOptions = vendorList.map((v) => ({ id: v._id || v.id, label: v.companyName || v }));
  const currentOptions = assigneeType === 'employee' ? employeeOptions : vendorOptions;

  const hasOwner = Boolean(requirement.assignedContactId || requirement.assignedVendorId);
  const hasEvidence = (requirement.pendingEvidenceUrls || []).length > 0;
  const canMarkCompliant = hasOwner && hasEvidence && !needsFrequency;

  // Reminder progress - "reminder N of M" - reminderCheckpoints is computed
  // server-side (see backend/routes/complianceItems/getItems.js), the
  // frontend just counts how many have already passed.
  const reminderCheckpoints = requirement.reminderCheckpoints || [];
  const now = new Date();
  const reminderNumber = Math.max(1, reminderCheckpoints.filter((d) => new Date(d) <= now).length);
  const totalReminders = reminderCheckpoints.length;

  const [editingReminders, setEditingReminders] = useState(false);
  const [reminderDraft, setReminderDraft] = useState([]);
  const [savingReminders, setSavingReminders] = useState(false);
  const toDateInputValue = (d) => new Date(d).toISOString().slice(0, 10);

  const startEditReminders = () => {
    setReminderDraft(reminderCheckpoints.map(toDateInputValue));
    setEditingReminders(true);
  };
  const updateReminderDraftDate = (idx, value) => {
    setReminderDraft((prev) => prev.map((d, i) => (i === idx ? value : d)));
  };
  const removeReminderDraftDate = (idx) => {
    setReminderDraft((prev) => prev.filter((_, i) => i !== idx));
  };
  const addReminderDraftDate = () => {
    setReminderDraft((prev) => [...prev, toDateInputValue(new Date())]);
  };
  const handleSaveReminders = async () => {
    if (reminderDraft.length === 0) return; // use RESET instead of saving an empty list
    setSavingReminders(true);
    await onUpdate(requirement.id, { kind: 'setReminderDates', dates: reminderDraft });
    setSavingReminders(false);
    setEditingReminders(false);
  };
  const handleResetReminders = async () => {
    setSavingReminders(true);
    await onUpdate(requirement.id, { kind: 'setReminderDates', dates: [] });
    setSavingReminders(false);
    setEditingReminders(false);
  };

  const handleFileSelect = async (event) => {
    const picked = Array.from(event.target.files);
    event.target.value = ''; // allow re-selecting the same file name later
    if (picked.length === 0) return;

    setUploadError('');
    setUploadingEvidence(true);
    try {
      const updated = await onUploadEvidence(requirement.id, picked);
      setEvidenceFiles(updated.pendingEvidenceUrls || []);
    } catch (err) {
      console.error('[RequirementDetail] uploadEvidence failed:', err);
      setUploadError(err.message);
    } finally {
      setUploadingEvidence(false);
    }
  };

  const removeEvidenceFile = (target) => {
    setEvidenceFiles((prev) => prev.filter((f) => f !== target));
  };

  const handleSaveEdit = () => {
    onUpdate(requirement.id, {
      kind: 'edit',
      assigneeType: selectedId === CUSTOM_VALUE ? undefined : assigneeType,
      assignedId: selectedId === CUSTOM_VALUE ? undefined : selectedId,
      pendingEvidenceUrls: evidenceFiles,
      pendingNotes: notes,
    });
    setIsEditing(false);
  };

  const handleMarkCompliant = () => {
    onUpdate(requirement.id, { kind: 'complete' });
  };

  const handleSaveFrequency = async () => {
    const value = Number(frequencyInput);
    if (!value || value <= 0) return;
    setSavingFrequency(true);
    await onUpdate(requirement.id, { kind: 'setFrequency', frequencyValue: value, frequencyUnit: 'months' });
    setSavingFrequency(false);
  };

  const handleAddContact = async () => {
    if (!newContact.fullName || !newContact.email || !newContact.phone) return;
    setAddingContact(true);
    await onAddContact(newContact);
    setAddingContact(false);
    setShowAddContact(false);
    setNewContact({ fullName: '', title: '', email: '', phone: '' });
  };

  const statusClass = requirement.status ? requirement.status.replace(/\s+/g, '-') : 'pending';
  const statusText = requirement.status ? requirement.status.toUpperCase() : 'NOT COMPLETED';

  return (
    <div className="detail-container">
      <button className="back-button" onClick={onBack}>
        <i className="fas fa-arrow-left"></i> BACK TO CALENDAR
      </button>

      <div className="detail-header">
        <div className="detail-citation">{requirement.citation}</div>
        <div className={`detail-status-badge ${statusClass}`}>{statusText}</div>
      </div>

      <h1 className="detail-title">{requirement.description}</h1>
      <p style={{ opacity: 0.7, fontSize: 13, marginTop: -8 }}>{requirement.frequencyRule}</p>

      {needsFrequency && (
        <div className="detail-card detail-banner detail-banner--warning">
          <div className="card-label">⚠ Needs frequency</div>
          <p>
            This regulation has no fixed regulatory interval under PHMSA/TRRC - set your own review
            interval before this item can be scheduled or marked compliant.
          </p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="number"
              min="1"
              className="assignment-input"
              placeholder="e.g. 12"
              value={frequencyInput}
              onChange={(e) => setFrequencyInput(e.target.value)}
              style={{ maxWidth: 120 }}
            />
            <span style={{ fontSize: 13, opacity: 0.75 }}>months</span>
            <button
              className="action-button save"
              onClick={handleSaveFrequency}
              disabled={savingFrequency || !frequencyInput}
            >
              {savingFrequency ? 'SAVING…' : 'SET INTERVAL'}
            </button>
          </div>
        </div>
      )}

      {needsBaselineDate && (
        <div className="detail-card detail-banner detail-banner--warning">
          <div className="card-label">⚠ No due date set yet</div>
          <p>
            {hasOwner
              ? `${requirement.assigned} is assigned to this but has no due date to work from yet. `
              : ''}
            Enter the date this was actually last done in Settings &gt; Baseline last-completed dates -
            that's what calculates a real due date and reminder schedule instead of leaving it blank.
          </p>
          {onGoToBaselineSettings && (
            <button type="button" className="action-button save" onClick={onGoToBaselineSettings}>
              GO SET IT
            </button>
          )}
        </div>
      )}

      {requirement.needsReview && (
        <div className="detail-card detail-banner detail-banner--attention">
          <div className="card-label">📎 Evidence uploaded by assignee</div>
          <p>The assignee submitted evidence through their upload link - review it below, then MARK COMPLIANT once it checks out.</p>
        </div>
      )}

      {uploadError && <p style={{ color: '#c0392b', fontSize: 13 }}>⚠ {uploadError}</p>}

      <div className="detail-two-column">
        <div className="detail-card timeline-card">
          <div className="card-label">TIMELINE</div>
          <div className="timeline-grid">
            <div className="timeline-item">
              <span className="timeline-sub">NEXT DUE</span>
              <span className="timeline-value">{formatDate(requirement.nextDue)}</span>
            </div>
            <div className="timeline-item">
              <span className="timeline-sub">LAST COMPLETED</span>
              <span className="timeline-value">{formatDate(requirement.lastCompleted)}</span>
            </div>
            {requirement.pendingCompletedDate && (
              <div className="timeline-item">
                <span className="timeline-sub">PENDING (not yet confirmed)</span>
                <span className="timeline-value">{formatDate(requirement.pendingCompletedDate)}</span>
              </div>
            )}
          </div>

          {requirement.status === 'due' && totalReminders > 0 && !editingReminders && (
            <div className="reminder-progress">
              <div className="reminder-progress-header">
                <span className="timeline-sub">REMINDER {reminderNumber} OF {totalReminders}</span>
                <button type="button" className="reminder-edit-link" onClick={startEditReminders}>EDIT REMINDERS</button>
              </div>
              <div className="reminder-progress-track">
                {reminderCheckpoints.map((cp, i) => (
                  <span key={i} className={`reminder-progress-segment ${i < reminderNumber ? 'filled' : ''}`}></span>
                ))}
              </div>
              <div className="reminder-progress-dates">
                {reminderCheckpoints.map((cp, i) => (
                  <span key={i} className={i < reminderNumber ? 'sent' : ''}>{formatDate(cp)}</span>
                ))}
              </div>
            </div>
          )}

          {requirement.status === 'due' && editingReminders && (
            <div className="reminder-progress">
              <div className="timeline-sub" style={{ marginBottom: 6 }}>EDIT REMINDER DATES</div>
              {reminderDraft.map((dateVal, i) => (
                <div key={i} className="reminder-edit-row">
                  <input
                    type="date"
                    className="assignment-input"
                    value={dateVal}
                    onChange={(e) => updateReminderDraftDate(i, e.target.value)}
                  />
                  <button type="button" onClick={() => removeReminderDraftDate(i)} aria-label="Remove reminder date">
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              ))}
              <button type="button" className="reminder-edit-link" onClick={addReminderDraftDate}>+ ADD REMINDER DATE</button>

              <div className="action-buttons" style={{ marginTop: 10 }}>
                <button className="action-button save" onClick={handleSaveReminders} disabled={savingReminders || reminderDraft.length === 0}>
                  {savingReminders ? 'SAVING…' : 'SAVE'}
                </button>
                <button className="action-button cancel" onClick={() => setEditingReminders(false)} disabled={savingReminders}>
                  CANCEL
                </button>
                {requirement.hasCustomReminderDates && (
                  <button className="action-button cancel" onClick={handleResetReminders} disabled={savingReminders}>
                    RESET TO AUTO-COMPUTED
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="detail-card assignment-card">
          <div className="card-label">ASSIGNMENT</div>
          <div className="owner-info">
            <div className="owner-avatar">
              <i className={`fas ${requirement.assignedVendorId ? 'fa-truck' : 'fa-user'}`}></i>
            </div>
            <div>
              <div className="owner-label">CURRENT OWNER</div>
              <div className="owner-name">
                {requirement.assignedContactName || requirement.assignedVendorName || 'Unassigned'}
              </div>
            </div>
          </div>
          {(requirement.pendingEvidenceUrls || []).length > 0 && (
            <div className="document-list" style={{ marginTop: 8 }}>
              {requirement.pendingEvidenceUrls.map((entry, idx) => (
                <EvidenceRow
                  key={evidenceKey(entry, idx)}
                  entry={entry}
                  onView={handleViewEvidence}
                  viewing={viewingKey === evidenceKey(entry, idx)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {requirement.lastCompleted && (
        <div className="detail-card detail-banner detail-banner--success">
          <div className="card-label">✓ Marked compliant</div>
          <p>
            This regulation was marked compliant on {formatDate(requirement.lastCompleted)}.
            {requirement.completedEvidenceUrls?.length > 0 ? ' Evidence on file:' : ' No evidence was retained for this completion.'}
          </p>
          {requirement.completedEvidenceUrls?.length > 0 && (
            <div className="document-list">
              {requirement.completedEvidenceUrls.map((entry, idx) => (
                <EvidenceRow
                  key={evidenceKey(entry, idx)}
                  entry={entry}
                  onView={handleViewEvidence}
                  viewing={viewingKey === evidenceKey(entry, idx)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {!isEditing ? (
        <div className="detail-card action-card">
          <div className="action-buttons">
            <button className="action-button edit" onClick={() => setIsEditing(true)}>
              <i className="fas fa-user-edit"></i> EDIT
            </button>
            <button
              className="action-button complete"
              onClick={handleMarkCompliant}
              disabled={!canMarkCompliant}
              title={!canMarkCompliant ? (needsFrequency ? 'Set a review interval first (above)' : 'Assign an owner and attach evidence first (via EDIT)') : ''}
            >
              <i className="fas fa-check-circle"></i> MARK COMPLIANT
            </button>
          </div>
          {!canMarkCompliant && (
            <p style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>
              {needsFrequency
                ? 'Set a review interval above before this can be scheduled or marked compliant.'
                : 'MARK COMPLIANT unlocks once an owner is assigned and at least one evidence file is attached in EDIT.'}
            </p>
          )}
        </div>
      ) : (
        <div className="detail-card action-card">
          <div className="card-label">EDIT</div>

          <div className="assignee-type-toggle">
            <button type="button" className={`assignee-type-btn ${assigneeType === 'employee' ? 'active' : ''}`} onClick={() => { setAssigneeType('employee'); setSelectedId(CUSTOM_VALUE); }}>
              <i className="fas fa-user"></i> EMPLOYEE
            </button>
            <button type="button" className={`assignee-type-btn ${assigneeType === 'vendor' ? 'active' : ''}`} onClick={() => { setAssigneeType('vendor'); setSelectedId(CUSTOM_VALUE); }}>
              <i className="fas fa-truck"></i> VENDOR
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select className="assignment-select" value={selectedId} onChange={(e) => setSelectedId(e.target.value)} style={{ flex: 1 }}>
              <option value={CUSTOM_VALUE} disabled>
                {currentOptions.length === 0 ? `No ${assigneeType === 'employee' ? 'contacts' : 'vendors'} yet - add one` : 'Select...'}
              </option>
              {currentOptions.map((opt) => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
            </select>
            {assigneeType === 'employee' && (
              <button type="button" className="action-button edit" style={{ padding: '8px 12px' }} onClick={() => setShowAddContact((v) => !v)}>
                <i className="fas fa-plus"></i> ADD
              </button>
            )}
          </div>

          {showAddContact && (
            <div className="detail-card" style={{ marginTop: 10, padding: 12 }}>
              <input className="assignment-input" placeholder="Full name" value={newContact.fullName} onChange={(e) => setNewContact({ ...newContact, fullName: e.target.value })} style={{ marginBottom: 8 }} />
              <input className="assignment-input" placeholder="Title" value={newContact.title} onChange={(e) => setNewContact({ ...newContact, title: e.target.value })} style={{ marginBottom: 8 }} />
              <input className="assignment-input" placeholder="Email" value={newContact.email} onChange={(e) => setNewContact({ ...newContact, email: e.target.value })} style={{ marginBottom: 8 }} />
              <input className="assignment-input" placeholder="Phone" value={newContact.phone} onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })} style={{ marginBottom: 8 }} />
              <button className="action-button save" onClick={handleAddContact} disabled={addingContact}>
                {addingContact ? 'ADDING…' : 'SAVE CONTACT'}
              </button>
            </div>
          )}

          {requirement.assignedAt && (
            <p style={{ fontSize: 12, opacity: 0.65, margin: '10px 0 0' }}>
              Assigned on {formatDate(requirement.assignedAt)}. The completion date gets set automatically
              when evidence is attached, or picked by the assignee if they use their upload link.
            </p>
          )}

          <label className="upload-btn" style={{ marginTop: 14, opacity: uploadingEvidence ? 0.6 : 1, pointerEvents: uploadingEvidence ? 'none' : 'auto' }}>
            <i className="fas fa-cloud-upload-alt"></i>
            {uploadingEvidence ? 'UPLOADING…' : 'ATTACH EVIDENCE (select one or more)'}
            <input type="file" multiple style={{ display: 'none' }} onChange={handleFileSelect} disabled={uploadingEvidence} />
          </label>

          {evidenceFiles.length > 0 && (
            <div className="document-list" style={{ marginTop: 8 }}>
              {evidenceFiles.map((entry, idx) => (
                <EvidenceRow
                  key={evidenceKey(entry, idx)}
                  entry={entry}
                  onView={handleViewEvidence}
                  viewing={viewingKey === evidenceKey(entry, idx)}
                  onRemove={removeEvidenceFile}
                />
              ))}
            </div>
          )}

          <input className="assignment-input" placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} style={{ marginTop: 10 }} />

          <div className="action-buttons" style={{ marginTop: 14 }}>
            <button className="action-button save" onClick={handleSaveEdit}>
              <i className="fas fa-save"></i> SAVE
            </button>
            <button className="action-button cancel" onClick={() => setIsEditing(false)}>
              <i className="fas fa-times"></i> CANCEL
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequirementDetail;
