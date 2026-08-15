// VendorPortal.jsx
//
// The vendor/contractor side of the app - a completely separate identity
// from the operator Dashboard (see backend/middleware/vendorAuth.js). A
// vendor can be assigned work by multiple operators at once, so this is
// inherently cross-operator: everything here is scoped to "tasks assigned
// to me," grouped by which operator's pipeline they're for.
//
// Deliberately narrow compared to the operator's RequirementDetail: a
// vendor can attach evidence, add notes, and say when they did the work -
// exactly the same "draft" fields the public upload link and the admin's
// EDIT panel already fill in - but there is no MARK COMPLIANT button
// anywhere in this file. Only an admin, on the operator side, finalizes
// compliance. See VENDOR_PORTAL.md for the full picture.

import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { UserButton } from '@clerk/clerk-react';
import './VendorPortal.css';
import { getVendorMe, getVendorTasks, updateVendorTask, uploadVendorEvidence, getEvidenceBlobUrl, getVendorProfile, saveVendorProfile } from '../../api/client';
import VendorOnboarding from './VendorOnboarding';
import MarketplacePage from './MarketplacePage';
import RequestsPage from './RequestsPage';

const evidenceLabel = (entry) => (typeof entry === 'string' ? entry : entry.originalName);
const evidenceKey = (entry, idx) => (typeof entry === 'string' ? entry : entry.storedName || idx);
const isViewable = (entry) => typeof entry === 'object' && entry.storedName;

const formatDate = (dateString) => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const STATUS_LABEL = {
  past_due: 'past due',
  due: 'due',
  compliant: 'compliant',
  pending: 'not yet due',
  awaiting_input: 'needs setup',
};
const STATUS_COLOR = {
  past_due: 'var(--color-pastdue, #a23e2a)',
  due: 'var(--color-due, #c98a1e)',
  compliant: 'var(--color-compliant, #3f6b52)',
  pending: 'var(--color-unset, #6b7280)',
  awaiting_input: 'var(--color-setup, #8a5fbf)',
};

