import React, { useState, useEffect } from 'react';

interface TextScrambleRevealProps {
  text: string;
  durationMs?: number;
  className?: string;
  as?: 'span' | 'div' | 'h1' | 'h2' | 'h3';
}

const CYBER_CHARS = '0123456789ABCDEF!@#$%&*';

export const TextScrambleReveal: React.FC<TextScrambleRevealProps> = ({
  text,
  durationMs = 600,
  className = '',
  as = 'span',
}) => {
  const isTestEnv = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
  const [displayText, setDisplayText] = useState(isTestEnv ? text : '');

  useEffect(() => {
    if (isTestEnv) {
      setDisplayText(text);
      return;
    }

    // Respect reduced motion
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayText(text);
      return;
    }

    let frame = 0;
    const totalFrames = Math.max(12, Math.floor(durationMs / 30));
    let timer: number;

    const tick = () => {
      frame++;
      const progress = frame / totalFrames;
      const revealCount = Math.floor(progress * text.length);

      let scrambled = '';
      for (let i = 0; i < text.length; i++) {
        if (i < revealCount) {
          scrambled += text[i];
        } else if (text[i] === ' ' || text[i] === '/' || text[i] === '#') {
          scrambled += text[i];
        } else {
          scrambled += CYBER_CHARS[Math.floor(Math.random() * CYBER_CHARS.length)];
        }
      }

      setDisplayText(scrambled);

      if (frame < totalFrames) {
        timer = window.setTimeout(tick, 30);
      } else {
        setDisplayText(text);
      }
    };

    tick();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [text, durationMs, isTestEnv]);

  const Component = as;

  return (
    <Component className={className} aria-label={text}>
      {displayText || text}
    </Component>
  );
};
