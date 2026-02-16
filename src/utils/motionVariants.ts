/**
 * Shared Framer Motion animation variants used across the app.
 * Centralizes animation definitions for consistency and easy tuning.
 */
import type { Variants } from 'framer-motion';

/** Fade in/out overlay (dialogs, screens) */
export const overlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

/** Scale + fade for dialog cards / panels */
export const dialogVariants: Variants = {
  hidden: { scale: 0.9, opacity: 0 },
  visible: { scale: 1, opacity: 1 },
  exit: { scale: 0.9, opacity: 0 },
};

/** Dropdown menu entrance (settings, popovers) */
export const dropdownVariants: Variants = {
  hidden: { opacity: 0, y: -10, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -10, scale: 0.95 },
};

/** Spring config for dialog entrance */
export const dialogSpring = { type: 'spring' as const, stiffness: 300, damping: 25 };