const VendorPortal = () => {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [profile, setProfile] = useState(undefined); // undefined = not loaded yet, null = no profile set up
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAll = () => {
    setLoading(true);
    Promise.all([getVendorMe(), getVendorTasks(), getVendorProfile()])
      .then(([meData, tasksData, profileData]) => {
        setMe(meData);
        setTasks(tasksData.tasks || []);
        setProfile(profileData.profile);
        setError('');
      })
      .catch((err) => {
        console.error('[VendorPortal] fetch failed:', err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, []);

  const handleUpdateTask = async (id, payload) => {
    await updateVendorTask(id, payload);
    fetchAll();
  };

  const handleUploadEvidence = async (id, files) => {
    const updated = await uploadVendorEvidence(id, files);
    fetchAll();
    return updated;
  };

  const handleSaveProfile = async (payload) => {
    await saveVendorProfile(payload);
    fetchAll();
  };

  // A brand-new vendor has no VendorProfile yet - show the setup wizard
  // full-screen instead of an empty task list ("don't land on an empty
  // page"). Once saved, fetchAll() re-resolves profile and this falls away.
  if (!loading && !error && profile === null) {
    return (
      <div className="vp-app">
        <main className="vp-main" style={{ margin: '0 auto', maxWidth: 640 }}>
          <h2>Welcome - set up your company profile</h2>
          <p style={{ opacity: 0.7, fontSize: 13, marginTop: -8, marginBottom: 16 }}>
            This is what operators see when they view your profile, and what shows up when you browse operators to pitch your services. Takes a minute.
          </p>
          <VendorOnboarding profile={null} onSave={handleSaveProfile} submitLabel="GET STARTED" />
        </main>
      </div>
    );
  }

  const tasksByOperator = {};
  tasks.forEach((t) => {
    const key = t.operatorCompanyName || 'Unknown operator';
    if (!tasksByOperator[key]) tasksByOperator[key] = [];
    tasksByOperator[key].push(t);
  });

  const TaskListPage = () => (
    <>
      <h2>Your Assigned Tasks</h2>
      {me && me.operators.length === 0 && (
        <div className="vp-hero-empty">
          <div className="vp-hero-icon"><i className="fas fa-compass" aria-hidden="true"></i></div>
          <h3>You're set up - now let's get you found</h3>
          <p>No operator has connected with you yet. Browse operators on the platform, see their compliance regulations, and offer to help with the ones that fit what you do.</p>
          <div className="vp-hero-actions">
            <button type="button" className="vp-primary-btn" onClick={() => navigate('/vendor/marketplace')}>
              <i className="fas fa-magnifying-glass" aria-hidden="true"></i> FIND OPERATORS
            </button>
            <button type="button" className="vp-link-btn" onClick={() => navigate('/vendor/profile')}>Review your profile</button>
          </div>
          <p className="vp-hero-hint">Operators can also find and add you directly from your profile - using {me.email}.</p>
        </div>
      )}
      {me && me.operators.length > 0 && tasks.length === 0 && (
        <div className="vp-hero-empty">
          <div className="vp-hero-icon"><i className="fas fa-clipboard-check" aria-hidden="true"></i></div>
          <h3>Nothing assigned yet</h3>
          <p>
            You're connected with {me.operators.length} operator{me.operators.length === 1 ? '' : 's'}, but nothing's been assigned to you yet.
            Check back soon, or keep browsing for more work in the meantime.
          </p>
          <div className="vp-hero-actions">
            <button type="button" className="vp-primary-btn" onClick={() => navigate('/vendor/marketplace')}>
              <i className="fas fa-magnifying-glass" aria-hidden="true"></i> FIND MORE OPERATORS
            </button>
          </div>
        </div>
      )}
      {Object.keys(tasksByOperator).map((company) => (
        <div key={company} className="vp-card" style={{ marginBottom: 16 }}>
          <div className="vp-card-header">{company}</div>
          <table className="vp-table">
            <thead>
              <tr><th></th><th>Regulation</th><th>Citation</th><th>Due</th><th>Status</th></tr>
            </thead>
            <tbody>
              {tasksByOperator[company].map((t) => (
                <tr key={t._id} className="vp-clickable-row" onClick={() => navigate(`/vendor/task/${t._id}`)}>
                  <td><span className="vp-status-dot" style={{ background: STATUS_COLOR[t.status] || STATUS_COLOR.pending }}></span></td>
                  <td>{t.requirementId?.title}</td>
                  <td className="vp-mono">{t.requirementId?.sourceRegulation}</td>
                  <td>{formatDate(t.nextDueDate)}</td>
                  <td>{STATUS_LABEL[t.status] || t.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </>
  );

  const TaskDetailPage = () => {
    const { id } = useParams();
    const task = tasks.find((t) => t._id === id);
    if (!task) {
      return <p>Loading task… (if this doesn't load, <button className="vp-link-btn" onClick={() => navigate('/vendor')}>go back</button>)</p>;
    }
    return <VendorTaskDetail task={task} onBack={() => navigate('/vendor')} onUpdate={handleUpdateTask} onUploadEvidence={handleUploadEvidence} />;
  };

  const ProfilePage = () => (
    <>
      <h2>My Profile</h2>
      <p style={{ opacity: 0.7, fontSize: 13, marginTop: -8, marginBottom: 16 }}>
        Operators see this when they view your profile in their Vendors directory.
      </p>
      <VendorOnboarding profile={profile} onSave={handleSaveProfile} submitLabel="SAVE CHANGES" />
    </>
  );

  return (
    <div className="vp-app">
      <aside className="vp-sidebar">
        <div className="vp-brand">Galaxy Compliance</div>
        <div className="vp-role-badge">VENDOR PORTAL</div>
        {me && (
          <div className="vp-me">
            <div className="vp-me-name">{me.fullName || me.email}</div>
            <div className="vp-me-email">{me.email}</div>
          </div>
        )}
        <nav className="vp-nav">
          <a href="/vendor" onClick={(e) => { e.preventDefault(); navigate('/vendor'); }}>
            <i className="fas fa-list-check" aria-hidden="true"></i><span>MY TASKS</span>
          </a>
          <a href="/vendor/profile" onClick={(e) => { e.preventDefault(); navigate('/vendor/profile'); }}>
            <i className="fas fa-id-card" aria-hidden="true"></i><span>MY PROFILE</span>
          </a>
          <a href="/vendor/marketplace" onClick={(e) => { e.preventDefault(); navigate('/vendor/marketplace'); }}>
            <i className="fas fa-magnifying-glass" aria-hidden="true"></i><span>FIND OPERATORS</span>
          </a>
          <a href="/vendor/requests" onClick={(e) => { e.preventDefault(); navigate('/vendor/requests'); }}>
            <i className="fas fa-handshake" aria-hidden="true"></i><span>REQUESTS</span>
          </a>
        </nav>
        {me && me.operators.length > 0 && (
          <div className="vp-operators-list">
            <div className="vp-operators-label">WORKING FOR</div>
            {me.operators.map((op) => <div key={op.operatorId} className="vp-operator-chip">{op.companyName}</div>)}
          </div>
        )}
        <div className="vp-user-button"><UserButton afterSignOutUrl="/" /></div>
      </aside>

      <main className="vp-main">
        {loading && <p>Loading…</p>}
        {error && <p style={{ color: '#c0392b' }}>⚠ {error}</p>}
        {!loading && !error && (
          <Routes>
            <Route path="/vendor" element={<TaskListPage />} />
            <Route path="/vendor/task/:id" element={<TaskDetailPage />} />
            <Route path="/vendor/profile" element={<ProfilePage />} />
            <Route path="/vendor/marketplace" element={<MarketplacePage />} />
            <Route path="/vendor/requests" element={<RequestsPage />} />
          </Routes>
        )}
      </main>
    </div>
  );
};

// Task detail - evidence upload, notes, completion date. No MARK COMPLIANT
// button by design; only an admin on the operator side does that.
const VendorTaskDetail = ({ task, onBack, onUpdate, onUploadEvidence }) => {
  const [notes, setNotes] = useState(task.pendingNotes || '');
  const [completedDate, setCompletedDate] = useState(task.pendingCompletedDate ? task.pendingCompletedDate.slice(0, 10) : new Date().toISOString().slice(0, 10));
  const [savingNotes, setSavingNotes] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viewingKey, setViewingKey] = useState(null);
  const [error, setError] = useState('');

  const handleViewEvidence = async (entry) => {
    const key = evidenceKey(entry);
    setViewingKey(key);
    try {
      const url = await getEvidenceBlobUrl(entry.storedName);
      window.open(url, '_blank');
    } catch (err) {
      console.error('[VendorPortal] failed to open evidence:', err);
      setError(err.message);
    } finally {
      setViewingKey(null);
    }
  };

  const handleFileSelect = async (event) => {
    const picked = Array.from(event.target.files);
    event.target.value = '';
    if (picked.length === 0) return;
    setError('');
    setUploading(true);
    try {
      await onUploadEvidence(task._id, picked);
    } catch (err) {
      console.error('[VendorPortal] upload failed:', err);
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await onUpdate(task._id, { pendingNotes: notes, completedDate });
    } catch (err) {
      console.error('[VendorPortal] save failed:', err);
      setError(err.message);
    } finally {
      setSavingNotes(false);
    }
  };

  return (
    <div className="vp-detail">
      <button className="vp-back-btn" onClick={onBack}><i className="fas fa-arrow-left"></i> BACK TO TASKS</button>

      <div className="vp-detail-header">
        <span className="vp-mono">{task.requirementId?.sourceRegulation}</span>
        <span className="vp-detail-status" style={{ color: STATUS_COLOR[task.status] || STATUS_COLOR.pending }}>
          {STATUS_LABEL[task.status] || task.status}
        </span>
      </div>
      <h1 className="vp-detail-title">{task.requirementId?.title}</h1>
      <p style={{ opacity: 0.7, fontSize: 13 }}>{task.operatorCompanyName} · Due {formatDate(task.nextDueDate)}</p>

      {error && <p style={{ color: '#c0392b', fontSize: 13 }}>⚠ {error}</p>}

      <div className="vp-card">
        <div className="vp-card-header">EVIDENCE</div>
        <div className="vp-card-body">
          <label className="vp-upload-btn" style={{ opacity: uploading ? 0.6 : 1, pointerEvents: uploading ? 'none' : 'auto' }}>
            <i className="fas fa-cloud-upload-alt"></i>
            {uploading ? 'UPLOADING…' : 'ATTACH EVIDENCE (select one or more)'}
            <input type="file" multiple style={{ display: 'none' }} onChange={handleFileSelect} disabled={uploading} />
          </label>

          {(task.pendingEvidenceUrls || []).length > 0 && (
            <div className="vp-doc-list">
              {task.pendingEvidenceUrls.map((entry, idx) => (
                <div key={evidenceKey(entry, idx)} className="vp-doc-item">
                  <i className="fas fa-paperclip"></i>
                  <span className="vp-doc-name">{evidenceLabel(entry)}</span>
                  {isViewable(entry) && (
                    <button type="button" className="vp-link-btn" onClick={() => handleViewEvidence(entry)} disabled={viewingKey === evidenceKey(entry, idx)}>
                      {viewingKey === evidenceKey(entry, idx) ? 'opening…' : 'VIEW'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          {(task.pendingEvidenceUrls || []).length === 0 && <p style={{ fontSize: 13, opacity: 0.7, marginTop: 8 }}>Nothing attached yet.</p>}
        </div>
      </div>

      <div className="vp-card">
        <div className="vp-card-header">NOTES &amp; COMPLETION DATE</div>
        <div className="vp-card-body">
          <label className="vp-field-label">Date you completed this</label>
          <input type="date" className="vp-input" value={completedDate} onChange={(e) => setCompletedDate(e.target.value)} />
          <label className="vp-field-label" style={{ marginTop: 10 }}>Notes (optional)</label>
          <input type="text" className="vp-input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything the admin should know..." />
          <button className="vp-primary-btn" style={{ marginTop: 12 }} onClick={handleSaveNotes} disabled={savingNotes}>
            {savingNotes ? 'SAVING…' : 'SAVE'}
          </button>
        </div>
      </div>

      <p style={{ fontSize: 12, opacity: 0.65 }}>
        Submitting evidence notifies the admin for review - they'll mark this compliant on their end once it checks out.
      </p>

      {task.lastCompletedDate && (
        <div className="vp-card" style={{ borderColor: 'var(--color-compliant, #3f6b52)' }}>
          <div className="vp-card-header" style={{ color: 'var(--color-compliant, #3f6b52)' }}>✓ LAST MARKED COMPLIANT</div>
          <div className="vp-card-body">
            <p style={{ fontSize: 13, margin: 0 }}>{formatDate(task.lastCompletedDate)}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorPortal;
