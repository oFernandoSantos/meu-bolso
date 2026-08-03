import { Input } from "@/components/ui/input";

interface DateInputProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
}

export function DateInput({ value, onChange, id }: DateInputProps) {
  return (
    <Input
      id={id}
      type="date"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-12 rounded-xl"
    />
  );
}
