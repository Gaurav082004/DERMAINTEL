import { useTheme } from '../../context/ThemeContext';
import { IconSun, IconMoon } from './icons';
import './ThemeToggle.css';

/**
 * ThemeToggle
 * A small Sun/Moon switch used in the Navbar to flip the global
 * dark/light theme. Shows the icon for the theme you'd switch to,
 * which is the common convention (moon while in light mode = "go
 * dark", sun while in dark mode = "go light").
 */
export default function ThemeToggle({ className = '' }) {
  const { isDark, toggleTheme } = useTheme();
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <button
      type="button"
      className={['theme-toggle', className].filter(Boolean).join(' ')}
      onClick={toggleTheme}
      aria-label={label}
      title={label}
    >
      <span className="theme-toggle__icon" aria-hidden="true">
        {isDark ? <IconSun /> : <IconMoon />}
      </span>
    </button>
  );
}
