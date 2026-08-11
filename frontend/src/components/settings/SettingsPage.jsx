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
    <>
      <h2>System Settings</h2>
      <p style={{ opacity: 0.7, fontSize: 13, marginTop: -8 }}>
        Everything entered during setup, in one place - view, edit, or remove it.
      </p>

      {/* ---- Pipeline Profile ---- */}
      <div className="ledger-scroll" style={{ height: 'auto', marginTop: 16 }}>
        <div className="settings-section-header">
          <div className="card-label">PIPELINE PROFILE</div>
          {!profileLoading && profile && !editingProfile && (
            <button className="action-button edit" onClick={() => setEditingProfile(true)}>
              <i className="fas fa-user-edit"></i> EDIT
            </button>
          )}
        </div>

        <div className="settings-section-body">
        {profileLoading && <p>Loading profile…</p>}
        {profileError && <p style={{ color: '#c0392b', fontSize: 13 }}>⚠ {profileError}</p>}
        {syncMessage && <p style={{ color: '#3F6B52', fontSize: 13 }}>✓ {syncMessage}</p>}

        {!profileLoading && profile && !editingProfile && (
          <>
            <div className="profile-summary">
              <div className="profile-stat">
                <span className="profile-stat-label">Asset Type</span>
                <span className="profile-stat-value">{profile.assetType}</span>
              </div>
              <div className="profile-stat">
                <span className="profile-stat-label">Pipe Material</span>
                <span className="profile-stat-value">{profile.pipeMaterial}</span>
              </div>
              <div className="profile-stat">
                <span className="profile-stat-label">Class Location</span>
                <span className="profile-stat-value">{profile.classLocation ? `Class ${profile.classLocation}` : 'Not set'}</span>
              </div>
              {profile.hasWeldedPiping && (
                <div className="profile-stat">
                  <span className="profile-stat-label">Welder Requal Path</span>
                  <span className="profile-stat-value">{profile.welderRequalPath || 'Not set'}</span>
                </div>
              )}
            </div>
            <div className="profile-chip-grid">
              {PROFILE_TOGGLES.map(([field, label]) => (
                <div key={field} className={`profile-chip ${profile[field] ? 'on' : ''}`}>
                  <span className="profile-chip-dot"></span>
                  {label}
                </div>
              ))}
            </div>
          </>
        )}

        {!profileLoading && profile && editingProfile && (
          <div>
            <div className="init-form-row" style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
              <div className="init-form-group" style={{ flex: 1 }}>
                <label className="init-label">Asset Type</label>
                <select name="assetType" className="init-select" value={profileForm.assetType} onChange={handleProfileFieldChange}>
                  <option value="Transmission">Transmission</option>
                  <option value="Distribution">Distribution</option>
                  <option value="Both">Both</option>
                </select>
              </div>
              <div className="init-form-group" style={{ flex: 1 }}>
                <label className="init-label">Pipe Material</label>
                <select name="pipeMaterial" className="init-select" value={profileForm.pipeMaterial} onChange={handleProfileFieldChange}>
                  <option value="Steel">Steel</option>
                  <option value="Plastic">Plastic</option>
                  <option value="Both">Both</option>
                </select>
              </div>
              <div className="init-form-group" style={{ flex: 1 }}>
                <label className="init-label">Class Location</label>
                <select name="classLocation" className="init-select" value={profileForm.classLocation || ''} onChange={handleProfileFieldChange}>
                  <option value="">Select...</option>
                  <option value="1">Class 1</option>
                  <option value="2">Class 2</option>
                  <option value="3">Class 3</option>
                  <option value="4">Class 4</option>
                </select>
              </div>
            </div>

            <div className="init-checkbox-group">
              {PROFILE_TOGGLES.map(([field, label]) => (
                <label className="init-checkbox-row" key={field}>
                  <input type="checkbox" name={field} checked={Boolean(profileForm[field])} onChange={handleProfileFieldChange} />
                  <span className="init-checkbox-box"></span>
                  <span className="init-checkbox-copy">
                    <span className="init-checkbox-title">{label}</span>
                  </span>
                </label>
              ))}
            </div>

            {profileForm.hasWeldedPiping && (
              <div className="init-form-group" style={{ marginTop: 10 }}>
                <label className="init-label">Welder Re-qualification Path</label>
                <select name="welderRequalPath" className="init-select" value={profileForm.welderRequalPath || ''} onChange={handleProfileFieldChange}>
                  <option value="">Select a path...</option>
                  <option value="destructive_test_path">Destructive/non-destructive re-test (twice yearly)</option>
                  <option value="annual_path">Annual re-qualification (once yearly)</option>
                </select>
              </div>
            )}

            <div className="action-buttons" style={{ marginTop: 14 }}>
              <button className="action-button save" onClick={handleSaveProfile} disabled={savingProfile}>
                {savingProfile ? 'SAVING…' : 'SAVE'}
              </button>
              <button className="action-button cancel" onClick={() => { setEditingProfile(false); setProfileForm(profile); }}>
                CANCEL
              </button>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* ---- Contacts ---- */}
      <div className="ledger-scroll" style={{ height: 'auto', marginTop: 16 }}>
        <div className="settings-section-header"><div className="card-label">CONTACTS</div></div>
        {contactError && <p style={{ color: '#c0392b', fontSize: 13, padding: '8px 16px 0' }}>⚠ {contactError}</p>}
        <table>
          <thead>
            <tr><th>Level</th><th>Name</th><th>Title</th><th>Email</th><th>Phone</th><th></th></tr>
          </thead>
          <tbody>
            {contacts.length === 0 ? (
              <tr><td colSpan="6" style={{ padding: 16, opacity: 0.7 }}>No contacts yet.</td></tr>
            ) : contacts.map((c) => (
              editingContactId === c._id ? (
                <tr key={c._id}>
                  <td><input className="table-input" type="number" min="1" value={contactDraft.escalationLevel} onChange={(e) => setContactDraft({ ...contactDraft, escalationLevel: e.target.value })} style={{ width: 50 }} /></td>
                  <td><input className="table-input" value={contactDraft.fullName} onChange={(e) => setContactDraft({ ...contactDraft, fullName: e.target.value })} /></td>
                  <td><input className="table-input" value={contactDraft.title} onChange={(e) => setContactDraft({ ...contactDraft, title: e.target.value })} /></td>
                  <td><input className="table-input" value={contactDraft.email} onChange={(e) => setContactDraft({ ...contactDraft, email: e.target.value })} /></td>
                  <td><input className="table-input" value={contactDraft.phone} onChange={(e) => setContactDraft({ ...contactDraft, phone: e.target.value })} /></td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="action-button save" style={{ padding: '4px 8px' }} onClick={handleSaveContact}>SAVE</button>{' '}
                    <button className="action-button cancel" style={{ padding: '4px 8px' }} onClick={cancelEditContact}>CANCEL</button>
                  </td>
                </tr>
              ) : (
                <tr key={c._id}>
                  <td>{c.escalationLevel}</td>
                  <td>{c.fullName}</td>
                  <td>{c.title}</td>
                  <td>{c.email}</td>
                  <td>{c.phone}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="row-icon-btn" onClick={() => startEditContact(c)} aria-label="Edit"><i className="fas fa-pen"></i></button>{' '}
                    <button className="row-icon-btn danger" onClick={() => handleDeleteContact(c._id)} aria-label="Delete"><i className="fas fa-trash"></i></button>
                  </td>
                </tr>
              )
            ))}
          </tbody>
        </table>
      </div>

      {/* ---- Vendors ---- */}
      <div className="ledger-scroll" style={{ height: 'auto', marginTop: 16, marginBottom: 24 }}>
        <div className="settings-section-header"><div className="card-label">VENDORS</div></div>
        {vendorError && <p style={{ color: '#c0392b', fontSize: 13, padding: '8px 16px 0' }}>⚠ {vendorError}</p>}
        <table>
          <thead>
            <tr><th>Company</th><th>Contact Person</th><th>Email</th><th>Phone</th><th>Service Scope</th><th></th></tr>
          </thead>
          <tbody>
            {vendorList.length === 0 ? (
              <tr><td colSpan="6" style={{ padding: 16, opacity: 0.7 }}>No vendors yet.</td></tr>
            ) : vendorList.map((v) => (
              editingVendorId === v._id ? (
                <tr key={v._id}>
                  <td><input className="table-input" value={vendorDraft.companyName} onChange={(e) => setVendorDraft({ ...vendorDraft, companyName: e.target.value })} /></td>
                  <td><input className="table-input" value={vendorDraft.personnelName} onChange={(e) => setVendorDraft({ ...vendorDraft, personnelName: e.target.value })} /></td>
                  <td><input className="table-input" value={vendorDraft.email} onChange={(e) => setVendorDraft({ ...vendorDraft, email: e.target.value })} /></td>
                  <td><input className="table-input" value={vendorDraft.phone} onChange={(e) => setVendorDraft({ ...vendorDraft, phone: e.target.value })} /></td>
                  <td><input className="table-input" value={vendorDraft.serviceScope} onChange={(e) => setVendorDraft({ ...vendorDraft, serviceScope: e.target.value })} /></td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="action-button save" style={{ padding: '4px 8px' }} onClick={handleSaveVendor}>SAVE</button>{' '}
                    <button className="action-button cancel" style={{ padding: '4px 8px' }} onClick={cancelEditVendor}>CANCEL</button>
                  </td>
                </tr>
              ) : (
                <tr key={v._id}>
                  <td>{v.companyName}</td>
                  <td>{v.personnelName}</td>
                  <td>{v.email}</td>
                  <td>{v.phone}</td>
                  <td>{v.serviceScope}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="row-icon-btn" onClick={() => startEditVendor(v)} aria-label="Edit"><i className="fas fa-pen"></i></button>{' '}
                    <button className="row-icon-btn danger" onClick={() => handleDeleteVendor(v._id)} aria-label="Delete"><i className="fas fa-trash"></i></button>
                  </td>
                </tr>
              )
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default SettingsPage;
