import React, { useState } from 'react';
import './App.css';
import { SignedIn, SignedOut, SignIn, UserButton } from '@clerk/clerk-react';

import SystemInit from './components/systeminit/SystemInit';
import MasterLedgerInit from './components/masterledgerinit/MasterLedgerInit';
import Dashboard from './components/dashboard/Dashboard';

function App() {
  const [view, setView] = useState('init'); // 'init' | 'master' | 'dashboard'
  const [userConfig, setUserConfig] = useState(null);

  const handleSystemInitComplete = (configData) => {
    setUserConfig(configData);
    setView('master'); // Show Master Ledger screen
  };

  const handleInitializeDashboard = () => {
    setView('dashboard'); // Go to main dashboard
  };

  return (
    <div className="App">
      {/*
        SignedOut / SignedIn are Clerk's own gate components - they render
        nothing at all on the "wrong" side, so there's no manual auth-state
        checking needed here. Nobody sees SystemInit, MasterLedgerInit, or
        Dashboard until Clerk confirms a real session exists.
      */}
      <SignedOut>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          {/* Clerk's <SignIn/> includes a "Sign up" link by default (routing="virtual"
              handles both flows in one component - no separate SignUp page needed
              unless you want a dedicated URL for it). */}
          <SignIn routing="virtual" />
        </div>
      </SignedOut>

      <SignedIn>
        <div style={{ position: 'fixed', top: 12, right: 16, zIndex: 1000 }}>
          <UserButton afterSignOutUrl="/" />
        </div>

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
      </SignedIn>
    </div>
  );
}

export default App;
