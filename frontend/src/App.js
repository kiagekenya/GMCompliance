import React, { useState, useEffect } from 'react';
import './App.css';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { SignedIn, SignedOut, SignIn, UserButton, useUser } from '@clerk/clerk-react';

import SystemInit from './components/systeminit/SystemInit';
import MasterLedgerInit from './components/masterledgerinit/MasterLedgerInit';
import Dashboard from './components/dashboard/Dashboard';
import PublicUpload from './components/publicupload/PublicUpload';
import VendorPortal from './components/vendorportal/VendorPortal';
import { getCurrentOperator, getProfile, getComplianceItems, listVendors, identify } from './api/client';

// Stashed the moment someone clicks a role button on the login screen (see
// RoleChoice below), read once after Clerk auth succeeds, then cleared.
// sessionStorage survives Clerk's own internal redirects better than plain
// React state would.
const ROLE_CHOICE_KEY = 'gc_login_role_choice';

function AuthenticatedApp() {
  const [view, setView] = useState('checking'); // 'checking' | 'init' | 'master' | 'dashboard'
  const [userConfig, setUserConfig] = useState(null);
  const { isLoaded, isSignedIn } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  // Runs once per sign-in. Decides where a person actually belongs instead
  // of always starting them at Step 1. Once it settles on 'dashboard', it
  // pushes a real /dashboard URL - that's what makes the browser back
  // button actually work from here on (see Dashboard.jsx for the rest of
  // the real routing, down to individual requirement pages).
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    if (location.pathname.startsWith('/dashboard')) {
      // Already deep-linked into the dashboard (e.g. browser back/forward,
      // or a bookmarked/shared URL) - don't re-run the bootstrap redirect,
      // just let Dashboard itself load its data.
      setView('dashboard');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const itemsResp = await getComplianceItems();
        const items = itemsResp.items || [];
        console.log(`[App] bootstrap: ${items.length} existing compliance items found`);

        if (items.length > 0) {
          const [operatorResp, vendorsResp] = await Promise.all([
            getCurrentOperator().catch(() => ({ operator: {} })),
            listVendors().catch(() => ({ vendors: [] })),
          ]);
          if (cancelled) return;
          setUserConfig({
            operatorName: operatorResp.operator?.companyName || 'Operator',
            vendors: vendorsResp.vendors || [],
          });
          setView('dashboard');
          navigate('/dashboard');
          return;
        }

        try {
          const profileResp = await getProfile();
          const operatorResp = await getCurrentOperator().catch(() => ({ operator: {} }));
          if (cancelled) return;
          console.log('[App] bootstrap: profile exists but no confirmed items yet - resuming at the compliance ledger step');
          setUserConfig({
            operatorName: operatorResp.operator?.companyName || 'Operator',
            material: profileResp.pipeMaterial,
            type: profileResp.assetType,
            phmsa: true,
            trrc: true,
          });
          setView('master');
        } catch (profileErr) {
          if (cancelled) return;
          console.log('[App] bootstrap: no profile found - starting fresh at Step 1');
          setView('init');
        }
      } catch (err) {
        console.error('[App] bootstrap failed:', err);
        if (!cancelled) setView('init');
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn]);

  const handleSystemInitComplete = (configData) => {
    setUserConfig(configData);
    setView('master');
  };

  const handleInitializeDashboard = () => {
    setView('dashboard');
    navigate('/dashboard');
  };

  if (view === 'checking') {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading your compliance calendar…</div>;
  }

  if (view === 'dashboard' || location.pathname.startsWith('/dashboard')) {
    return <Dashboard configData={userConfig} />;
  }

  if (view === 'master') {
    return <MasterLedgerInit configData={userConfig} onInitializeDashboard={handleInitializeDashboard} />;
  }

  return <SystemInit onComplete={handleSystemInitComplete} />;
}

// Shown before Clerk's sign-in widget, for both new and returning users.
// The choice only actually matters the first time a given Clerk account is
// ever seen (see backend/routes/auth/identify.js) - a returning user's
// real stored role always wins over whatever they click here, so a
// misclick on a later visit can't reassign anyone's identity.
function RoleChoice({ onChoose }) {
  const choose = (role) => {
    sessionStorage.setItem(ROLE_CHOICE_KEY, role);
    onChoose(role);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 24, padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Galaxy Compliance Assistant</h1>
      <p style={{ opacity: 0.7, margin: 0, textAlign: 'center', maxWidth: 380 }}>
        Continue as an operator managing your compliance calendar, or as a vendor completing assigned work.
      </p>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          type="button"
          onClick={() => choose('operator')}
          style={{ padding: '18px 28px', fontSize: 15, fontWeight: 700, borderRadius: 10, border: '1px solid #e2e8f0', background: '#1e293b', color: '#fff', cursor: 'pointer', minWidth: 200 }}
        >
          <i className="fas fa-building" aria-hidden="true" style={{ marginRight: 8 }}></i>
          Continue as Operator
        </button>
        <button
          type="button"
          onClick={() => choose('vendor')}
          style={{ padding: '18px 28px', fontSize: 15, fontWeight: 700, borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', color: '#1e293b', cursor: 'pointer', minWidth: 200 }}
        >
          <i className="fas fa-truck" aria-hidden="true" style={{ marginRight: 8 }}></i>
          Continue as Vendor
        </button>
      </div>
    </div>
  );
}

// Runs once per sign-in, after Clerk auth succeeds: tells the backend which
// role was chosen at the login screen (only used the first time this Clerk
// account is ever seen), then renders the right app for whatever role the
// backend actually settled on.
function RoleRouter() {
  const [role, setRole] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const intendedRole = sessionStorage.getItem(ROLE_CHOICE_KEY) || 'operator';
    identify(intendedRole)
      .then((data) => {
        sessionStorage.removeItem(ROLE_CHOICE_KEY);
        setRole(data.role);
      })
      .catch((err) => {
        console.error('[App] identify failed:', err);
        setError(err.message);
      });
  }, []);

  if (error) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#c0392b' }}>⚠ {error}</div>;
  }
  if (!role) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading…</div>;
  }
  return role === 'vendor' ? <VendorPortal /> : <AuthenticatedApp />;
}

function GatedApp() {
  const [roleChoiceMade, setRoleChoiceMade] = useState(() => Boolean(sessionStorage.getItem(ROLE_CHOICE_KEY)));

  return (
    <div className="App">
      <SignedOut>
        {roleChoiceMade ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
            <SignIn routing="virtual" />
          </div>
        ) : (
          <RoleChoice onChoose={() => setRoleChoiceMade(true)} />
        )}
      </SignedOut>

      <SignedIn>
        <div style={{ position: 'fixed', top: 12, right: 16, zIndex: 1000 }}>
          <UserButton afterSignOutUrl="/" />
        </div>
        <RoleRouter />
      </SignedIn>
    </div>
  );
}

function App() {
  return (
    <Routes>
      {/* Public - no Clerk account needed. Must be a real top-level route,
          checked before the Clerk gate, since the assignee visiting it may
          have no account with this app at all. */}
      <Route path="/upload/:token" element={<PublicUploadRoute />} />
      <Route path="/*" element={<GatedApp />} />
    </Routes>
  );
}

function PublicUploadRoute() {
  const path = window.location.pathname;
  const token = path.split('/upload/')[1];
  return <PublicUpload token={token} />;
}

export default App;
