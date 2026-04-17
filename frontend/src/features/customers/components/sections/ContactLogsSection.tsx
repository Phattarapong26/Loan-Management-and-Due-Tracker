import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Calendar, User, Plus } from 'lucide-react';

// Types
type ContactLog = {
  id: string;
  date?: string;
  summary?: string;
  result?: string;
  method?: string;
  officer?: string;
  [key: string]: unknown;
};

interface ContactLogsSectionProps {
  contactLogs: ContactLog[];
  onAddContact: () => void;
  methodIcons: Record<string, React.ElementType>;
  methodLabels: Record<string, string>;
}

export function ContactLogsSection({ contactLogs, onAddContact, methodIcons, methodLabels }: ContactLogsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>ประวัติการติดต่อ</CardTitle>
            <CardDescription>บันทึกการติดต่อกับลูกค้าทั้งหมด</CardDescription>
          </div>
          <Button onClick={onAddContact}>
            <Plus className="h-4 w-4 mr-2" />
            บันทึกใหม่
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {contactLogs.map((log) => {
            const MethodIcon = methodIcons[log.method || ''] || User;
            return (
              <div key={log.id} className="flex gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="p-2 bg-primary/10 rounded-xl h-fit">
                  <MethodIcon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge variant="outline">{methodLabels[log.method || ''] || 'ไม่ระบุ'}</Badge>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {log.date}
                    </span>
                  </div>
                  <p className="font-medium">{log.summary}</p>
                  <p className="text-sm text-muted-foreground mt-1">{log.result}</p>
                  <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {log.officer}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
