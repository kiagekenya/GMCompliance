import React, { useState, useEffect } from 'react';
import './App.css';
import { SignedIn, SignedOut, SignIn, UserButton, useUser } from '@clerk/clerk-react';

import SystemInit from './components/systeminit/SystemInit';
import MasterLedgerInit from './components/masterledgerinit/MasterLedgerInit';
import Dashboard from './components/dashboard/Dashboard';
import PublicUpload from './components/publicupload/PublicUpload';
import { getCurrentOperator, getProfile, getComplianceItems, listVendors } from './api/client';

function AuthenticatedApp() {
  // 'checking' = still figuring out where a returning user should land -
  // this prevents a flash of SystemInit's Step 1 before we know better.
  const [view, setView] = useState('checking'); // 'checking' | 'init' | 'master' | 'dashboard'
  const [userConfig, setUserConfig] = useState(null);
  const { isLoaded, isSignedIn } = useUser();

  // Runs once per sign-in. Decides where a person actually belongs instead
  // of always starting them at Step 1 - that was creating duplicate setup
  // attempts (and, on the backend, would have created duplicate compliance
  // items before the upsert fix) every time someone simply logged back in.
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    let cancelled = false;

    (async () => {
      try {
        const itemsResp = await getComplianceItems();
        const items = itemsResp.items || [];
        console.log(`[App] bootstrap: ${items.length} existing compliance items found`);

        if (items.length > 0) {
          // Calendar already exists - go straight to it, full stop.
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
          return;
        }

        // No items yet - did they at least finish the profile (Step 1)?
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
          // No profile either (404) - genuinely a brand new operator.
          if (cancelled) return;
          console.log('[App] bootstrap: no profile found - starting fresh at Step 1');
          setView('init');
        }
      } catch (err) {
        console.error('[App] bootstrap failed:', err);
        if (!cancelled) setView('init'); // fail open to setup rather than a blank screen
      }
    })();

    return () => { cancelled = true; };
  }, [isLoaded, isSignedIn]);

  const handleSystemInitComplete = (configData) => {
    setUserConfig(configData);
    setView('master');
  };

  const handleInitializeDashboard = () => {
    setView('dashboard');
  };

  if (view === 'checking') {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading your compliance calendar…</div>;
  }

  return (
    <>
      {view === 'init' && (
        <SystemInit onComplete={handleSystemInitComplete} />
      )}

      {view === 'master' && (
        <MasterLedgerInit
          configData={userConfig}
          onInitializeDashboard={handleInitializeDashboard}
        />
      )}

      {view === 'dashboard' && (
        <Dashboard configData={userConfig} />
      )}
    </>
  );
}

function App() {
  // The upload link sent by email points at /upload/:token - this must be
  // reachable by someone with NO Clerk account at all, so it's checked and
  // rendered before the SignedIn/SignedOut gate below ever runs.
  const uploadMatch = window.location.pathname.match(/^\/upload\/([a-f0-9]+)$/i);
  if (uploadMatch) {
    return <PublicUpload token={uploadMatch[1]} />;
  }

  return (
    <div className="App">
      {/*
        SignedOut / SignedIn are Clerk's own gate components - nobody sees
        any app content until Clerk confirms a real session exists.
      */}
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

export default App;
