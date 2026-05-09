/**
 * Performance Optimization Utilities
 * Tools for improving application performance
 */

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

// ============================================================================
// DEBOUNCE & THROTTLE
// ============================================================================

/**
 * Debounce function - delays execution until after wait time has elapsed
 * Use for: Search inputs, resize handlers, scroll handlers
 */
export function debounce<T extends (...args: never[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function - limits execution to once per wait time
 * Use for: Scroll handlers, mouse move handlers
 */
export function throttle<T extends (...args: never[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), wait);
    }
  };
}

// ============================================================================
// REACT HOOKS FOR PERFORMANCE
// ============================================================================

/**
 * useDebounce hook - debounces a value
 * Use for: Search inputs, form fields
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * useThrottle hook - throttles a value
 * Use for: Scroll position, mouse position
 */
export function useThrottle<T>(value: T, interval: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastExecuted = useRef(Date.now());

  useEffect(() => {
    if (Date.now() >= lastExecuted.current + interval) {
      lastExecuted.current = Date.now();
      setThrottledValue(value);
    } else {
      const timerId = setTimeout(() => {
        lastExecuted.current = Date.now();
        setThrottledValue(value);
      }, interval);

      return () => clearTimeout(timerId);
    }
  }, [value, interval]);

  return throttledValue;
}

/**
 * useIntersectionObserver - lazy load components when visible
 * Use for: Images, heavy components, infinite scroll
 */
export function useIntersectionObserver(
  ref: React.RefObject<Element>,
  options?: IntersectionObserverInit
): boolean {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [ref, options]);

  return isIntersecting;
}

/**
 * useMemoCompare - only recompute when value actually changes (deep comparison)
 * Use for: Complex objects, arrays
 */
export function useMemoCompare<T>(
  value: T,
  compare: (prev: T | undefined, next: T) => boolean
): T {
  // Store memoized value in state so we never access refs during render
  const [memoized, setMemoized] = useState<T>(value);
  const prevRef = useRef<T | undefined>(undefined);

  // Update in a layout effect so it runs synchronously after paint but not during render
  useLayoutEffect(() => {
    if (prevRef.current === undefined || !compare(prevRef.current, value)) {
      prevRef.current = value;
      setMemoized(value);
    }
  });

  return memoized;
}

// ============================================================================
// LAZY LOADING
// ============================================================================

/**
 * Lazy load component with loading fallback
 * Use for: Heavy components, route components
 */
export function lazyLoad<T extends React.ComponentType<Record<string, unknown>>>(
  importFunc: () => Promise<{ default: T }>,
  fallback: React.ReactNode = null
): React.ComponentType<React.ComponentProps<T>> {
  const LazyComponent = React.lazy(importFunc);

  function LazyWrapper(props: React.ComponentProps<T>) {
    return React.createElement(React.Suspense, { fallback },
      React.createElement(LazyComponent, props as any)
    );
  }
  LazyWrapper.displayName = `LazyWrapper(${(LazyComponent as unknown as { displayName?: string }).displayName ?? 'Component'})`;

  return LazyWrapper;
}

// ============================================================================
// MEMOIZATION HELPERS
// ============================================================================

/**
 * Shallow compare for React.memo
 * Use for: Component memoization
 */
export function shallowEqual(obj1: Record<string, unknown> | null, obj2: Record<string, unknown> | null): boolean {
  if (obj1 === obj2) return true;

  if (
    typeof obj1 !== 'object' ||
    obj1 === null ||
    typeof obj2 !== 'object' ||
    obj2 === null
  ) {
    return false;
  }

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (obj1[key] !== obj2[key]) return false;
  }

  return true;
}

// ============================================================================
// IMAGE OPTIMIZATION
// ============================================================================

/**
 * Get optimized image URL with Next.js Image Optimization
 */
export function getOptimizedImageUrl(
  src: string,
  width: number,
  quality: number = 75
): string {
  if (src.startsWith('http')) {
    return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality}`;
  }
  return src;
}

/**
 * Preload critical images
 */
export function preloadImage(src: string): void {
  if (typeof window === 'undefined') return;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = src;
  document.head.appendChild(link);
}

// ============================================================================
// VIRTUAL SCROLLING HELPER
// ============================================================================

/**
 * Calculate visible items for virtual scrolling
 * Use for: Large lists, tables
 */
export function calculateVisibleRange(
  scrollTop: number,
  containerHeight: number,
  itemHeight: number,
  totalItems: number,
  overscan: number = 3
): { start: number; end: number } {
  const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const end = Math.min(totalItems, start + visibleCount + overscan * 2);

  return { start, end };
}

// ============================================================================
// REQUEST OPTIMIZATION
// ============================================================================

/**
 * Batch multiple requests into one
 * Use for: Multiple API calls
 */
export class RequestBatcher<T, R> {
  private queue: Array<{
    key: T;
    resolve: (value: R) => void;
    reject: (error: Error) => void;
  }> = [];
  private timeout: NodeJS.Timeout | null = null;
  private batchFn: (keys: T[]) => Promise<R[]>;
  private delay: number;

  constructor(batchFn: (keys: T[]) => Promise<R[]>, delay: number = 10) {
    this.batchFn = batchFn;
    this.delay = delay;
  }

  async request(key: T): Promise<R> {
    return new Promise((resolve, reject) => {
      this.queue.push({ key, resolve, reject });

      if (this.timeout) clearTimeout(this.timeout);

      this.timeout = setTimeout(() => {
        void this.flush();
      }, this.delay);
    });
  }

  private async flush() {
    const queue = this.queue;
    this.queue = [];
    this.timeout = null;

    try {
      const keys = queue.map((item) => item.key);
      const results = await this.batchFn(keys);

      queue.forEach((item, index) => {
        item.resolve(results[index]);
      });
    } catch (error) {
      queue.forEach((item) => {
        item.reject(error instanceof Error ? error : new Error(String(error)));
      });
    }
  }
}

// ============================================================================
// CACHE UTILITIES
// ============================================================================

/**
 * Simple in-memory cache with TTL
 * Use for: API responses, computed values
 */
export class Cache<T> {
  private cache = new Map<string, { value: T; expiry: number }>();

  set(key: string, value: T, ttl: number = 60000): void {
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttl,
    });
  }

  get(key: string): T | null {
    const item = this.cache.get(key);

    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  clear(): void {
    this.cache.clear();
  }

  delete(key: string): void {
    this.cache.delete(key);
  }
}

// ============================================================================
// WEB VITALS TRACKING
// ============================================================================

declare global {
  interface Window {
    gtag?: (command: string, action: string, params: Record<string, unknown>) => void;
  }
}

/**
 * Track Core Web Vitals
 * Use for: Performance monitoring
 */
export function trackWebVitals(metric: {
  id: string;
  name: string;
  value: number;
  label: 'web-vital' | 'custom';
}): void {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Web Vital]', metric.name, metric.value);
  }

  // Send to analytics in production
  if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
    // Send to your analytics service
    // Example: Google Analytics, Vercel Analytics, etc.
    if (window.gtag) {
      window.gtag('event', metric.name, {
        value: Math.round(metric.value),
        event_label: metric.id,
        non_interaction: true,
      });
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const performanceUtils = {
  debounce,
  throttle,
  useDebounce,
  useThrottle,
  useIntersectionObserver,
  useMemoCompare,
  lazyLoad,
  shallowEqual,
  getOptimizedImageUrl,
  preloadImage,
  calculateVisibleRange,
  RequestBatcher,
  Cache,
  trackWebVitals,
};

export default performanceUtils;
