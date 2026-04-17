/**
 * Recommendation Section Component
 */

import { useState } from "react";
import { FileText, Save } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { ParsedBusinessProfile } from "../../../../utils/parsers/excel-parser";
import { SectionTitle } from '../shared';
import { displayValue } from '../utils';

interface RecommendationSectionProps {
  data: ParsedBusinessProfile['recommendation'];
  onChange: (val: string) => void;
}

export function RecommendationSection({ data, onChange }: RecommendationSectionProps) {
  const [editing, setEditing] = useState(false);
  const [tempVal, setTempVal] = useState(data || '');

  return (
    <div>
      <SectionTitle icon={FileText} title="ความเห็น" />
      {editing ? (
        <div className="space-y-2">
          <Textarea
            value={tempVal}
            onChange={(e) => setTempVal(e.target.value)}
            className="min-h-[200px]"
            autoFocus
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => {
                onChange(tempVal);
                setEditing(false);
              }}
            >
              <Save className="w-3 h-3 mr-1" />
              บันทึก
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              ยกเลิก
            </Button>
          </div>
        </div>
      ) : (
        <div
          className="p-4 bg-muted/20 rounded-lg cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => { setTempVal(data || ''); setEditing(true); }}
        >
          <p className="text-sm whitespace-pre-wrap">{displayValue(data)}</p>
        </div>
      )}
    </div>
  );
}
