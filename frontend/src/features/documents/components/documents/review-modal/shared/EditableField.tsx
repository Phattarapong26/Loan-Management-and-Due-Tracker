/**
 * Editable Field Component
 */

import { useState } from "react";
import { Pencil, Save, X } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { formatCurrency } from "../../../../utils/parsers/excel-parser";

interface EditableFieldProps {
  label: string;
  value: string | number;
  onSave: (val: string | number) => void;
  type?: string;
}

export function EditableField({ label, value, onSave, type = 'text' }: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [tempVal, setTempVal] = useState(String(value || ''));

  const displayText = () => {
    if (!value && value !== 0) return '-';
    if (type === 'number' && typeof value === 'number') {
      return formatCurrency(value);
    }
    return String(value);
  };

  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground font-medium">{label}</label>
      {editing ? (
        <div className="flex items-center gap-2">
          <Input
            value={tempVal}
            onChange={(e) => setTempVal(e.target.value)}
            className="h-8 text-sm"
            autoFocus
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              onSave(type === 'number' ? parseFloat(tempVal) || 0 : tempVal);
              setEditing(false);
            }}
          >
            <Save className="w-3 h-3" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
            <X className="w-3 h-3" />
          </Button>
        </div>
      ) : (
        <div
          className="flex items-center gap-2 group cursor-pointer"
          onClick={() => { setTempVal(String(value || '')); setEditing(true); }}
        >
          <span className="text-sm font-medium text-foreground">
            {displayText()}
          </span>
          <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}
    </div>
  );
}
