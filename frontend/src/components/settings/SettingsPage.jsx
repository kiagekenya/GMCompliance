// SettingsPage.jsx
//
// One place to review and edit everything entered during setup: pipeline
// profile (Step 1), contacts (Step 2), vendors (Step 3). Contacts/vendors
// already have add forms elsewhere (Escalation Ladder / Vendors pages) -
// this is where edit + delete live, since those were never wired up
// anywhere in the UI before even though the backend has always supported
// them (routes/contacts/updateContact.js, deleteContact.js, etc.).
//
// Editing the pipeline profile here does NOT retroactively add or remove
// items already on the compliance calendar - that reconciliation is a
// separate, bigger feature. This only updates the stored profile answers.

import React, { useEffect, useState } from 'react';
import './SettingsPage.css';
import {
  getProfile, saveProfile, updateContact, deleteContact, updateVendor, deleteVendor,
  getSuggestedRequirements, confirmComplianceItems,
} from '../../api/client';

const PROFILE_TOGGLES = [
  ['hasRegulatingStations', 'Pressure limiting / regulating stations?'],
  ['vaultVolumeGreater200cf', 'Vaults over 200 cubic feet?'],
  ['hasControlRoom', 'Dedicated control room?'],
  ['isOdorized', 'Gas system actively odorized?'],
  ['transportsCorrosiveGas', 'Transports corrosive gas?'],
  ['hasHighConsequenceAreas', 'Passes through High Consequence Areas?'],
  ['servesPublicSchools', 'Serves public school piping?'],
  ['hasBusinessDistricts', 'Runs inside a business district?'],
  ['hasNonBusinessAssets', 'Has assets outside business districts?'],
  ['isCathodicallyProtected', 'Cathodically protected steel segments?'],
  ['hasCpRectifiers', 'Uses CP rectifiers / power sources?'],
  ['hasInterferenceBonds', 'Has critical interference bonds/diodes?'],
  ['isBareUnprotectedSteel', 'Any bare/unprotected legacy steel?'],
  ['hasExposedOnshoreSteel', 'Onshore steel exposed to atmosphere?'],
  ['isOffshore', 'Manages offshore structures?'],
  ['hasWeldedPiping', 'Requires on-site production welding?'],
];

