// PublicUpload.jsx
//
// This page is NOT behind Clerk's sign-in gate (see App.js - it's rendered
// based on the URL path, before the SignedIn/SignedOut check even runs).
// It's what an assigned person with no system account lands on after
// clicking the link in their assignment email. Submitting here only fills
// in the draft ("pending") fields on the item - an admin still has to
// review it and click MARK COMPLIANT separately inside the real app.

import React, { useEffect, useState } from 'react';

const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

const PublicUpload = ({ token }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [info, setInfo] = useState(null);
  const [fileName, setFileName] = useState('');
  const [completedDate, setCompletedDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch(`${BASE_URL}/public/upload/${token}`)
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.error || 'This link is invalid.');
        setInfo(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('[PublicUpload] failed to load info:', err);
        setError(err.message);
        setLoading(false);
      });
  }, [token]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) setFileName(file.name);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fileName) {
      setError('Please attach a file first.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${BASE_URL}/public/upload/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evidenceUrl: fileName, notes, completedDate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed.');
      console.log('[PublicUpload] submitted successfully');
      setSubmitted(true);
    } catch (err) {
      console.error('[PublicUpload] submit failed:', err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const pageStyle = { maxWidth: 480, margin: '60px auto', padding: 24, fontFamily: 'sans-serif' };

  if (loading) return <div style={pageStyle}>Loading…</div>;
  if (error && !info) return <div style={pageStyle}><p style={{ color: '#c0392b' }}>⚠ {error}</p></div>;

  if (submitted) {
    return (
      <div style={pageStyle}>
        <h2>✓ Submitted</h2>
        <p>Thanks - your submission has been recorded. An admin will review it and mark it compliant on their end. You can close this page.</p>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <h2>{info.title}</h2>
      <p style={{ opacity: 0.7, fontSize: 13 }}>{info.sourceRegulation} — {info.categoryName}</p>
      <p>Due: {info.nextDueDate ? new Date(info.nextDueDate).toLocaleDateString() : 'not set'}</p>

      {info.alreadySubmitted && (
        <p style={{ color: '#C98A1E' }}>A submission already exists for this - uploading again will replace it.</p>
      )}

      <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
        {error && <p style={{ color: '#c0392b', fontSize: 13 }}>{error}</p>}

        <label style={{ display: 'block', marginBottom: 12 }}>
          Date completed
          <input type="date" value={completedDate} onChange={(e) => setCompletedDate(e.target.value)} style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }} />
        </label>

        <label style={{ display: 'block', marginBottom: 12 }}>
          Notes (optional)
          <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} style={{ display: 'block', width: '100%', padding: 8, marginTop: 4 }} />
        </label>

        <label style={{ display: 'block', padding: 12, border: '1px dashed #999', textAlign: 'center', cursor: 'pointer', marginBottom: 16 }}>
          {fileName || 'Click to attach evidence'}
          <input type="file" style={{ display: 'none' }} onChange={handleFileSelect} />
        </label>

        <button type="submit" disabled={submitting} style={{ width: '100%', padding: 12, fontWeight: 600 }}>
          {submitting ? 'SUBMITTING…' : 'SUBMIT'}
        </button>
      </form>
    </div>
  );
};

export default PublicUpload;
