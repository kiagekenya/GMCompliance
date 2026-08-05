// PublicUpload.jsx
//
// Not behind Clerk's sign-in gate (see App.js). What an assigned person
// with no system account lands on after clicking their assignment email.
// Supports attaching multiple files, each individually removable before
// submitting. Submitting only fills draft fields - an admin still reviews
// and clicks MARK COMPLIANT separately inside the real app.

import React, { useEffect, useState } from 'react';

const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

const PublicUpload = ({ token }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [info, setInfo] = useState(null);
  const [files, setFiles] = useState([]);
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
        setFiles(data.existingFiles || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('[PublicUpload] failed to load info:', err);
        setError(err.message);
        setLoading(false);
      });
  }, [token]);

  const handleFileSelect = (e) => {
    const newNames = Array.from(e.target.files).map((f) => f.name);
    setFiles((prev) => [...new Set([...prev, ...newNames])]);
    e.target.value = '';
  };

  const removeFile = (name) => setFiles((prev) => prev.filter((f) => f !== name));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0) {
      setError('Please attach at least one file first.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${BASE_URL}/public/upload/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evidenceUrls: files, notes, completedDate }),
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
        <p style={{ color: '#C98A1E' }}>You already submitted something for this - you can add more files below or remove ones you no longer want.</p>
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

        <label style={{ display: 'block', padding: 12, border: '1px dashed #999', textAlign: 'center', cursor: 'pointer', marginBottom: 12 }}>
          Click to attach evidence (you can select several)
          <input type="file" multiple style={{ display: 'none' }} onChange={handleFileSelect} />
        </label>

        {files.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            {files.map((f) => (
              <div key={f} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#f2f2f2', borderRadius: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 13 }}>📎 {f}</span>
                <button type="button" onClick={() => removeFile(f)} style={{ border: 'none', background: 'none', color: '#c0392b', cursor: 'pointer' }}>✕</button>
              </div>
            ))}
          </div>
        )}

        <button type="submit" disabled={submitting} style={{ width: '100%', padding: 12, fontWeight: 600 }}>
          {submitting ? 'SUBMITTING…' : 'SUBMIT'}
        </button>
      </form>
    </div>
  );
};

export default PublicUpload;
