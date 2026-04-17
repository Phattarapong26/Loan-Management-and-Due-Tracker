/**
 * Keyboard Navigation Hook
 * 
 * Provides keyboard navigation support for the application
 * 
 * Features:
 * - Tab navigation in logical order
 * - Enter triggers button actions
 * - Escape closes dialogs
 * - Ctrl+S saves forms
 * - Ctrl+F focuses search
 * - Implements Property 44: Keyboard Navigation Support
 * 
 * @module useKeyboardNavigation
 */

import { useEffect, useCallback, RefObject } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  action: () => void;
  description: string;
  preventDefault?: boolean;
}

export interface UseKeyboardNavigationOptions {
  shortcuts?: KeyboardShortcut[];
  enableDefaultShortcuts?: boolean;
  onEscape?: () => void;
  onEnter?: () => void;
  searchInputRef?: RefObject<HTMLInputElement>;
  formRef?: RefObject<HTMLFormElement>;
}

/**
 * Hook for keyboard navigation and shortcuts
 * 
 * @param options - Configuration options
 * 
 * @example
 * ```tsx
 * const searchRef = useRef<HTMLInputElement>(null);
 * const formRef = useRef<HTMLFormElement>(null);
 * 
 * useKeyboardNavigation({
 *   searchInputRef: searchRef,
 *   formRef: formRef,
 *   onEscape: () => closeDialog(),
 *   shortcuts: [
 *     {
 *       key: 'n',
 *       ctrl: true,
 *       action: () => createNew(),
 *       description: 'สร้างรายการใหม่',
 *     },
 *   ],
 * });
 * ```
 */
export function useKeyboardNavigation(options: UseKeyboardNavigationOptions = {}) {
  const {
    shortcuts = [],
    enableDefaultShortcuts = true,
    onEscape,
    onEnter,
    searchInputRef,
    formRef,
  } = options;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      const isContentEditable = target.isContentEditable;

      // Handle Escape key
      if (event.key === 'Escape' && onEscape) {
        event.preventDefault();
        onEscape();
        return;
      }

      // Handle Enter key (only if not in textarea)
      if (
        event.key === 'Enter' &&
        onEnter &&
        !isContentEditable &&
        target.tagName !== 'TEXTAREA'
      ) {
        // Don't prevent default if in input (allow form submission)
        if (!isInput) {
          event.preventDefault();
        }
        onEnter();
        return;
      }

      // Handle Ctrl+S (Save)
      if (
        enableDefaultShortcuts &&
        event.key === 's' &&
        (event.ctrlKey || event.metaKey) &&
        formRef?.current
      ) {
        event.preventDefault();
        
        // Trigger form submission
        const submitButton = formRef.current.querySelector<HTMLButtonElement>(
          'button[type="submit"]'
        );
        if (submitButton) {
          submitButton.click();
        }
        return;
      }

      // Handle Ctrl+F (Focus search)
      if (
        enableDefaultShortcuts &&
        event.key === 'f' &&
        (event.ctrlKey || event.metaKey) &&
        searchInputRef?.current
      ) {
        event.preventDefault();
        searchInputRef.current.focus();
        searchInputRef.current.select();
        return;
      }

      // Handle custom shortcuts
      for (const shortcut of shortcuts) {
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;

        if (
          event.key.toLowerCase() === shortcut.key.toLowerCase() &&
          ctrlMatch &&
          shiftMatch &&
          altMatch
        ) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }
          shortcut.action();
          return;
        }
      }
    },
    [shortcuts, enableDefaultShortcuts, onEscape, onEnter, searchInputRef, formRef]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return {
    shortcuts: [
      ...(enableDefaultShortcuts
        ? [
            {
              key: 'Escape',
              description: 'ปิดหน้าต่าง',
              action: onEscape || (() => {}),
            },
            {
              key: 'Enter',
              description: 'ยืนยัน',
              action: onEnter || (() => {}),
            },
            {
              key: 'Ctrl+S',
              description: 'บันทึก',
              action: () => {},
            },
            {
              key: 'Ctrl+F',
              description: 'ค้นหา',
              action: () => {},
            },
          ]
        : []),
      ...shortcuts.map(s => ({
        key: `${s.ctrl ? 'Ctrl+' : ''}${s.shift ? 'Shift+' : ''}${s.alt ? 'Alt+' : ''}${s.key.toUpperCase()}`,
        description: s.description,
        action: s.action,
      })),
    ],
  };
}

/**
 * Hook for managing focus trap in modals/dialogs
 * Keeps focus within the dialog when Tab is pressed
 * 
 * @param containerRef - Reference to the dialog container
 * @param isOpen - Whether the dialog is open
 * 
 * @example
 * ```tsx
 * const dialogRef = useRef<HTMLDivElement>(null);
 * useFocusTrap(dialogRef, isOpen);
 * ```
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement>,
  isOpen: boolean
) {
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element when dialog opens
    firstElement?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      if (event.shiftKey) {
        // Shift+Tab: move focus backwards
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab: move focus forwards
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [containerRef, isOpen]);
}

/**
 * Hook for arrow key navigation in lists
 * 
 * @param itemCount - Number of items in the list
 * @param onSelect - Callback when item is selected (Enter key)
 * @returns Current focused index and setter
 * 
 * @example
 * ```tsx
 * const [focusedIndex, setFocusedIndex] = useArrowKeyNavigation(
 *   items.length,
 *   (index) => selectItem(items[index])
 * );
 * ```
 */
export function useArrowKeyNavigation(
  itemCount: number,
  onSelect?: (index: number) => void
) {
  const [focusedIndex, setFocusedIndex] = React.useState(0);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setFocusedIndex(prev => Math.min(prev + 1, itemCount - 1));
          break;
        case 'ArrowUp':
          event.preventDefault();
          setFocusedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Home':
          event.preventDefault();
          setFocusedIndex(0);
          break;
        case 'End':
          event.preventDefault();
          setFocusedIndex(itemCount - 1);
          break;
        case 'Enter':
          if (onSelect) {
            event.preventDefault();
            onSelect(focusedIndex);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [focusedIndex, itemCount, onSelect]);

  return [focusedIndex, setFocusedIndex] as const;
}

// Need to import React for useState
import * as React from 'react';
