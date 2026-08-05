import React, { useState, useEffect } from 'react';
import './App.css';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { SignedIn, SignedOut, SignIn, UserButton, useUser } from '@clerk/clerk-react';

import SystemInit from './components/systeminit/SystemInit';
import MasterLedgerInit from './components/masterledgerinit/MasterLedgerInit';
import Dashboard from './components/dashboard/Dashboard';
import PublicUpload from './components/publicupload/PublicUpload';
import { getCurrentOperator, getProfile, getComplianceItems, listVendors } from './api/client';

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

function GatedApp() {
  return (
    <div className="App">
      <SignedOut>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          <SignIn routing="virtual" />
        </div>
      </SignedOut>

      <SignedIn>
        <div style={{ position: 'fixed', top: 12, right: 16, zIndex: 1000 }}>
          <UserButton afterSignOutUrl="/" />
        </div>
        <AuthenticatedApp />
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
