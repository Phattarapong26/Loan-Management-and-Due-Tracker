import { Input } from '@/shared/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  Search,
  Filter,
  FileText,
  Wallet,
  CheckCircle2,
} from 'lucide-react';

interface PaymentTableFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  loanStatusFilter: string;
  onLoanStatusChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
}

export function PaymentTableFilters({
  searchTerm,
  onSearchChange,
  loanStatusFilter,
  onLoanStatusChange,
  statusFilter,
  onStatusChange,
}: PaymentTableFiltersProps) {
  return (
    <div className="flex flex-col gap-3 w-full md:w-auto md:flex-row md:items-center md:gap-4">
      <div className="relative w-full md:w-64">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="ค้นหาลูกค้า, เลขที่สัญญา..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 w-full"
        />
      </div>
      <Select value={loanStatusFilter} onValueChange={onLoanStatusChange}>
        <SelectTrigger className="w-full md:w-[180px] bg-primary text-white border-primary hover:bg-primary/90">
          <FileText className="h-4 w-4 mr-2" />
          <SelectValue placeholder="ประเภทสัญญา" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="active">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              <span>มีหนี้คงค้าง</span>
            </div>
          </SelectItem>
          <SelectItem value="closed">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <span>ปิดยอดแล้ว</span>
            </div>
          </SelectItem>
          <SelectItem value="all">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>ทั้งหมด</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
      {loanStatusFilter === 'active' && (
        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger className="w-full md:w-[180px] bg-primary text-white border-primary hover:bg-primary/90">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="สถานะทั้งหมด" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">สถานะทั้งหมด</SelectItem>
            <SelectItem value="active">ปกติ</SelectItem>
            <SelectItem value="overdue">เกินกำหนด</SelectItem>
            <SelectItem value="npl">NPL</SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
