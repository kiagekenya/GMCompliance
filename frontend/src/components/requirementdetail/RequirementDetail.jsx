// RequirementDetail.jsx
//
// Two-step workflow, matching how this actually works in practice:
//
//  1. EDIT - the assigned person (or anyone) fills in: who's responsible,
//     the date the work was actually done, and evidence. Saving this does
//     NOT change compliance status - it's just prep/draft info.
//
//  2. MARK COMPLIANT - a gated confirm step. Disabled until an owner is
//     assigned AND evidence is attached. Someone (often a different
//     person - a reviewer) clicks this once everything looks right, which
//     finalizes the completion, writes it to the audit archive, and is the
//     only thing that actually changes the status shown on the dashboard.

import React, { useState } from 'react';
import './RequirementDetail.css';

const CUSTOM_VALUE = '__custom__';

const RequirementDetail = ({ requirement, onBack, onUpdate, onAddContact, vendorList = [], contactList = [] }) => {
  const [isEditing, setIsEditing] = useState(false);

  const [assigneeType, setAssigneeType] = useState(requirement.assignedVendorId ? 'vendor' : 'employee');
  const currentAssignedId = assigneeType === 'vendor' ? requirement.assignedVendorId : requirement.assignedContactId;
  const [selectedId, setSelectedId] = useState(currentAssignedId || CUSTOM_VALUE);

  const [completedDate, setCompletedDate] = useState(
    (requirement.pendingCompletedDate || requirement.lastCompleted || '').slice(0, 10)
  );
  const [evidenceFileName, setEvidenceFileName] = useState(requirement.pendingEvidenceUrl || '');
  const [notes, setNotes] = useState(requirement.pendingNotes || '');

  const [showAddContact, setShowAddContact] = useState(false);
  const [newContact, setNewContact] = useState({ fullName: '', title: '', email: '', phone: '' });
  const [addingContact, setAddingContact] = useState(false);

  const employeeOptions = contactList.map((c) => ({ id: c._id, label: c.fullName }));
  const vendorOptions = vendorList.map((v) => ({ id: v._id || v.id, label: v.companyName || v }));
  const currentOptions = assigneeType === 'employee' ? employeeOptions : vendorOptions;

  const hasOwner = Boolean(requirement.assignedContactId || requirement.assignedVendorId);
  const hasEvidence = Boolean(requirement.pendingEvidenceUrl);
  const canMarkCompliant = hasOwner && hasEvidence;

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    // NOTE: this captures the file NAME only, as a placeholder - real file
    // storage (e.g. S3) is a follow-up. evidenceUrl is just the file name.
    if (file) setEvidenceFileName(file.name);
  };

  const handleSaveEdit = () => {
    onUpdate(requirement.id, {
      kind: 'edit',
      assigneeType: selectedId === CUSTOM_VALUE ? undefined : assigneeType,
      assignedId: selectedId === CUSTOM_VALUE ? undefined : selectedId,
      pendingCompletedDate: completedDate || undefined,
      pendingEvidenceUrl: evidenceFileName || undefined,
      pendingNotes: notes,
    });
    setIsEditing(false);
  };

  const handleMarkCompliant = () => {
    onUpdate(requirement.id, { kind: 'complete' });
  };

  const handleAddContact = async () => {
    if (!newContact.fullName || !newContact.email) return;
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
          {requirement.pendingEvidenceUrl && (
            <div style={{ fontSize: 12, opacity: 0.75, marginTop: 8 }}>
              <i className="fas fa-paperclip"></i> {requirement.pendingEvidenceUrl}
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
              title={!canMarkCompliant ? 'Assign an owner and attach evidence first (via EDIT)' : ''}
            >
              <i className="fas fa-check-circle"></i> MARK COMPLIANT
            </button>
          </div>
          {!canMarkCompliant && (
            <p style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>
              MARK COMPLIANT unlocks once an owner is assigned and evidence is attached in EDIT.
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

          <div className="timeline-item editable" style={{ margin: '14px 0 10px' }}>
            <span className="timeline-sub">DATE COMPLETED</span>
            <input type="date" className="timeline-input" value={completedDate} onChange={(e) => setCompletedDate(e.target.value)} />
          </div>

          <label className="upload-btn">
            <i className="fas fa-cloud-upload-alt"></i>
            {evidenceFileName || 'ATTACH EVIDENCE'}
            <input type="file" style={{ display: 'none' }} onChange={handleFileSelect} />
          </label>

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
