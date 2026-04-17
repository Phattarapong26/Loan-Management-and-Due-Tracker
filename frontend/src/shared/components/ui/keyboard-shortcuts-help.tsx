/**
 * Keyboard Shortcuts Help Component
 * 
 * Displays available keyboard shortcuts to users
 * Implements Property 44: Keyboard Navigation Support
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './dialog';
import { Button } from './button';
import { Keyboard } from 'lucide-react';

export interface KeyboardShortcut {
  key: string;
  description: string;
  category?: string;
}

export interface KeyboardShortcutsHelpProps {
  shortcuts?: KeyboardShortcut[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Default keyboard shortcuts
 */
const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  {
    key: 'Tab',
    description: 'เลื่อนไปยังช่องถัดไป',
    category: 'การนำทาง',
  },
  {
    key: 'Shift + Tab',
    description: 'เลื่อนกลับไปยังช่องก่อนหน้า',
    category: 'การนำทาง',
  },
  {
    key: 'Enter',
    description: 'ยืนยันการกระทำ',
    category: 'การนำทาง',
  },
  {
    key: 'Escape',
    description: 'ปิดหน้าต่างหรือยกเลิก',
    category: 'การนำทาง',
  },
  {
    key: 'Ctrl + S',
    description: 'บันทึกฟอร์ม',
    category: 'การจัดการข้อมูล',
  },
  {
    key: 'Ctrl + F',
    description: 'ค้นหา',
    category: 'การจัดการข้อมูล',
  },
  {
    key: '↑ / ↓',
    description: 'เลื่อนในรายการ',
    category: 'การนำทาง',
  },
  {
    key: 'Home',
    description: 'ไปยังรายการแรก',
    category: 'การนำทาง',
  },
  {
    key: 'End',
    description: 'ไปยังรายการสุดท้าย',
    category: 'การนำทาง',
  },
];

/**
 * Keyboard Shortcuts Help Dialog
 * 
 * @example
 * ```tsx
 * const [showHelp, setShowHelp] = useState(false);
 * 
 * <KeyboardShortcutsHelp
 *   open={showHelp}
 *   onOpenChange={setShowHelp}
 *   shortcuts={customShortcuts}
 * />
 * ```
 */
export function KeyboardShortcutsHelp({
  shortcuts = DEFAULT_SHORTCUTS,
  open,
  onOpenChange,
}: KeyboardShortcutsHelpProps) {
  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    const category = shortcut.category || 'อื่นๆ';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(shortcut);
    return acc;
  }, {} as Record<string, KeyboardShortcut[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            แป้นพิมพ์ลัด
          </DialogTitle>
          <DialogDescription>
            ใช้แป้นพิมพ์ลัดเหล่านี้เพื่อทำงานได้เร็วขึ้น
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                {category}
              </h3>
              <div className="space-y-2">
                {categoryShortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <kbd className="px-3 py-1.5 text-xs font-semibold text-foreground bg-muted border border-border rounded-md shadow-sm">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            💡 เคล็ดลับ: กด <kbd className="px-2 py-1 text-xs bg-muted rounded">?</kbd> ทุกที่ในระบบเพื่อดูแป้นพิมพ์ลัดที่ใช้ได้
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Keyboard Shortcuts Help Button
 * Floating button to open shortcuts help
 * 
 * @example
 * ```tsx
 * <KeyboardShortcutsHelpButton shortcuts={customShortcuts} />
 * ```
 */
export function KeyboardShortcutsHelpButton({
  shortcuts,
}: {
  shortcuts?: KeyboardShortcut[];
}) {
  const [open, setOpen] = React.useState(false);

  // Listen for ? key
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === '?' && !event.ctrlKey && !event.metaKey) {
        const target = event.target as HTMLElement;
        const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
        
        if (!isInput) {
          event.preventDefault();
          setOpen(true);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="fixed bottom-4 right-4 h-12 w-12 rounded-full shadow-lg z-50"
        onClick={() => setOpen(true)}
        aria-label="แสดงแป้นพิมพ์ลัด"
        title="แสดงแป้นพิมพ์ลัด (กด ?)"
      >
        <Keyboard className="h-5 w-5" />
      </Button>

      <KeyboardShortcutsHelp
        open={open}
        onOpenChange={setOpen}
        shortcuts={shortcuts}
      />
    </>
  );
}
