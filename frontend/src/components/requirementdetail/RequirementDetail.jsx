import React, { useState } from 'react';
import './RequirementDetail.css';

const EMPLOYEES = [
  'Jacob Kiage',
  'Paul Wanjau',
  'Reuben Moses',
  'Aisha Patel',
  'Brian Bollo',
  'Dana Chebet',
];

const DEFAULT_VENDORS = ['Galaxy Midstream'];
const CUSTOM_VALUE = '__custom__';

const RequirementDetail = ({ requirement, onBack, onUpdate, vendorList = DEFAULT_VENDORS }) => {
  const [lastCompleted, setLastCompleted] = useState(requirement.lastCompleted || '');
  const [assigneeType, setAssigneeType] = useState(requirement.assigneeType || 'employee');
  const [documents, setDocuments] = useState(requirement.documents || []);

  // Format incoming vendors if passed as objects or simple strings
  const activeVendorNames = vendorList.map((v) =>
    typeof v === 'string' ? v : v.companyName
  ).filter(Boolean);

  const availableList = assigneeType === 'employee' ? EMPLOYEES : activeVendorNames;

  const initialIsKnown = availableList.includes(requirement.assigned);
  const [selectedOption, setSelectedOption] = useState(
    requirement.assigned && initialIsKnown ? requirement.assigned : CUSTOM_VALUE
  );

  const [customName, setCustomName] = useState(
    requirement.assigned && !initialIsKnown ? requirement.assigned : ''
  );

  const [isEditing, setIsEditing] = useState(false);

  // File Upload Handler
  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    const newDocs = files.map((file) => ({
      id: Date.now() + Math.random(),
      name: file.name,
      size: (file.size / 1024).toFixed(1) + ' KB',
      uploadedAt: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    }));

    const updatedDocs = [...documents, ...newDocs];
    setDocuments(updatedDocs);
    
    // Auto-sync document updates to parent state
    onUpdate(requirement.id, { ...requirement, documents: updatedDocs });
  };

  const handleRemoveDocument = (docId) => {
    const updatedDocs = documents.filter((doc) => doc.id !== docId);
    setDocuments(updatedDocs);
    onUpdate(requirement.id, { ...requirement, documents: updatedDocs });
  };

  const handleMarkComplete = () => {
    const today = new Date().toISOString().split('T')[0];
    setLastCompleted(today);
    setIsEditing(true);
  };

  const handleTypeChange = (type) => {
    setAssigneeType(type);
    setSelectedOption(CUSTOM_VALUE);
    setCustomName('');
  };

  const handleSave = () => {
    const finalName = selectedOption === CUSTOM_VALUE ? customName.trim() : selectedOption;
    onUpdate(requirement.id, {
      ...requirement,
      lastCompleted: lastCompleted || null,
      assigned: finalName || 'Unassigned',
      assigneeType: finalName ? assigneeType : null,
      documents: documents,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setLastCompleted(requirement.lastCompleted || '');
    setAssigneeType(requirement.assigneeType || 'employee');
    setDocuments(requirement.documents || []);
    const wasKnown = availableList.includes(requirement.assigned);
    setSelectedOption(requirement.assigned && wasKnown ? requirement.assigned : CUSTOM_VALUE);
    setCustomName(requirement.assigned && !wasKnown ? requirement.assigned : '');
    setIsEditing(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const statusClass = requirement.status
    ? requirement.status.replace(/\s+/g, '-')
    : 'unset';
  const statusText = requirement.status
    ? requirement.status.toUpperCase()
    : 'NOT SET';

  return (
    <div className="detail-container">
      {/* Back button */}
      <button className="back-button" onClick={onBack}>
        <i className="fas fa-arrow-left"></i>
        BACK TO CALENDAR
      </button>

      {/* Header */}
      <div className="detail-header">
        <div className="detail-citation">
          {requirement.citation}
        </div>
        <div className="detail-category">
          {requirement.category.toUpperCase()}
        </div>
        <div className={`detail-status-badge ${statusClass}`}>
          {statusText}
        </div>
      </div>

      {/* Title */}
      <h1 className="detail-title">{requirement.description}</h1>

      {/* Regulation Rule */}
      <div className="detail-card regulation-card">
        <div className="card-label">REGULATION RULE</div>
        <div className="regulation-text">{requirement.frequencyRule}</div>
        <button className="regulation-link">
          <i className="fas fa-file-alt"></i>
          Read Full Regulation Text
        </button>
      </div>

      {/* Timeline & Assignment */}
      <div className="detail-two-column">
        {/* Timeline Card */}
        <div className="detail-card timeline-card">
          <div className="card-label">TIMELINE</div>
          <div className="timeline-grid">
            <div className="timeline-item">
              <span className="timeline-sub">NEXT DUE</span>
              <span className="timeline-value">
                {requirement.nextDue ? formatDate(requirement.nextDue) : 'Not set'}
              </span>
            </div>
            <div className="timeline-item editable">
              <span className="timeline-sub">LAST COMPLETED</span>
              {isEditing ? (
                <input
                  type="date"
                  className="timeline-input"
                  value={lastCompleted}
                  onChange={(e) => setLastCompleted(e.target.value)}
                />
              ) : (
                <span className="timeline-value">
                  {formatDate(requirement.lastCompleted)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Assignment Card */}
        <div className="detail-card assignment-card">
          <div className="card-label">ASSIGNMENT</div>
          <div className="assignment-content">
            {isEditing ? (
              <div className="assignment-editor">
                <div className="assignee-type-toggle">
                  <button
                    type="button"
                    className={`assignee-type-btn ${assigneeType === 'employee' ? 'active' : ''}`}
                    onClick={() => handleTypeChange('employee')}
                  >
                    <i className="fas fa-user"></i> EMPLOYEE
                  </button>
                  <button
                    type="button"
                    className={`assignee-type-btn ${assigneeType === 'vendor' ? 'active' : ''}`}
                    onClick={() => handleTypeChange('vendor')}
                  >
                    <i className="fas fa-truck"></i> VENDOR
                  </button>
                </div>

                <select
                  className="assignment-select"
                  value={selectedOption}
                  onChange={(e) => setSelectedOption(e.target.value)}
                >
                  {availableList.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                  <option value={CUSTOM_VALUE}>
                    {assigneeType === 'employee' ? 'Other (type a name)...' : 'Other vendor (type a name)...'}
                  </option>
                </select>

                {selectedOption === CUSTOM_VALUE && (
                  <input
                    type="text"
                    className="assignment-input"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder={assigneeType === 'employee' ? 'Enter employee name' : 'Enter vendor name'}
                  />
                )}
              </div>
            ) : (
              <div className="owner-info">
                <div className="owner-avatar">
                  <i className={`fas ${requirement.assigneeType === 'vendor' ? 'fa-truck' : 'fa-user'}`}></i>
                </div>
                <div>
                  <div className="owner-label">
                    CURRENT OWNER
                    {requirement.assigneeType === 'vendor' && (
                      <span className="vendor-flag">VENDOR</span>
                    )}
                  </div>
                  <div className="owner-name">
                    {requirement.assigned || 'Unassigned'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RENEWAL DOCUMENTS CARD (NEW) */}
      <div className="detail-card documents-card">
        <div className="documents-card-header">
          <div>
            <div className="card-label">RENEWAL PROOF & DOCUMENTS</div>
            <span className="documents-subtitle">
              Attach all supporting evidence before marking complete.
            </span>
          </div>
          <label className="upload-btn">
            <i className="fas fa-cloud-upload-alt"></i>
            UPLOAD DOCUMENT
            <input
              type="file"
              multiple
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
          </label>
        </div>

        {documents.length > 0 ? (
          <div className="document-list">
            {documents.map((doc) => (
              <div key={doc.id} className="document-item">
                <div className="doc-icon">
                  <i className="fas fa-file-pdf"></i>
                </div>
                <div className="doc-details">
                  <span className="doc-name">{doc.name}</span>
                  <span className="doc-meta">
                    Uploaded on {doc.uploadedAt} • {doc.size}
                  </span>
                </div>
                <button
                  className="doc-remove-btn"
                  title="Remove document"
                  onClick={() => handleRemoveDocument(doc.id)}
                >
                  <i className="fas fa-trash-alt"></i>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-docs-state">
            <i className="fas fa-folder-open empty-icon"></i>
            <p>No proof documents uploaded yet for this cycle.</p>
          </div>
        )}
      </div>

      {/* Action Panel */}
      <div className="detail-card action-card">
        <div className="card-label">ACTION PANEL</div>
        <div className="action-buttons">
          {isEditing ? (
            <>
              <button className="action-button save" onClick={handleSave}>
                <i className="fas fa-save"></i>
                SAVE CHANGES
              </button>
              <button className="action-button cancel" onClick={handleCancel}>
                <i className="fas fa-times"></i>
                CANCEL
              </button>
            </>
          ) : (
            <>
              <button className="action-button complete" onClick={handleMarkComplete}>
                <i className="fas fa-check-circle"></i>
                MARK COMPLETE
              </button>
              <button className="action-button edit" onClick={() => setIsEditing(true)}>
                <i className="fas fa-edit"></i>
                EDIT DETAILS
              </button>
              <button className="action-button dispatch">
                <i className="fas fa-truck"></i>
                DISPATCH VENDOR
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RequirementDetail;