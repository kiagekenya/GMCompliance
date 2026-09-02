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
import { Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom';
import { UserButton } from '@clerk/clerk-react';
import './VendorPortal.css';
import { getVendorMe, getVendorTasks, updateVendorTask, uploadVendorEvidence, getEvidenceBlobUrl, getVendorProfile, saveVendorProfile, requestDueDate, getVendorRequests, submitTaskForReview } from '../../api/client';
import VendorOnboarding from './VendorOnboarding';
import MarketplacePage from './MarketplacePage';
import RequestsPage from './RequestsPage';
import VendorNotificationBanner from './VendorNotificationBanner';
import CompanyLogo from "../../assets/gm_edited-removebg-preview.jpg";

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
  const location = useLocation();
  const [me, setMe] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [profile, setProfile] = useState(undefined); // undefined = not loaded yet, null = no profile set up
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
   const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Nothing else ever pushes a /vendor* URL - a vendor lands here straight
  // from the role-choice/sign-in screen (still at "/" or "/sign-in"), which
  // doesn't match any <Route> below, so <Routes> renders nothing and the
  // page looks blank. This is what actually puts them on their task list.
  useEffect(() => {
    if (!location.pathname.startsWith('/vendor')) {
      navigate('/vendor');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Counts for the sidebar notification banner below - re-fetched on every
  // in-portal navigation (not just on mount) so acting on something in
  // Requests clears the count the moment you leave that page, without
  // having to prop-drill a refresh callback through the router.
  const [requestCounts, setRequestCounts] = useState({ pendingReceived: 0, readyToStart: 0 });
  useEffect(() => {
    getVendorRequests()
      .then((data) => {
        const reqs = data.requests || [];
        setRequestCounts({
          pendingReceived: reqs.filter((r) => r.initiatedBy === 'operator' && r.status === 'pending').length,
          readyToStart: reqs.filter((r) => r.initiatedBy === 'vendor' && r.status === 'accepted' && r.complianceItemId && !r.collaborationRequestedAt).length,
        });
      })
      .catch((err) => console.error('[VendorPortal] getVendorRequests failed:', err));
  }, [location.pathname]);

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


  // Every sidebar link routes through this so the mobile drawer always
  // closes after a tap, instead of leaving it open over the new page.
  const goTo = (path) => {
    setMobileNavOpen(false);
    navigate(path);
  };

  const handleUploadEvidence = async (id, files) => {
    const updated = await uploadVendorEvidence(id, files);
    fetchAll();
    return updated;
  };

  const handleSubmitForReview = async (id) => {
    const updated = await submitTaskForReview(id);
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
    return <VendorTaskDetail task={task} onBack={() => navigate('/vendor')} onUpdate={handleUpdateTask} onUploadEvidence={handleUploadEvidence} onSubmitForReview={handleSubmitForReview} />;
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
      {/* Mobile-only top bar: logo left, hamburger right. Hidden on desktop via CSS. */}
      <div className="vp-mobile-topbar">
  <img src={CompanyLogo} alt="Galaxy Midstream" className="company-logo" />
  <button
    type="button"
    className={`vp-hamburger-btn${mobileNavOpen ? ' is-open' : ''}`}
    onClick={() => setMobileNavOpen((v) => !v)}
    aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
    aria-expanded={mobileNavOpen}
  >
    <span></span>
    <span></span>
    <span></span>
  </button>
  <div aria-hidden="true"></div>
</div>

      {/* Dims the page behind the drawer; tapping it closes the menu */}
      <div
        className={`vp-mobile-overlay${mobileNavOpen ? ' is-open' : ''}`}
        onClick={() => setMobileNavOpen(false)}
      ></div>

      <aside className={`vp-sidebar${mobileNavOpen ? ' is-open' : ''}`}>
        <div className="brand">
          <img src={CompanyLogo} alt="Galaxy Midstream" className="company-logo" />
        </div>
        <div className="vp-role-badge">VENDOR PORTAL</div>
        {me && (
          <div className="vp-me">
            <div className="vp-me-name">{me.fullName || me.email}</div>
            <div className="vp-me-email">{me.email}</div>
          </div>
        )}
        <VendorNotificationBanner
          pendingReceived={requestCounts.pendingReceived}
          readyToStart={requestCounts.readyToStart}
          onClick={() => goTo('/vendor/requests')}
        />
        <nav className="vp-nav">
          <a href="/vendor" onClick={(e) => { e.preventDefault(); goTo('/vendor'); }}>
            <i className="fas fa-list-check" aria-hidden="true"></i><span>MY TASKS</span>
          </a>
          <a href="/vendor/marketplace" onClick={(e) => { e.preventDefault(); goTo('/vendor/marketplace'); }}>
            <i className="fas fa-magnifying-glass" aria-hidden="true"></i><span>FIND OPERATORS</span>
          </a>
          <a href="/vendor/requests" onClick={(e) => { e.preventDefault(); goTo('/vendor/requests'); }}>
            <i className="fas fa-handshake" aria-hidden="true"></i><span>REQUESTS</span>
          </a>
          <a href="/vendor/profile" onClick={(e) => { e.preventDefault(); goTo('/vendor/profile'); }}>
            <i className="fas fa-id-card" aria-hidden="true"></i><span>MY PROFILE</span>
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

// A task with no due date isn't broken - it means the operator hasn't set
// a real baseline last-completed date yet (see
// backend/services/baselineScheduling.js: no fake placeholder is ever
// shown). Rather than leave a vendor staring at a blank "Due —", this says
// so plainly and lets them nudge the operator directly by email.
const DueDateStatus = ({ task }) => {
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(false);
  const [error, setError] = useState('');

  if (task.nextDueDate) {
    return <span>Due {formatDate(task.nextDueDate)}</span>;
  }

  const handleRequest = async () => {
    setRequesting(true);
    setError('');
    try {
      await requestDueDate(task._id);
      setRequested(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setRequesting(false);
    }
  };

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ color: '#c98a1e', fontWeight: 600 }}>⚠ Due date not set yet</span>
      {requested ? (
        <span style={{ color: '#3f6b52', fontWeight: 500 }}>✓ Operator notified</span>
      ) : (
        <button
          type="button"
          onClick={handleRequest}
          disabled={requesting}
          style={{
            background: 'none',
            border: '1px solid #dce1e8',
            color: '#2c3e50',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            padding: '3px 10px',
            borderRadius: '10px',
          }}
        >
          {requesting ? 'Sending…' : 'Ask operator to set it'}
        </button>
      )}
      {error && <span style={{ color: '#b91c1c', fontSize: '11px' }}>⚠ {error}</span>}
    </span>
  );
};

// Task detail - evidence upload, notes, completion date. No MARK COMPLIANT
// button by design; only an admin on the operator side does that.
const VendorTaskDetail = ({ task, onBack, onUpdate, onUploadEvidence, onSubmitForReview }) => {
  const [notes, setNotes] = useState(task.pendingNotes || '');
  const [completedDate, setCompletedDate] = useState(task.pendingCompletedDate ? task.pendingCompletedDate.slice(0, 10) : new Date().toISOString().slice(0, 10));
  const [savingNotes, setSavingNotes] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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

  const handleSubmitForReview = async () => {
    setSubmitting(true);
    setError('');
    try {
      await onSaveThenSubmit();
    } catch (err) {
      console.error('[VendorPortal] submit for review failed:', err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Notes/date are saved as part of the same click, so a vendor doesn't
  // have to remember to hit SAVE first, then SUBMIT separately.
  const onSaveThenSubmit = async () => {
    await onUpdate(task._id, { pendingNotes: notes, completedDate });
    await onSubmitForReview(task._id);
  };

  const alreadySubmitted = task.pendingSubmittedByAssignee && !task.reviewerComment;

  return (
  <div
    style={{
      maxWidth: '820px',
      margin: '0 auto',
    }}
  >
    {/* Back button */}
    <button
      type="button"
      onClick={onBack}
      style={{
        background: 'none',
        border: 'none',
        color: '#6b7280',
        fontSize: '12px',
        fontWeight: 500,
        cursor: 'pointer',
        padding: '6px 12px 6px 0',
        marginBottom: '16px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'color 0.15s ease',
        borderRadius: '4px',
      }}
      onMouseEnter={(e) => {
        e.target.style.color = '#2c3e50';
      }}
      onMouseLeave={(e) => {
        e.target.style.color = '#6b7280';
      }}
    >
      <span style={{ fontSize: '14px' }}>←</span> BACK TO TASKS
    </button>

    {/* Header with regulation and status */}
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '6px',
        flexWrap: 'wrap',
        gap: '8px',
      }}
    >
      <span
        style={{
          fontFamily: 'ui-monospace, SFMono-Regular, monospace',
          fontSize: '13px',
          fontWeight: 500,
          color: '#6b7280',
          background: '#f0f2f5',
          padding: '3px 12px',
          borderRadius: '4px',
        }}
      >
        {task.requirementId?.sourceRegulation}
      </span>
      <span
        style={{
          fontSize: '12px',
          fontWeight: 600,
          color: STATUS_COLOR[task.status] || STATUS_COLOR.pending,
          textTransform: 'capitalize',
          background:
            task.status === 'past_due'
              ? '#fef6f6'
              : task.status === 'due'
              ? '#fef9e7'
              : task.status === 'compliant'
              ? '#edf7f2'
              : '#f0f2f5',
          padding: '4px 14px',
          borderRadius: '12px',
          letterSpacing: '0.3px',
        }}
      >
        {STATUS_LABEL[task.status] || task.status}
      </span>
    </div>

    {/* Title and metadata */}
    <h1
      style={{
        fontSize: '22px',
        fontWeight: 600,
        color: '#1a2634',
        margin: '4px 0 4px 0',
        lineHeight: '1.3',
      }}
    >
      {task.requirementId?.title}
    </h1>
    <p
      style={{
        color: '#6b7280',
        fontSize: '13px',
        margin: '0 0 16px 0',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}
    >
      <span style={{ fontWeight: 500 }}>{task.operatorCompanyName}</span>
      <span style={{ color: '#dce1e8' }}>·</span>
      <DueDateStatus task={task} />
    </p>

    {/* The operator reviewed a submission and asked for a fix - stays
        visible until the next SUBMIT FOR REVIEW clears it (see
        backend/routes/vendorPortal/submitForReview.js). */}
    {task.reviewerComment && (
      <div
        style={{
          backgroundColor: '#fef6f6',
          borderRadius: '10px',
          border: '1px solid #fad2d2',
          padding: '12px 16px',
          marginBottom: '16px',
        }}
      >
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#a23e2a', letterSpacing: '0.3px', marginBottom: '4px' }}>
          ⚠ CHANGES REQUESTED{task.reviewerCommentAt ? ` · ${formatDate(task.reviewerCommentAt)}` : ''}
        </div>
        <p style={{ fontSize: '13px', color: '#2c3e50', margin: 0, lineHeight: 1.5 }}>{task.reviewerComment}</p>
      </div>
    )}

    {alreadySubmitted && (
      <div
        style={{
          backgroundColor: '#edf7f2',
          borderRadius: '10px',
          border: '1px solid #c6dfd4',
          padding: '10px 16px',
          marginBottom: '16px',
          fontSize: '13px',
          fontWeight: 600,
          color: '#3f6b52',
        }}
      >
        ✓ Submitted — waiting for the operator to review
      </div>
    )}

    {/* Timeline & reminders - same reminderCheckpoints the operator's own
        RequirementDetail.jsx shows, resolved server-side (see
        backend/routes/vendorPortal/getTasks.js) so this never duplicates
        date math. */}
    {task.status === 'due' && task.reminderCheckpoints?.length > 0 && (
      <div
        style={{
          backgroundColor: '#fef9e7',
          borderRadius: '10px',
          border: '1px solid #f5e6b8',
          padding: '12px 16px',
          marginBottom: '16px',
        }}
      >
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#8a6d1a', letterSpacing: '0.3px', marginBottom: '6px' }}>
          REMINDER TIMELINE
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {task.reminderCheckpoints.map((cp, i) => (
            <span key={i} style={{ fontSize: '12px', color: '#4a5568' }}>
              {formatDate(cp)}{i < task.reminderCheckpoints.length - 1 ? ' ·' : ''}
            </span>
          ))}
        </div>
      </div>
    )}

    {/* Error message */}
    {error && (
      <div
        style={{
          backgroundColor: '#fef6f6',
          borderRadius: '8px',
          padding: '10px 14px',
          border: '1px solid #fad2d2',
          color: '#b91c1c',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '16px',
        }}
      >
        <span>⚠️</span> {error}
      </div>
    )}

    {/* Evidence section */}
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #eef2f6',
        overflow: 'hidden',
        marginBottom: '16px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
      }}
    >
      <div
        style={{
          padding: '12px 20px',
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #eef2f6',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div
          style={{
            width: '3px',
            height: '18px',
            backgroundColor: '#2c3e50',
            borderRadius: '4px',
          }}
        />
        <span
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: '#1a2634',
            letterSpacing: '0.3px',
          }}
        >
          EVIDENCE
        </span>
      </div>
      <div
        style={{
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {/* Upload button */}
        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            backgroundColor: '#f8fafc',
            border: '2px dashed #dce1e8',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 500,
            color: '#2c3e50',
            cursor: uploading ? 'default' : 'pointer',
            opacity: uploading ? 0.6 : 1,
            pointerEvents: uploading ? 'none' : 'auto',
            transition: 'background 0.15s ease, border-color 0.15s ease',
            width: 'fit-content',
          }}
          onMouseEnter={(e) => {
            if (!uploading) {
              e.target.style.background = '#f0f2f5';
              e.target.style.borderColor = '#bcc3cd';
            }
          }}
          onMouseLeave={(e) => {
            if (!uploading) {
              e.target.style.background = '#f8fafc';
              e.target.style.borderColor = '#dce1e8';
            }
          }}
        >
          <span style={{ fontSize: '16px' }}>📤</span>
          {uploading ? 'UPLOADING…' : 'ATTACH EVIDENCE (select one or more)'}
          <input
            type="file"
            multiple
            style={{ display: 'none' }}
            onChange={handleFileSelect}
            disabled={uploading}
          />
        </label>

        {/* Evidence list */}
        {(task.pendingEvidenceUrls || []).length > 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              marginTop: '4px',
            }}
          >
            {(task.pendingEvidenceUrls || []).map((entry, idx) => (
              <div
                key={evidenceKey(entry, idx)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 12px',
                  backgroundColor: '#fafbfc',
                  borderRadius: '6px',
                  border: '1px solid #eef2f6',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f8fafc';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#fafbfc';
                }}
              >
                <span style={{ fontSize: '14px', color: '#6b7280' }}>📎</span>
                <span
                  style={{
                    fontSize: '13px',
                    color: '#2c3e50',
                    flex: 1,
                    fontWeight: 500,
                  }}
                >
                  {evidenceLabel(entry)}
                </span>
                {isViewable(entry) && (
                  <button
                    type="button"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2c3e50',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      padding: '4px 12px',
                      borderRadius: '4px',
                      transition: 'background 0.15s ease, color 0.15s ease',
                      textDecoration: 'underline',
                      textUnderlineOffset: '2px',
                      textDecorationColor: '#dce1e8',
                    }}
                    onClick={() => handleViewEvidence(entry)}
                    disabled={viewingKey === evidenceKey(entry, idx)}
                    onMouseEnter={(e) => {
                      if (!(viewingKey === evidenceKey(entry, idx))) {
                        e.target.style.background = '#f0f2f5';
                        e.target.style.color = '#1a2634';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!(viewingKey === evidenceKey(entry, idx))) {
                        e.target.style.background = 'none';
                        e.target.style.color = '#2c3e50';
                      }
                    }}
                  >
                    {viewingKey === evidenceKey(entry, idx)
                      ? 'opening…'
                      : 'VIEW'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        {(task.pendingEvidenceUrls || []).length === 0 && (
          <p
            style={{
              fontSize: '13px',
              color: '#94a3b8',
              margin: '4px 0 0 0',
              fontStyle: 'italic',
            }}
          >
            Nothing attached yet.
          </p>
        )}
      </div>
    </div>

    {/* Notes & Completion Date section */}
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #eef2f6',
        overflow: 'hidden',
        marginBottom: '16px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
      }}
    >
      <div
        style={{
          padding: '12px 20px',
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #eef2f6',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div
          style={{
            width: '3px',
            height: '18px',
            backgroundColor: '#2c3e50',
            borderRadius: '4px',
          }}
        />
        <span
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: '#1a2634',
            letterSpacing: '0.3px',
          }}
        >
          NOTES &amp; COMPLETION DATE
        </span>
      </div>
      <div
        style={{
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 500,
              color: '#2c3e50',
              marginBottom: '5px',
            }}
          >
            Date you completed this
          </label>
          <input
            type="date"
            style={{
              width: '100%',
              maxWidth: '220px',
              padding: '8px 12px',
              fontSize: '14px',
              borderRadius: '8px',
              border: '1px solid #dce1e8',
              backgroundColor: '#fafbfc',
              transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
              outline: 'none',
              boxSizing: 'border-box',
              fontFamily: 'inherit',
            }}
            value={completedDate}
            onChange={(e) => setCompletedDate(e.target.value)}
            onFocus={(e) => {
              e.target.style.borderColor = '#2c3e50';
              e.target.style.boxShadow = '0 0 0 3px rgba(44,62,80,0.08)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#dce1e8';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        <div>
          <label
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 500,
              color: '#2c3e50',
              marginBottom: '5px',
            }}
          >
            Notes (optional)
          </label>
          <input
            type="text"
            style={{
              width: '100%',
              padding: '8px 12px',
              fontSize: '14px',
              borderRadius: '8px',
              border: '1px solid #dce1e8',
              backgroundColor: '#fafbfc',
              transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
              outline: 'none',
              boxSizing: 'border-box',
            }}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onFocus={(e) => {
              e.target.style.borderColor = '#2c3e50';
              e.target.style.boxShadow = '0 0 0 3px rgba(44,62,80,0.08)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#dce1e8';
              e.target.style.boxShadow = 'none';
            }}
            placeholder="Anything the admin should know..."
          />
        </div>

        <button
          type="button"
          style={{
            alignSelf: 'flex-start',
            padding: '8px 24px',
            fontSize: '12px',
            fontWeight: 600,
            backgroundColor: '#2c3e50',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'background-color 0.2s ease',
            letterSpacing: '0.3px',
            marginTop: '4px',
          }}
          onClick={handleSaveNotes}
          disabled={savingNotes}
          onMouseEnter={(e) => {
            if (!savingNotes) e.target.style.backgroundColor = '#1a2634';
          }}
          onMouseLeave={(e) => {
            if (!savingNotes) e.target.style.backgroundColor = '#2c3e50';
          }}
        >
          {savingNotes ? 'SAVING…' : 'SAVE'}
        </button>
      </div>
    </div>

    {/* Attaching files and saving notes are both just drafts - nothing
        notifies the operator until this is clicked (see
        backend/routes/vendorPortal/submitForReview.js). */}
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #eef2f6',
        padding: '16px 20px',
        marginBottom: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        alignItems: 'flex-start',
      }}
    >
      <button
        type="button"
        onClick={handleSubmitForReview}
        disabled={submitting || (task.pendingEvidenceUrls || []).length === 0}
        style={{
          padding: '10px 28px',
          fontSize: '13px',
          fontWeight: 700,
          backgroundColor: '#3f6b52',
          color: '#ffffff',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          letterSpacing: '0.3px',
          opacity: (task.pendingEvidenceUrls || []).length === 0 ? 0.5 : 1,
        }}
      >
        {submitting ? 'SUBMITTING…' : alreadySubmitted ? 'RESUBMIT FOR REVIEW' : 'SUBMIT FOR REVIEW'}
      </button>
      <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0, lineHeight: '1.5' }}>
        {(task.pendingEvidenceUrls || []).length === 0
          ? 'Attach at least one file above before you can submit.'
          : "This sends everything above to the operator and emails them directly - they'll mark it compliant, or send back a note if something needs fixing."}
      </p>
    </div>

    {/* Last completed section */}
    {task.lastCompletedDate && (
      <div
        style={{
          backgroundColor: '#edf7f2',
          borderRadius: '12px',
          border: '1px solid #c6dfd4',
          overflow: 'hidden',
          boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
        }}
      >
        <div
          style={{
            padding: '10px 20px',
            backgroundColor: '#e0f0e8',
            borderBottom: '1px solid #c6dfd4',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ fontSize: '16px' }}>✓</span>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: '#3f6b52',
              letterSpacing: '0.3px',
            }}
          >
            LAST MARKED COMPLIANT
          </span>
        </div>
        <div style={{ padding: '12px 20px' }}>
          <p
            style={{
              fontSize: '14px',
              fontWeight: 500,
              color: '#2c3e50',
              margin: 0,
            }}
          >
            {formatDate(task.lastCompletedDate)}
          </p>
        </div>
      </div>
    )}
  </div>
);
};

export default VendorPortal;
