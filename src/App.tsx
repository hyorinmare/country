import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import FreeMode from './modes/FreeMode';
import Home from './pages/Home';
import ModeScreen from './pages/ModeScreen';
import Stats from './pages/Stats';
import { load, save } from './lib/storage';
import { go, useHashRoute } from './lib/useHashRoute';
import type { QuizMode } from './types';

const QUIZ_MODES: QuizMode[] = ['map', 'flag', 'capital', 'shape'];

function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => load('theme', 'dark'));
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
    save('theme', theme);
  }, [theme]);
  return [theme, () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))] as const;
}

export default function App() {
  const route = useHashRoute();
  const [theme, toggleTheme] = useTheme();

  let page;
  const playMatch = route.match(/^\/play\/(\w+)/);
  if (playMatch && QUIZ_MODES.includes(playMatch[1] as QuizMode)) page = <ModeScreen mode={playMatch[1] as QuizMode} />;
  else if (route === '/free') page = <FreeMode />;
  else if (route === '/stats') page = <Stats />;
  else page = <Home />;

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center px-4 pt-4">
        <button onClick={() => go('/')} className="flex items-center gap-2 font-display text-lg font-bold">
          <span className="grid h-8 w-8 place-items-center rounded-xl btn-primary text-base">🌍</span>
          Globetrotter
        </button>
        <nav className="ml-auto flex items-center gap-2">
          <button onClick={() => go('/stats')} className="hidden rounded-full px-3 py-1.5 text-sm font-medium text-muted hover:text-text sm:block">
            Progress
          </button>
          <button
            onClick={toggleTheme}
            className="glass grid h-9 w-9 place-items-center rounded-full text-base"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </nav>
      </header>
      <AnimatePresence mode="wait">
        <motion.main key={route} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
          {page}
        </motion.main>
      </AnimatePresence>
    </div>
  );
}
