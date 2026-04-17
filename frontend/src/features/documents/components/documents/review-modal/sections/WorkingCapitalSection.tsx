import { Wallet, Plus, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { ParsedBusinessProfile } from "../../../../utils/parsers/excel-parser";
import { SectionTitle } from '../shared';

interface WorkingCapitalSectionProps {
  data: ParsedBusinessProfile['workingCapital'];
  onUpdate: (newData: ParsedBusinessProfile['workingCapital']) => void;
}

export function WorkingCapitalSection({ data, onUpdate }: WorkingCapitalSectionProps) {
  const safeData = data || { 
    accountsReceivable: 0, 
    inventory: 0, 
    accountsPayable: 0, 
    totalNeeded: 0, 
    existingCredit: 0, 
    newCredit: 0, 
    remaining: 0,
    assets: [],
    liabilities: []
  };

  const calculateTotals = (currentData: typeof safeData) => {
    const totalAssets = (currentData.accountsReceivable || 0) + 
                       (currentData.inventory || 0) + 
                       (currentData.assets || []).reduce((sum, a) => sum + (a.amount || 0), 0);
    
    const totalLiabilities = (currentData.accountsPayable || 0) + 
                            (currentData.liabilities || []).reduce((sum, l) => sum + (l.amount || 0), 0);
    
    const totalNeeded = Math.max(0, totalAssets - totalLiabilities);
    const existing = currentData.existingCredit || 0;
    const newCred = currentData.newCredit || 0;
    const remaining = (existing + newCred) - totalNeeded;
    
    return { ...currentData, totalNeeded, remaining };
  };

  const updateField = (field: string, value: unknown) => {
    const newData = { ...safeData, [field]: value };
    
    if (field === 'totalNeeded' || field === 'existingCredit' || field === 'newCredit') {
      const tn = field === 'totalNeeded' ? (value as number) : (newData.totalNeeded || 0);
      const ex = field === 'existingCredit' ? (value as number) : (newData.existingCredit || 0);
      const nc = field === 'newCredit' ? (value as number) : (newData.newCredit || 0);
      const remaining = (ex + nc) - tn;
      onUpdate({ ...newData, remaining });
    } else if (field === 'remaining') {
      onUpdate(newData);
    } else {
      onUpdate(calculateTotals(newData));
    }
  };

  const assets = safeData.assets || [];
  const liabilities = safeData.liabilities || [];

  const addAsset = () => {
    const newData = { ...safeData, assets: [...assets, { label: 'รายการเพิ่ม', amount: 0 }] };
    onUpdate(calculateTotals(newData));
  };

  const updateAsset = (index: number, field: 'label' | 'amount', value: string | number) => {
    const newAssets = [...assets];
    newAssets[index] = { ...newAssets[index], [field]: value };
    const newData = { ...safeData, assets: newAssets };
    onUpdate(calculateTotals(newData));
  };

  const removeAsset = (index: number) => {
    const newData = { ...safeData, assets: assets.filter((_, i) => i !== index) };
    onUpdate(calculateTotals(newData));
  };

  const addLiability = () => {
    const newData = { ...safeData, liabilities: [...liabilities, { label: 'รายการเพิ่ม', amount: 0 }] };
    onUpdate(calculateTotals(newData));
  };

  const updateLiability = (index: number, field: 'label' | 'amount', value: string | number) => {
    const newLiabilities = [...liabilities];
    newLiabilities[index] = { ...newLiabilities[index], [field]: value };
    const newData = { ...safeData, liabilities: newLiabilities };
    onUpdate(calculateTotals(newData));
  };

  const removeLiability = (index: number) => {
    const newData = { ...safeData, liabilities: liabilities.filter((_, i) => i !== index) };
    onUpdate(calculateTotals(newData));
  };

  return (
    <div className="space-y-8 bg-white">
      <SectionTitle icon={Wallet} title="ประมาณการเงินทุนหมุนเวียน" />
      
      <div className="grid grid-cols-1 bg-white  md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Assets Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <div className="w-1 h-3 bg-blue-500 rounded-full"></div>
              สินทรัพย์หมุนเวียน
            </h4>
            <Button variant="ghost" size="sm" onClick={addAsset} className="h-6 px-2 text-[10px] gap-1">
              <Plus className="w-3 h-3" /> เพิ่ม
            </Button>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between group">
              <span className="text-sm text-foreground/80">ลูกหนี้การค้า</span>
              <div className="w-32">
                <Input 
                  type="number"
                  value={safeData.accountsReceivable || 0} 
                  onChange={(e) => updateField('accountsReceivable', parseFloat(e.target.value) || 0)}
                  className="h-8 text-right bg-muted/30 border-transparent hover:border-border font-medium"
                />
              </div>
            </div>
            <div className="flex items-center justify-between group">
              <span className="text-sm text-foreground/80">สินค้าคงเหลือ</span>
              <div className="w-32">
                <Input 
                  type="number"
                  value={safeData.inventory || 0} 
                  onChange={(e) => updateField('inventory', parseFloat(e.target.value) || 0)}
                  className="h-8 text-right bg-muted/30 border-transparent hover:border-border font-medium"
                />
              </div>
            </div>
            {assets.map((asset, idx) => (
              <div key={idx} className="flex items-center gap-2 group animate-in slide-in-from-right-2 duration-200">
                <Input 
                  value={asset.label}
                  onChange={(e) => updateAsset(idx, 'label', e.target.value)}
                  placeholder="ชื่อรายการ"
                  className="h-8 text-sm flex-1 bg-transparent border-transparent hover:border-border focus:bg-muted/30"
                />
                <div className="w-32 flex items-center gap-1">
                  <Input 
                    type="number"
                    value={asset.amount || 0} 
                    onChange={(e) => updateAsset(idx, 'amount', parseFloat(e.target.value) || 0)}
                    className="h-8 text-right bg-muted/30 border-transparent hover:border-border font-medium"
                  />
                  <Button variant="ghost" size="icon" onClick={() => removeAsset(idx)} className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Liabilities Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <div className="w-1 h-3 bg-red-500 rounded-full"></div>
              หนี้สินหมุนเวียน
            </h4>
            <Button variant="ghost" size="sm" onClick={addLiability} className="h-6 px-2 text-[10px] gap-1">
              <Plus className="w-3 h-3" /> เพิ่ม
            </Button>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between group">
              <span className="text-sm text-foreground/80">เจ้าหนี้การค้า</span>
              <div className="w-32">
                <Input 
                  type="number"
                  value={safeData.accountsPayable || 0} 
                  onChange={(e) => updateField('accountsPayable', parseFloat(e.target.value) || 0)}
                  className="h-8 text-right bg-muted/30 border-transparent hover:border-border font-medium"
                />
              </div>
            </div>
            {liabilities.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 group animate-in slide-in-from-right-2 duration-200">
                <Input 
                  value={item.label}
                  onChange={(e) => updateLiability(idx, 'label', e.target.value)}
                  placeholder="ชื่อรายการ"
                  className="h-8 text-sm flex-1 bg-transparent border-transparent hover:border-border focus:bg-muted/30"
                />
                <div className="w-32 flex items-center gap-1">
                  <Input 
                    type="number"
                    value={item.amount || 0} 
                    onChange={(e) => updateLiability(idx, 'amount', parseFloat(e.target.value) || 0)}
                    className="h-8 text-right bg-muted/30 border-transparent hover:border-border font-medium"
                  />
                  <Button variant="ghost" size="icon" onClick={() => removeLiability(idx)} className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between pt-4 border-t border-border/50">
              <span className="text-sm font-bold text-primary">เงินทุนที่ต้องการรวม</span>
              <div className="w-32">
                <Input 
                  type="number"
                  value={safeData.totalNeeded || 0} 
                  onChange={(e) => updateField('totalNeeded', parseFloat(e.target.value) || 0)}
                  className="h-8 text-right bg-primary/5 border-transparent text-primary font-bold"
                />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground text-right italic">
              * คำนวณจาก: (สินทรัพย์ - หนี้สิน) หรือตามที่ประเมิน
            </p>
          </div>
        </div>

        {/* Funding Sources Section */}
        <div className="space-y-6">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest border-b border-border pb-2 flex items-center gap-2">
            <div className="w-1 h-3 bg-green-500 rounded-full"></div>
            แหล่งเงินทุน
          </h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between group">
              <span className="text-sm text-foreground/80">วงเงินเดิมที่มีอยู่</span>
              <div className="w-32">
                <Input 
                  type="number"
                  value={safeData.existingCredit || 0} 
                  onChange={(e) => updateField('existingCredit', parseFloat(e.target.value) || 0)}
                  className="h-8 text-right bg-muted/30 border-transparent hover:border-border font-medium"
                />
              </div>
            </div>
            <div className="flex items-center justify-between group">
              <span className="text-sm text-foreground/80">วงเงินที่เสนอครั้งนี้</span>
              <div className="w-32">
                <Input 
                  type="number"
                  value={safeData.newCredit || 0} 
                  onChange={(e) => updateField('newCredit', parseFloat(e.target.value) || 0)}
                  className="h-8 text-right bg-muted/30 border-transparent hover:border-border font-medium"
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-border/50">
              <span className="text-sm font-bold text-green-600">ส่วนต่าง/คงเหลือ</span>
              <div className="w-32">
                <Input 
                  type="number"
                  value={safeData.remaining || 0} 
                  onChange={(e) => updateField('remaining', parseFloat(e.target.value) || 0)}
                  className="h-8 text-right bg-green-50 border-transparent text-green-600 font-bold"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
