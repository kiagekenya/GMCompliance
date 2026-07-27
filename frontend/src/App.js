import React, { useState } from 'react';
import './App.css';

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
    </div>
  );
}

export default App;