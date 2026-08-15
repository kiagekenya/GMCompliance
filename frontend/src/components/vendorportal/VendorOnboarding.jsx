// VendorOnboarding.jsx
//
// A vendor's own self-reported profile form - what makes them show up as
// more than a blank row in an operator's Vendors list, and what a vendor
// sees when browsing another operator's marketplace listing to decide who
// to pitch. Used two ways by VendorPortal.jsx:
//   - Full-screen, right after a brand-new vendor signs up and has no
//     VendorProfile yet (see the `profile === null` gate in VendorPortal.jsx) -
//     "don't land on an empty page."
//   - Inline under "MY PROFILE" in the normal portal shell, pre-filled, to
//     edit later.
// Same component either way - only the surrounding chrome differs (see
// OnboardingScreen vs. the plain rendering in VendorPortal.jsx's ProfilePage).

import React, { useState, useEffect } from 'react';
import { getVendorServiceCategories } from '../../api/client';

const emptyForm = {
  companyName: '', phone: '', website: '', serviceCategories: [],
  serviceArea: '', yearsInBusiness: '', certifications: '', description: '',
};

const VendorOnboarding = ({ profile, onSave, submitLabel }) => {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(() => (profile ? {
    companyName: profile.companyName || '',
    phone: profile.phone || '',
    website: profile.website || '',
    serviceCategories: profile.serviceCategories || [],
    serviceArea: profile.serviceArea || '',
    yearsInBusiness: profile.yearsInBusiness ?? '',
    certifications: profile.certifications || '',
    description: profile.description || '',
  } : emptyForm));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getVendorServiceCategories()
      .then((data) => setCategories(data.categories || []))
      .catch((err) => console.error('[VendorOnboarding] failed to load service categories:', err.message));
  }, []);

  const toggleCategory = (categoryName) => {
    setForm((f) => ({
      ...f,
      serviceCategories: f.serviceCategories.includes(categoryName)
        ? f.serviceCategories.filter((c) => c !== categoryName)
        : [...f.serviceCategories, categoryName],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.companyName) {
      setError('Company name is required.');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        ...form,
        yearsInBusiness: form.yearsInBusiness === '' ? null : Number(form.yearsInBusiness),
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="vp-card">
      <div className="vp-card-header">COMPANY PROFILE</div>
      <div className="vp-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {error && <p style={{ color: '#c0392b', fontSize: 13, margin: 0 }}>⚠ {error}</p>}

        <div>
          <label className="vp-field-label">Company name *</label>
          <input className="vp-input" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label className="vp-field-label">Phone</label>
            <input className="vp-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="vp-field-label">Website</label>
            <input className="vp-input" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://" />
          </div>
        </div>

        <div>
          <label className="vp-field-label">Services offered</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
            {categories.map((c) => (
              <label key={c.categoryName} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 400 }}>
                <input
                  type="checkbox"
                  checked={form.serviceCategories.includes(c.categoryName)}
                  onChange={() => toggleCategory(c.categoryName)}
                />
                {c.categoryName}
              </label>
            ))}
            {categories.length === 0 && <span style={{ fontSize: 12, opacity: 0.6 }}>Loading categories…</span>}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label className="vp-field-label">Service area (counties/regions)</label>
            <input className="vp-input" value={form.serviceArea} onChange={(e) => setForm({ ...form, serviceArea: e.target.value })} />
          </div>
          <div style={{ width: 140 }}>
            <label className="vp-field-label">Years in business</label>
            <input type="number" min="0" className="vp-input" value={form.yearsInBusiness} onChange={(e) => setForm({ ...form, yearsInBusiness: e.target.value })} />
          </div>
        </div>

        <div>
          <label className="vp-field-label">Certifications</label>
          <input className="vp-input" value={form.certifications} onChange={(e) => setForm({ ...form, certifications: e.target.value })} placeholder="e.g. OQ certified, API 1169..." />
        </div>

        <div>
          <label className="vp-field-label">Description</label>
          <textarea
            className="vp-input"
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="What you do, and why an operator should pick you..."
          />
        </div>

        <button type="submit" className="vp-primary-btn" style={{ alignSelf: 'flex-start' }} disabled={saving}>
          {saving ? 'SAVING…' : (submitLabel || 'SAVE PROFILE')}
        </button>
      </div>
    </form>
  );
};

export default VendorOnboarding;
