import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ColorField=({label,value,onChange})=>(
  <div className="space-y-1.5">
    <Label className="text-xs">{label}</Label>
    <div className="flex items-center gap-2">
      <input type="color" value={value||"#000000"} onChange={e=>onChange(e.target.value)} className="h-10 w-12 rounded border border-slate-200 cursor-pointer bg-white p-0.5"/>
      <Input value={value||""} onChange={e=>onChange(e.target.value)} className="font-mono"/>
    </div>
  </div>
);
export default ColorField;
