import { useState } from 'react';
import WrestlerSelect from './components/WrestlerSelect.jsx';
import MatchScreen from './components/MatchScreen.jsx';

function App() {
  const [screen, setScreen] = useState('select');
  const [matchSetup, setMatchSetup] = useState(null);

  function handleStartMatch(setup) {
    setMatchSetup(setup);
    setScreen('match');
  }

  function handleReturnToSelect() {
    setScreen('select');
    setMatchSetup(null);
  }

  if (screen === 'match' && matchSetup) {
    return (
      <MatchScreen
        player1={matchSetup.player1}
        player2={matchSetup.player2}
        p2IsCPU={matchSetup.p2IsCPU}
        onReturn={handleReturnToSelect}
      />
    );
  }

  return <WrestlerSelect onStartMatch={handleStartMatch} />;
}

export default App;
