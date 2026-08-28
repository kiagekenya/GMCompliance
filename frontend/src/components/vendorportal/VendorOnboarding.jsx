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
  companyName: '',
  phone: '',
  website: '',
  serviceCategories: [],
  serviceArea: '',
  yearsInBusiness: '',
  certifications: '',
  description: '',
};

const VendorOnboarding = ({ profile, onSave, submitLabel }) => {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(() =>
    profile
      ? {
          companyName: profile.companyName || '',
          phone: profile.phone || '',
          website: profile.website || '',
          serviceCategories: profile.serviceCategories || [],
          serviceArea: profile.serviceArea || '',
          yearsInBusiness: profile.yearsInBusiness ?? '',
          certifications: profile.certifications || '',
          description: profile.description || '',
        }
      : emptyForm
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getVendorServiceCategories()
      .then((data) => setCategories(data.categories || []))
      .catch((err) =>
        console.error(
          '[VendorOnboarding] failed to load service categories:',
          err.message
        )
      );
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
        yearsInBusiness:
          form.yearsInBusiness === '' ? null : Number(form.yearsInBusiness),
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)',
        border: '1px solid #eef2f6',
        overflow: 'hidden',
        maxWidth: '820px',
        margin: '0 auto',
        transition: 'box-shadow 0.2s ease',
      }}
    >
      {/* Header with accent bar */}
      <div
        style={{
          padding: '18px 28px',
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #eef2f6',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div
          style={{
            width: '4px',
            height: '28px',
            backgroundColor: '#2c3e50',
            borderRadius: '4px',
          }}
        />
        <span
          style={{
            fontSize: '15px',
            fontWeight: 600,
            letterSpacing: '0.5px',
            color: '#1a2634',
          }}
        >
          COMPANY PROFILE
        </span>
      </div>

      <div
        style={{
          padding: '28px 32px 32px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
        }}
      >
        {/* Error message */}
        {error && (
          <div
            style={{
              backgroundColor: '#fef6f6',
              borderRadius: '8px',
              padding: '10px 16px',
              border: '1px solid #fad2d2',
              color: '#b91c1c',
              fontSize: '13px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span style={{ fontSize: '16px' }}>⚠️</span> {error}
          </div>
        )}

        {/* Company name */}
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
            Company name <span style={{ color: '#b91c1c' }}>*</span>
          </label>
          <input
            style={{
              width: '100%',
              padding: '10px 14px',
              fontSize: '14px',
              borderRadius: '8px',
              border: '1px solid #dce1e8',
              backgroundColor: '#fafbfc',
              transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
              outline: 'none',
              boxSizing: 'border-box',
            }}
            value={form.companyName}
            onChange={(e) => setForm({ ...form, companyName: e.target.value })}
            onFocus={(e) => {
              e.target.style.borderColor = '#2c3e50';
              e.target.style.boxShadow = '0 0 0 3px rgba(44,62,80,0.08)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#dce1e8';
              e.target.style.boxShadow = 'none';
            }}
            placeholder="Enter your company name"
          />
        </div>

        {/* Phone & Website */}
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 500,
                color: '#2c3e50',
                marginBottom: '5px',
              }}
            >
              Phone
            </label>
            <input
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: '14px',
                borderRadius: '8px',
                border: '1px solid #dce1e8',
                backgroundColor: '#fafbfc',
                transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              onFocus={(e) => {
                e.target.style.borderColor = '#2c3e50';
                e.target.style.boxShadow = '0 0 0 3px rgba(44,62,80,0.08)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#dce1e8';
                e.target.style.boxShadow = 'none';
              }}
              placeholder="(555) 123-4567"
            />
          </div>
          <div style={{ flex: 1 }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 500,
                color: '#2c3e50',
                marginBottom: '5px',
              }}
            >
              Website
            </label>
            <input
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: '14px',
                borderRadius: '8px',
                border: '1px solid #dce1e8',
                backgroundColor: '#fafbfc',
                transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              onFocus={(e) => {
                e.target.style.borderColor = '#2c3e50';
                e.target.style.boxShadow = '0 0 0 3px rgba(44,62,80,0.08)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#dce1e8';
                e.target.style.boxShadow = 'none';
              }}
              placeholder="https://example.com"
            />
          </div>
        </div>

        {/* Services offered */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 500,
              color: '#2c3e50',
              marginBottom: '8px',
            }}
          >
            Services offered
          </label>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px 20px',
              padding: '12px 16px',
              backgroundColor: '#fafbfc',
              borderRadius: '8px',
              border: '1px solid #eef2f6',
            }}
          >
            {categories.map((c) => (
              <label
                key={c.categoryName}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  fontSize: '13px',
                  fontWeight: 400,
                  color: '#2c3e50',
                  cursor: 'pointer',
                  transition: 'color 0.15s ease',
                }}
              >
                <input
                  type="checkbox"
                  checked={form.serviceCategories.includes(c.categoryName)}
                  onChange={() => toggleCategory(c.categoryName)}
                  style={{
                    width: '16px',
                    height: '16px',
                    accentColor: '#2c3e50',
                    cursor: 'pointer',
                    borderRadius: '4px',
                  }}
                />
                {c.categoryName}
              </label>
            ))}
            {categories.length === 0 && (
              <span style={{ fontSize: '12px', color: '#8a94a6' }}>
                Loading categories…
              </span>
            )}
          </div>
        </div>

        {/* Service area & Years in business */}
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 500,
                color: '#2c3e50',
                marginBottom: '5px',
              }}
            >
              Service area (counties/regions)
            </label>
            <input
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: '14px',
                borderRadius: '8px',
                border: '1px solid #dce1e8',
                backgroundColor: '#fafbfc',
                transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              value={form.serviceArea}
              onChange={(e) => setForm({ ...form, serviceArea: e.target.value })}
              onFocus={(e) => {
                e.target.style.borderColor = '#2c3e50';
                e.target.style.boxShadow = '0 0 0 3px rgba(44,62,80,0.08)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#dce1e8';
                e.target.style.boxShadow = 'none';
              }}
              placeholder="e.g. Harris, Fort Bend, Montgomery"
            />
          </div>
          <div style={{ width: '160px', flexShrink: 0 }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 500,
                color: '#2c3e50',
                marginBottom: '5px',
              }}
            >
              Years in business
            </label>
            <input
              type="number"
              min="0"
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: '14px',
                borderRadius: '8px',
                border: '1px solid #dce1e8',
                backgroundColor: '#fafbfc',
                transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              value={form.yearsInBusiness}
              onChange={(e) =>
                setForm({ ...form, yearsInBusiness: e.target.value })
              }
              onFocus={(e) => {
                e.target.style.borderColor = '#2c3e50';
                e.target.style.boxShadow = '0 0 0 3px rgba(44,62,80,0.08)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#dce1e8';
                e.target.style.boxShadow = 'none';
              }}
              placeholder="0"
            />
          </div>
        </div>

        {/* Certifications */}
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
            Certifications
          </label>
          <input
            style={{
              width: '100%',
              padding: '10px 14px',
              fontSize: '14px',
              borderRadius: '8px',
              border: '1px solid #dce1e8',
              backgroundColor: '#fafbfc',
              transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
              outline: 'none',
              boxSizing: 'border-box',
            }}
            value={form.certifications}
            onChange={(e) =>
              setForm({ ...form, certifications: e.target.value })
            }
            onFocus={(e) => {
              e.target.style.borderColor = '#2c3e50';
              e.target.style.boxShadow = '0 0 0 3px rgba(44,62,80,0.08)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#dce1e8';
              e.target.style.boxShadow = 'none';
            }}
            placeholder="e.g. OQ certified, API 1169, ISO 9001"
          />
        </div>

        {/* Description */}
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
            Description
          </label>
          <textarea
            rows={3}
            style={{
              width: '100%',
              padding: '10px 14px',
              fontSize: '14px',
              borderRadius: '8px',
              border: '1px solid #dce1e8',
              backgroundColor: '#fafbfc',
              fontFamily: 'inherit',
              resize: 'vertical',
              transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
              outline: 'none',
              boxSizing: 'border-box',
              minHeight: '80px',
            }}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            onFocus={(e) => {
              e.target.style.borderColor = '#2c3e50';
              e.target.style.boxShadow = '0 0 0 3px rgba(44,62,80,0.08)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#dce1e8';
              e.target.style.boxShadow = 'none';
            }}
            placeholder="What you do, and why an operator should pick you..."
          />
        </div>

        {/* Submit button */}
        <button
          type="submit"
          style={{
            alignSelf: 'flex-start',
            padding: '10px 32px',
            backgroundColor: '#2c3e50',
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: 600,
            letterSpacing: '0.5px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            transition: 'background-color 0.2s ease, transform 0.1s ease',
            marginTop: '4px',
          }}
          disabled={saving}
          onMouseEnter={(e) => {
            if (!saving) e.target.style.backgroundColor = '#1a2634';
          }}
          onMouseLeave={(e) => {
            if (!saving) e.target.style.backgroundColor = '#2c3e50';
          }}
        >
          {saving ? 'SAVING…' : submitLabel || 'SAVE PROFILE'}
        </button>
      </div>
    </form>
  );
};

export default VendorOnboarding;