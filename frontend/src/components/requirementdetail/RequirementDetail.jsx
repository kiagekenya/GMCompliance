// RequirementDetail.jsx
//
// Two clearly separate actions on this screen now, on purpose:
//
//  1. "ASSIGN OWNER" - pure metadata. Pick who's responsible for this item
//     (an internal contact or a vendor). Does NOT touch compliance status
//     and does NOT go in the audit archive - it's just "who owns this."
//
//  2. "MARK COMPLIANT" - the real completion event. Set the date it was
//     actually done, who did it, and attach evidence. THIS is the action
//     that changes the status badge and writes a permanent audit archive
//     entry - it's the only thing that can turn an item green.
//
// These used to be smushed into one ambiguous "green button that's
// somehow also an edit form" - they're deliberately separate now.

import React, { useState } from 'react';
import './RequirementDetail.css';

const CUSTOM_VALUE = '__custom__';

const RequirementDetail = ({ requirement, onBack, onUpdate, vendorList = [], contactList = [] }) => {
  const [activePanel, setActivePanel] = useState(null); // null | 'assign' | 'complete'

  // --- Assign Owner panel state ---
  const [assigneeType, setAssigneeType] = useState(
    requirement.assignedVendorId ? 'vendor' : 'employee'
  );
  const currentAssignedId = assigneeType === 'vendor' ? requirement.assignedVendorId : requirement.assignedContactId;
  const [selectedId, setSelectedId] = useState(currentAssignedId || CUSTOM_VALUE);

  // --- Mark Compliant panel state ---
  const today = new Date().toISOString().split('T')[0];
  const [completedDate, setCompletedDate] = useState(today);
  const [completedByName, setCompletedByName] = useState('');
  const [evidenceFileName, setEvidenceFileName] = useState('');
  const [notes, setNotes] = useState('');

  const employeeOptions = contactList.map((c) => ({ id: c._id, label: c.fullName }));
  const vendorOptions = vendorList.map((v) => ({
    id: v._id || v.id,
    label: v.companyName || v,
  }));
  const currentOptions = assigneeType === 'employee' ? employeeOptions : vendorOptions;

  const handleTypeChange = (type) => {
    setAssigneeType(type);
    setSelectedId(CUSTOM_VALUE);
  };

  const handleSaveAssignment = () => {
    if (selectedId === CUSTOM_VALUE) return; // nothing picked
    onUpdate(requirement.id, {
      kind: 'assign',
      assigneeType,
      assignedId: selectedId,
    });
    setActivePanel(null);
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) setEvidenceFileName(file.name);
    // NOTE: this captures the file NAME only, as a placeholder. Real file
    // storage (e.g. uploading to S3 and getting back a URL) is a follow-up -
    // evidenceUrl below is currently just the file name string.
  };

  const handleMarkCompliant = () => {
    if (!completedDate) return;
    onUpdate(requirement.id, {
      kind: 'complete',
      completedDate,
      completedByName: completedByName.trim(),
      evidenceUrl: evidenceFileName || null,
      notes: notes.trim(),
    });
    setActivePanel(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const statusClass = requirement.status ? requirement.status.replace(/\s+/g, '-') : 'pending';
  const statusText = requirement.status ? requirement.status.toUpperCase() : 'NOT COMPLETED';

  return (
    <div className="detail-container">
      <button className="back-button" onClick={onBack}>
        <i className="fas fa-arrow-left"></i>
        BACK TO CALENDAR
      </button>

      <div className="detail-header">
        <div className="detail-citation">{requirement.citation}</div>
        <div className="detail-category">{(requirement.category || '').toUpperCase()}</div>
        <div className={`detail-status-badge ${statusClass}`}>{statusText}</div>
      </div>

      <h1 className="detail-title">{requirement.description}</h1>

      <div className="detail-card regulation-card">
        <div className="card-label">REGULATION RULE</div>
        <div className="regulation-text">{requirement.frequencyRule}</div>
        {requirement.referenceUrl && (
          <a className="regulation-link" href={requirement.referenceUrl} target="_blank" rel="noreferrer">
            <i className="fas fa-file-alt"></i>
            Read Full Regulation Text
          </a>
        )}
      </div>

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
          </div>
        </div>

        <div className="detail-card assignment-card">
          <div className="card-label">ASSIGNMENT</div>
          <div className="owner-info">
            <div className="owner-avatar">
              <i className={`fas ${requirement.assignedVendorId ? 'fa-truck' : 'fa-user'}`}></i>
            </div>
            <div>
              <div className="owner-label">
                CURRENT OWNER
                {requirement.assignedVendorId && <span className="vendor-flag">VENDOR</span>}
              </div>
              <div className="owner-name">
                {requirement.assignedContactName || requirement.assignedVendorName || 'Unassigned'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ASSIGN OWNER PANEL */}
      {activePanel === 'assign' && (
        <div className="detail-card action-card">
          <div className="card-label">ASSIGN OWNER</div>
          <div className="assignee-type-toggle">
            <button type="button" className={`assignee-type-btn ${assigneeType === 'employee' ? 'active' : ''}`} onClick={() => handleTypeChange('employee')}>
              <i className="fas fa-user"></i> EMPLOYEE / CONTACT
            </button>
            <button type="button" className={`assignee-type-btn ${assigneeType === 'vendor' ? 'active' : ''}`} onClick={() => handleTypeChange('vendor')}>
              <i className="fas fa-truck"></i> VENDOR
            </button>
          </div>

          <select className="assignment-select" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
            <option value={CUSTOM_VALUE} disabled>
              {currentOptions.length === 0 ? `No ${assigneeType === 'employee' ? 'contacts' : 'vendors'} on file yet` : 'Select...'}
            </option>
            {currentOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </select>

          <div className="action-buttons">
            <button className="action-button save" onClick={handleSaveAssignment} disabled={selectedId === CUSTOM_VALUE}>
              <i className="fas fa-save"></i> SAVE ASSIGNMENT
            </button>
            <button className="action-button cancel" onClick={() => setActivePanel(null)}>
              <i className="fas fa-times"></i> CANCEL
            </button>
          </div>
        </div>
      )}

      {/* MARK COMPLIANT PANEL - this is the real completion action, with evidence */}
      {activePanel === 'complete' && (
        <div className="detail-card action-card">
          <div className="card-label">MARK COMPLIANT</div>

          <div className="timeline-item editable" style={{ marginBottom: 12 }}>
            <span className="timeline-sub">DATE COMPLETED</span>
            <input type="date" className="timeline-input" value={completedDate} onChange={(e) => setCompletedDate(e.target.value)} />
          </div>

          <div className="timeline-item editable" style={{ marginBottom: 12 }}>
            <span className="timeline-sub">COMPLETED BY</span>
            <input
              type="text"
              className="assignment-input"
              placeholder="Name of the person who did the work"
              value={completedByName}
              onChange={(e) => setCompletedByName(e.target.value)}
            />
          </div>

          <div className="timeline-item editable" style={{ marginBottom: 12 }}>
            <span className="timeline-sub">NOTES (optional)</span>
            <input
              type="text"
              className="assignment-input"
              placeholder="Anything worth recording about this completion"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <label className="upload-btn">
            <i className="fas fa-cloud-upload-alt"></i>
            {evidenceFileName || 'ATTACH EVIDENCE (optional)'}
            <input type="file" style={{ display: 'none' }} onChange={handleFileSelect} />
          </label>

          <div className="action-buttons" style={{ marginTop: 16 }}>
            <button className="action-button complete" onClick={handleMarkCompliant} disabled={!completedDate}>
              <i className="fas fa-check-circle"></i> CONFIRM COMPLIANT
            </button>
            <button className="action-button cancel" onClick={() => setActivePanel(null)}>
              <i className="fas fa-times"></i> CANCEL
            </button>
          </div>
        </div>
      )}

      {/* Action Panel entry points */}
      {activePanel === null && (
        <div className="detail-card action-card">
          <div className="card-label">ACTION PANEL</div>
          <div className="action-buttons">
            <button className="action-button complete" onClick={() => setActivePanel('complete')}>
              <i className="fas fa-check-circle"></i> MARK COMPLIANT
            </button>
            <button className="action-button edit" onClick={() => setActivePanel('assign')}>
              <i className="fas fa-user-edit"></i> ASSIGN OWNER
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequirementDetail;
