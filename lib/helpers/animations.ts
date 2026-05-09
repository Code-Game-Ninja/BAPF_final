import type { Transition } from "framer-motion";

/**
 * Framer Motion animation variants used across the app.
 */

export const pageTransition = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] } as Transition,
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 } as Transition,
};

export const slideInFromLeft = {
  initial: { x: -300, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: -300, opacity: 0 },
  transition: { duration: 0.3, ease: [0, 0, 0.2, 1] } as Transition,
};

export const slideInFromRight = {
  initial: { x: 300, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: 300, opacity: 0 },
  transition: { duration: 0.3, ease: [0, 0, 0.2, 1] } as Transition,
};

export const scaleIn = {
  initial: { scale: 0.9, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.9, opacity: 0 },
  transition: { duration: 0.2 } as Transition,
};

export const staggerContainer = {
  initial: {},
  hidden: {},
  animate: {
    transition: {
      delayChildren: 0.04,
      staggerChildren: 0.06,
    },
  },
  visible: {
    transition: {
      delayChildren: 0.04,
      staggerChildren: 0.06,
    },
  },
};

export const staggerItem = {
  initial: { opacity: 0, y: 14 },
  hidden: { opacity: 0, y: 14 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.34, ease: [0.22, 1, 0.36, 1] } as Transition,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.34, ease: [0.22, 1, 0.36, 1] } as Transition,
  },
};

export const hoverLift = {
  whileHover: { y: -2, transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] } as Transition },
  whileTap: { scale: 0.995, transition: { duration: 0.12 } as Transition },
};
