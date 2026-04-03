import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import wrestlersData from '../data/wrestlers.json';
import { createMatchScene } from '../scenes/MatchScene.js';

const wrestlerMap = Object.fromEntries(
  wrestlersData.wrestlers.map(w => [w.id, w]),
);

/**
 * Mounts a Phaser game instance into a div and tears it down cleanly on
 * unmount. Receives wrestler IDs and looks up full data objects internally.
 *
 * @param {{ player1: string, player2: string, p2IsCPU: boolean, onReturn: function }} props
 */
export default function MatchScreen({ player1, player2, p2IsCPU, onReturn }) {
  const containerRef = useRef(null);
  const p1Data = wrestlerMap[player1];
  const p2Data = wrestlerMap[player2];

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !p1Data || !p2Data) return;

    const MatchSceneClass = createMatchScene(p1Data, p2Data);

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: container,
      scene: [MatchSceneClass],
      backgroundColor: '#0d0d1a',
      audio: { noAudio: true },
    });

    return () => {
      game.destroy(true);
    };
  }, [player1, player2]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{
      minHeight: '100vh',
      background: '#08080f',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      fontFamily: '"Courier New", Courier, monospace',
      padding: 20,
      boxSizing: 'border-box',
    }}>
      {/* Match header — wrestler names */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0 }}>
        <span style={{ color: '#00aaff', fontSize: 13, fontWeight: 'bold', letterSpacing: 2 }}>
          {p1Data?.name ?? player1}
        </span>
        <span style={{ color: '#ffd700', fontSize: 11, letterSpacing: 2 }}>VS</span>
        <span style={{ color: '#ff4444', fontSize: 13, fontWeight: 'bold', letterSpacing: 2 }}>
          {p2Data?.name ?? player2}
          {p2IsCPU && <span style={{ color: '#884444', fontSize: 9, marginLeft: 6 }}>(CPU)</span>}
        </span>
      </div>

      {/* Phaser canvas container */}
      <div
        ref={containerRef}
        style={{
          border: '2px solid #2a2a40',
          lineHeight: 0,
          flexShrink: 0,
        }}
      />

      {/* Return button */}
      <button
        onClick={onReturn}
        style={{
          padding: '8px 28px',
          fontSize: 10,
          letterSpacing: 3,
          fontFamily: '"Courier New", Courier, monospace',
          background: 'transparent',
          color: '#50506a',
          border: '1px solid #22223a',
          cursor: 'pointer',
          flexShrink: 0,
          transition: 'color 0.15s, border-color 0.15s',
        }}
        onMouseEnter={e => { e.target.style.color = '#9090b0'; e.target.style.borderColor = '#44445a'; }}
        onMouseLeave={e => { e.target.style.color = '#50506a'; e.target.style.borderColor = '#22223a'; }}
      >
        ◀ RETURN TO SELECT
      </button>
    </div>
  );
}