const SettingsPage = ({ contacts = [], vendorList = [], onContactsChanged, onVendorsChanged, onItemsChanged }) => {
  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  const [editingContactId, setEditingContactId] = useState(null);
  const [contactDraft, setContactDraft] = useState({});
  const [contactError, setContactError] = useState('');

  const [editingVendorId, setEditingVendorId] = useState(null);
  const [vendorDraft, setVendorDraft] = useState({});
  const [vendorError, setVendorError] = useState('');

  useEffect(() => {
    getProfile()
      .then((data) => { setProfile(data); setProfileForm(data); })
      .catch((err) => { console.error('[SettingsPage] getProfile failed:', err); setProfileError(err.message); })
      .finally(() => setProfileLoading(false));
  }, []);

  const handleProfileFieldChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProfileForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setProfileError('');
    setSyncMessage('');
    try {
      const saved = await saveProfile({
        ...profileForm,
        classLocation: profileForm.classLocation ? Number(profileForm.classLocation) : null,
      });
      setProfile(saved);
      setProfileForm(saved);
      setEditingProfile(false);

      // A profile edit can newly match requirements that didn't apply
      // before (e.g. checking "has cathodic protection" unlocks the CP
      // testing items). Re-run the same suggest -> confirm flow the
      // original setup wizard used - confirmComplianceItems is idempotent
      // (upserts on operatorId+requirementId+variant), so items already on
      // the calendar are left untouched; only genuinely new matches get
      // added.
      try {
        const { suggestedItems } = await getSuggestedRequirements();
        const items = (suggestedItems || []).map((i) => ({
          requirementId: i.requirementId,
          frequencyVariantId: i.frequencyVariantId || undefined,
        }));
        const result = await confirmComplianceItems(items);
        setSyncMessage(
          result.createdCount > 0
            ? `Profile saved - ${result.createdCount} new requirement(s) added to your calendar.`
            : 'Profile saved - no new requirements matched your updated answers.'
        );
        if (onItemsChanged) onItemsChanged();
      } catch (syncErr) {
        console.error('[SettingsPage] resync after profile save failed:', syncErr);
        setSyncMessage(`Profile saved, but syncing your calendar failed: ${syncErr.message}`);
      }
    } catch (err) {
      console.error('[SettingsPage] saveProfile failed:', err);
      setProfileError(err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const startEditContact = (c) => { setEditingContactId(c._id); setContactDraft({ ...c }); setContactError(''); };
  const cancelEditContact = () => { setEditingContactId(null); setContactDraft({}); };

  const handleSaveContact = async () => {
    setContactError('');
    try {
      await updateContact(editingContactId, {
        fullName: contactDraft.fullName,
        title: contactDraft.title,
        email: contactDraft.email,
        phone: contactDraft.phone,
        escalationLevel: Number(contactDraft.escalationLevel),
      });
      setEditingContactId(null);
      onContactsChanged();
    } catch (err) {
      console.error('[SettingsPage] updateContact failed:', err);
      setContactError(err.message);
    }
  };

  const handleDeleteContact = async (id) => {
    setContactError('');
    try {
      await deleteContact(id);
      onContactsChanged();
    } catch (err) {
      console.error('[SettingsPage] deleteContact failed:', err);
      setContactError(err.message);
    }
  };

  const startEditVendor = (v) => { setEditingVendorId(v._id); setVendorDraft({ ...v }); setVendorError(''); };
  const cancelEditVendor = () => { setEditingVendorId(null); setVendorDraft({}); };

  const handleSaveVendor = async () => {
    setVendorError('');
    try {
      await updateVendor(editingVendorId, {
        companyName: vendorDraft.companyName,
        personnelName: vendorDraft.personnelName,
        email: vendorDraft.email,
        phone: vendorDraft.phone,
        serviceScope: vendorDraft.serviceScope,
        hasPortalAccess: Boolean(vendorDraft.hasPortalAccess),
      });
      setEditingVendorId(null);
      onVendorsChanged();
    } catch (err) {
      console.error('[SettingsPage] updateVendor failed:', err);
      setVendorError(err.message);
    }
  };

  const handleDeleteVendor = async (id) => {
    setVendorError('');
    try {
      await deleteVendor(id);
      onVendorsChanged();
    } catch (err) {
      console.error('[SettingsPage] deleteVendor failed:', err);
      setVendorError(err.message);
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h2>System Settings</h2>
        {/* <p className="settings-subtitle">
          Everything entered during setup, in one place — view, edit, or remove it.
        </p> */}
      </div>

      {/* ---- Pipeline Profile ---- */}
      <div className="settings-section-label">
        Pipeline profile
        {!profileLoading && profile && !editingProfile && (
          <span className="settings-section-actions">
            <button className="settings-edit-btn" onClick={() => setEditingProfile(true)}>
              <i className="fas fa-user-edit"></i> Edit
            </button>
          </span>
        )}
      </div>

      {profileLoading && <p className="settings-loading">Loading profile…</p>}
      {profileError && <p className="settings-error">⚠ {profileError}</p>}
      {syncMessage && <p className="settings-success">✓ {syncMessage}</p>}

      {!profileLoading && profile && !editingProfile && (
        <>
          <div className="profile-readout">
            <div className="profile-readout-stat">
              <span className="profile-readout-label">Asset type</span>
              <span className="profile-readout-value">{profile.assetType}</span>
            </div>
            <div className="profile-readout-stat">
              <span className="profile-readout-label">Pipe material</span>
              <span className="profile-readout-value">{profile.pipeMaterial}</span>
            </div>
            <div className="profile-readout-stat">
              <span className="profile-readout-label">Class location</span>
              <span className="profile-readout-value">{profile.classLocation ? `Class ${profile.classLocation}` : 'Not set'}</span>
            </div>
            {profile.hasWeldedPiping && (
              <div className="profile-readout-stat">
                <span className="profile-readout-label">Welder requal path</span>
                <span className="profile-readout-value">{profile.welderRequalPath || 'Not set'}</span>
              </div>
            )}
          </div>

          <div className="profile-toggle-grid">
            {PROFILE_TOGGLES.map(([field, label]) => (
              <div key={field} className={`profile-toggle${profile[field] ? ' is-on' : ''}`}>
                <span className="profile-toggle-dot"></span>
                {label}
              </div>
            ))}
          </div>
        </>
      )}

      {!profileLoading && profile && editingProfile && (
        <div>
          <div className="profile-edit-row">
            <div className="profile-edit-field">
              <label className="profile-edit-label">Asset type</label>
              <select name="assetType" className="settings-select" value={profileForm.assetType} onChange={handleProfileFieldChange}>
                <option value="Transmission">Transmission</option>
                <option value="Distribution">Distribution</option>
                <option value="Both">Both</option>
              </select>
            </div>
            <div className="profile-edit-field">
              <label className="profile-edit-label">Pipe material</label>
              <select name="pipeMaterial" className="settings-select" value={profileForm.pipeMaterial} onChange={handleProfileFieldChange}>
                <option value="Steel">Steel</option>
                <option value="Plastic">Plastic</option>
                <option value="Both">Both</option>
              </select>
            </div>
            <div className="profile-edit-field">
              <label className="profile-edit-label">Class location</label>
              <select name="classLocation" className="settings-select" value={profileForm.classLocation || ''} onChange={handleProfileFieldChange}>
                <option value="">Select…</option>
                <option value="1">Class 1</option>
                <option value="2">Class 2</option>
                <option value="3">Class 3</option>
                <option value="4">Class 4</option>
              </select>
            </div>
          </div>

          <div className="profile-checkbox-grid">
            {PROFILE_TOGGLES.map(([field, label]) => (
              <label className="profile-checkbox-row" key={field}>
                <input type="checkbox" name={field} checked={Boolean(profileForm[field])} onChange={handleProfileFieldChange} />
                {label}
              </label>
            ))}
          </div>

          {profileForm.hasWeldedPiping && (
            <div className="profile-edit-field" style={{ maxWidth: 320, marginBottom: 20 }}>
              <label className="profile-edit-label">Welder re-qualification path</label>
              <select name="welderRequalPath" className="settings-select" value={profileForm.welderRequalPath || ''} onChange={handleProfileFieldChange}>
                <option value="">Select a path…</option>
                <option value="destructive_test_path">Destructive/non-destructive re-test (twice yearly)</option>
                <option value="annual_path">Annual re-qualification (once yearly)</option>
              </select>
            </div>
          )}

          <div className="settings-form-actions">
            <button className="settings-save-btn" onClick={handleSaveProfile} disabled={savingProfile}>
              {savingProfile ? 'Saving…' : 'Save changes'}
            </button>
            <button className="settings-cancel-btn" onClick={() => { setEditingProfile(false); setProfileForm(profile); }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ---- Contacts ---- */}
      <div className="settings-section-label">Contacts</div>
      {contactError && <p className="settings-error">⚠ {contactError}</p>}
      <div className="settings-table-wrap">
        <table className="settings-table">
          <thead>
            <tr><th>Level</th><th>Name</th><th>Title</th><th>Email</th><th>Phone</th><th></th></tr>
          </thead>
          <tbody>
            {contacts.length === 0 ? (
              <tr><td colSpan="6" className="settings-empty-cell">No contacts yet.</td></tr>
            ) : contacts.map((c) => (
              editingContactId === c._id ? (
                <tr key={c._id} className="is-editing">
                  <td>
                    <input
                      className="settings-table-input"
                      type="number"
                      min="1"
                      value={contactDraft.escalationLevel}
                      onChange={(e) => setContactDraft({ ...contactDraft, escalationLevel: e.target.value })}
                    />
                  </td>
                  <td><input className="settings-table-input" value={contactDraft.fullName} onChange={(e) => setContactDraft({ ...contactDraft, fullName: e.target.value })} /></td>
                  <td><input className="settings-table-input" value={contactDraft.title} onChange={(e) => setContactDraft({ ...contactDraft, title: e.target.value })} /></td>
                  <td><input className="settings-table-input" value={contactDraft.email} onChange={(e) => setContactDraft({ ...contactDraft, email: e.target.value })} /></td>
                  <td><input className="settings-table-input" value={contactDraft.phone} onChange={(e) => setContactDraft({ ...contactDraft, phone: e.target.value })} /></td>
                  <td className="settings-row-actions">
                    <button className="settings-row-save" onClick={handleSaveContact}>Save</button>
                    <button className="settings-row-cancel" onClick={cancelEditContact}>Cancel</button>
                  </td>
                </tr>
              ) : (
                <tr key={c._id}>
                  <td>{c.escalationLevel}</td>
                  <td>{c.fullName}</td>
                  <td>{c.title}</td>
                  <td className="is-mono">{c.email}</td>
                  <td className="is-mono">{c.phone}</td>
                  <td className="settings-row-actions">
                    <button className="settings-icon-btn" onClick={() => startEditContact(c)} aria-label="Edit"><i className="fas fa-pen"></i></button>
                    <button className="settings-icon-btn danger" onClick={() => handleDeleteContact(c._id)} aria-label="Delete"><i className="fas fa-trash"></i></button>
                  </td>
                </tr>
              )
            ))}
          </tbody>
        </table>
      </div>

      {/* ---- Vendors ---- */}
      <div className="settings-section-label">Vendors</div>
      {vendorError && <p className="settings-error">⚠ {vendorError}</p>}
      <div className="settings-table-wrap" style={{ marginBottom: 24 }}>
        <table className="settings-table">
          <thead>
            <tr><th>Company</th><th>Contact person</th><th>Email</th><th>Phone</th><th>Service scope</th><th>Portal access</th><th></th></tr>
          </thead>
          <tbody>
            {vendorList.length === 0 ? (
              <tr><td colSpan="7" className="settings-empty-cell">No vendors yet.</td></tr>
            ) : vendorList.map((v) => (
              editingVendorId === v._id ? (
                <tr key={v._id} className="is-editing">
                  <td><input className="settings-table-input" value={vendorDraft.companyName} onChange={(e) => setVendorDraft({ ...vendorDraft, companyName: e.target.value })} /></td>
                  <td><input className="settings-table-input" value={vendorDraft.personnelName} onChange={(e) => setVendorDraft({ ...vendorDraft, personnelName: e.target.value })} /></td>
                  <td><input className="settings-table-input" value={vendorDraft.email} onChange={(e) => setVendorDraft({ ...vendorDraft, email: e.target.value })} /></td>
                  <td><input className="settings-table-input" value={vendorDraft.phone} onChange={(e) => setVendorDraft({ ...vendorDraft, phone: e.target.value })} /></td>
                  <td><input className="settings-table-input" value={vendorDraft.serviceScope} onChange={(e) => setVendorDraft({ ...vendorDraft, serviceScope: e.target.value })} /></td>
                  <td className="is-center">
                    <input type="checkbox" checked={Boolean(vendorDraft.hasPortalAccess)} onChange={(e) => setVendorDraft({ ...vendorDraft, hasPortalAccess: e.target.checked })} />
                  </td>
                  <td className="settings-row-actions">
                    <button className="settings-row-save" onClick={handleSaveVendor}>Save</button>
                    <button className="settings-row-cancel" onClick={cancelEditVendor}>Cancel</button>
                  </td>
                </tr>
              ) : (
                <tr key={v._id}>
                  <td>{v.companyName}</td>
                  <td>{v.personnelName}</td>
                  <td className="is-mono">{v.email}</td>
                  <td className="is-mono">{v.phone}</td>
                  <td>{v.serviceScope}</td>
                  <td className="is-center">
                    {v.hasPortalAccess ? (
                      <span className="settings-access-chip">Granted</span>
                    ) : (
                      <span className="settings-access-muted">Not granted</span>
                    )}
                  </td>
                  <td className="settings-row-actions">
                    <button className="settings-icon-btn" onClick={() => startEditVendor(v)} aria-label="Edit"><i className="fas fa-pen"></i></button>
                    <button className="settings-icon-btn danger" onClick={() => handleDeleteVendor(v._id)} aria-label="Delete"><i className="fas fa-trash"></i></button>
                  </td>
                </tr>
              )
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SettingsPage;
