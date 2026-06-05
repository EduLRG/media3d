'use client';

import { useState, useEffect } from 'react';

export default function TypewriterText({
  texto = '',
  frases = [],
  velocidade = 40,
  velocidadeApagar = 20,
  pausaEntreFrases = 2500,
  modo = 'once',
  className = '',
  highlight = null, // { from: number, className: string }
}) {
  const [displayed, setDisplayed] = useState('');
  const [cursorBlink, setCursorBlink] = useState(true);
  const [cursorShown, setCursorShown] = useState(true);

  // Cursor blink
  useEffect(() => {
    if (!cursorShown) return;
    const id = setInterval(() => setCursorBlink(v => !v), 530);
    return () => clearInterval(id);
  }, [cursorShown]);

  // Once mode: type once, blink cursor for 3s then hide
  useEffect(() => {
    if (modo !== 'once') return;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(texto.slice(0, i));
      if (i >= texto.length) {
        clearInterval(id);
        setTimeout(() => setCursorShown(false), 3000);
      }
    }, velocidade);
    return () => clearInterval(id);
  }, [texto, velocidade, modo]);

  // Loop mode: cycle through phrases indefinitely
  useEffect(() => {
    if (modo !== 'loop' || frases.length === 0) return;
    let phraseIdx = 0;
    let charIdx = 0;
    let deleting = false;
    let tid;

    const tick = () => {
      const phrase = frases[phraseIdx];
      if (!deleting) {
        charIdx++;
        setDisplayed(phrase.slice(0, charIdx));
        if (charIdx >= phrase.length) {
          deleting = true;
          tid = setTimeout(tick, pausaEntreFrases);
        } else {
          tid = setTimeout(tick, velocidade);
        }
      } else {
        charIdx--;
        setDisplayed(phrase.slice(0, charIdx));
        if (charIdx <= 0) {
          deleting = false;
          phraseIdx = (phraseIdx + 1) % frases.length;
          tid = setTimeout(tick, velocidade);
        } else {
          tid = setTimeout(tick, velocidadeApagar);
        }
      }
    };

    tid = setTimeout(tick, velocidade);
    return () => clearTimeout(tid);
  }, [frases, velocidade, velocidadeApagar, pausaEntreFrases, modo]);

  const renderText = () => {
    if (!highlight || displayed.length <= highlight.from) {
      return <>{displayed}</>;
    }
    return (
      <>
        {displayed.slice(0, highlight.from)}
        <span className={highlight.className}>{displayed.slice(highlight.from)}</span>
      </>
    );
  };

  return (
    <span className={className}>
      {renderText()}
      {cursorShown && (
        <span
          className="font-thin"
          style={{ opacity: cursorBlink ? 1 : 0, transition: 'opacity 0.1s' }}
        >
          |
        </span>
      )}
    </span>
  );
}
