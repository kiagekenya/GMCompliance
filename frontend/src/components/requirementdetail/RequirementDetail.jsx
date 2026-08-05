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

const RequirementDetail = ({ requirement, onBack, onUpdate, onAddContact, onUploadEvidence, vendorList = [], contactList = [] }) => {
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

  // Multiple evidence files - an array of file names (placeholder for real
  // storage), each individually removable before saving.
  const [evidenceFiles, setEvidenceFiles] = useState(requirement.pendingEvidenceUrls || []);
  const [notes, setNotes] = useState(requirement.pendingNotes || '');

  const [showAddContact, setShowAddContact] = useState(false);
  const [newContact, setNewContact] = useState({ fullName: '', title: '', email: '', phone: '' });
  const [addingContact, setAddingContact] = useState(false);

  const needsFrequency = requirement.requiresOperatorInput && !requirement.frequencyValue;
  const [frequencyInput, setFrequencyInput] = useState('');
  const [savingFrequency, setSavingFrequency] = useState(false);

  const employeeOptions = contactList.map((c) => ({ id: c._id, label: c.fullName }));
  const vendorOptions = vendorList.map((v) => ({ id: v._id || v.id, label: v.companyName || v }));
  const currentOptions = assigneeType === 'employee' ? employeeOptions : vendorOptions;

  const hasOwner = Boolean(requirement.assignedContactId || requirement.assignedVendorId);
  const hasEvidence = (requirement.pendingEvidenceUrls || []).length > 0;
  const canMarkCompliant = hasOwner && hasEvidence && !needsFrequency;

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
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
        <div className="detail-card" style={{ border: '1px solid #8A5FBF', background: 'rgba(138,95,191,0.08)', marginBottom: 16 }}>
          <div className="card-label" style={{ color: '#8A5FBF' }}>⚠ NEEDS FREQUENCY</div>
          <p style={{ fontSize: 13, margin: '6px 0 10px' }}>
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

      {requirement.needsReview && (
        <div className="detail-card" style={{ border: '1px solid #2b7a4b', background: 'rgba(43,122,75,0.08)', marginBottom: 16 }}>
          <div className="card-label" style={{ color: '#2b7a4b' }}>📎 EVIDENCE UPLOADED BY ASSIGNEE</div>
          <p style={{ fontSize: 13, margin: '6px 0 0' }}>
            The assignee submitted evidence through their upload link - review it below, then MARK COMPLIANT once it checks out.
          </p>
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
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 8 }}>
              {requirement.pendingEvidenceUrls.map((entry, idx) => (
                <div key={evidenceKey(entry, idx)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0' }}>
                  <i className="fas fa-paperclip"></i>
                  <span>
                    {evidenceLabel(entry)}
                    {typeof entry === 'object' && entry.uploadedBy && (
                      <span style={{ opacity: 0.6 }}> — {entry.uploadedBy === 'assignee' ? 'submitted by assignee' : 'attached by admin'}</span>
                    )}
                  </span>
                  {isViewable(entry) && (
                    <button
                      type="button"
                      onClick={() => handleViewEvidence(entry)}
                      disabled={viewingKey === evidenceKey(entry, idx)}
                      style={{ border: 'none', background: 'none', color: '#2b5c8a', cursor: 'pointer', textDecoration: 'underline', fontSize: 12, padding: 0 }}
                    >
                      {viewingKey === evidenceKey(entry, idx) ? 'opening…' : 'VIEW'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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
            <div style={{ marginTop: 8 }}>
              {evidenceFiles.map((entry, idx) => (
                <div key={evidenceKey(entry, idx)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'rgba(0,0,0,0.04)', borderRadius: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 13 }}><i className="fas fa-paperclip"></i> {evidenceLabel(entry)}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {isViewable(entry) && (
                      <button type="button" onClick={() => handleViewEvidence(entry)} style={{ border: 'none', background: 'none', color: '#2b5c8a', cursor: 'pointer', textDecoration: 'underline', fontSize: 12 }}>
                        VIEW
                      </button>
                    )}
                    <button type="button" onClick={() => removeEvidenceFile(entry)} style={{ border: 'none', background: 'none', color: '#A23E2A', cursor: 'pointer' }} aria-label={`Remove ${evidenceLabel(entry)}`}>
                      <i className="fas fa-times"></i>
                    </button>
                  </span>
                </div>
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
