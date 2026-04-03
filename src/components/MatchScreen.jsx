import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import wrestlersData from '../data/wrestlers.json';
import { createMatchScene } from '../scenes/MatchScene.js';
import { useMatch }          from '../hooks/useMatch.js';
import MatchUI               from './MatchUI.jsx';

const wrestlerMap = Object.fromEntries(
  wrestlersData.wrestlers.map(w => [w.id, w]),
);

/**
 * MatchScreen
 *
 * Mounts the Phaser canvas and the React UI overlay side-by-side in a
 * position:relative wrapper so MatchUI can be absolutely positioned over
 * the canvas at exactly the same 800×600 footprint.
 */
export default function MatchScreen({ player1, player2, p2IsCPU, onReturn }) {
  const containerRef = useRef(null);
  const p1Data = wrestlerMap[player1];
  const p2Data = wrestlerMap[player2];

  // ── Engine + state hook ──────────────────────────────────────────────────
  const match = useMatch({ p1: p1Data, p2: p2Data, p2IsCPU });

  // ── Phaser lifecycle ─────────────────────────────────────────────────────
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

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh',
      background: '#08080f',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      boxSizing: 'border-box',
    }}>
      {/*
        Wrapper is exactly 800×600 so MatchUI (position:absolute, same size)
        aligns pixel-perfect with the Phaser canvas beneath it.
      */}
      <div style={{ position: 'relative', width: 800, height: 600, flexShrink: 0 }}>
        {/* Phaser canvas mounts here */}
        <div ref={containerRef} style={{ position: 'absolute', top: 0, left: 0, lineHeight: 0 }} />

        {/* React UI overlay */}
        {p1Data && p2Data && (
          <MatchUI
            p1={p1Data}
            p2={p2Data}
            p2IsCPU={p2IsCPU}
            match={match}
            onReturn={onReturn}
          />
        )}
      </div>
    </div>
  );
}
