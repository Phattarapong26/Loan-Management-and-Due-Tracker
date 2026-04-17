import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';

interface EditableFieldProps<T extends string | number | undefined | null> {
  label: string;
  value: T;
  isEditing: boolean;
  onChange: (value: T) => void;
  type?: 'text' | 'number' | 'date' | 'textarea';
  displayValue?: string;
  className?: string;
  icon?: React.ReactNode;
}

export function EditableField<T extends string | number | undefined | null>({
  label,
  value,
  isEditing,
  onChange,
  type = 'text',
  displayValue,
  className = '',
  icon,
}: EditableFieldProps<T>) {
  const handleChange = (newValue: T) => {
    console.log(`EditableField [${label}] - onChange:`, newValue);
    onChange(newValue);
  };

  return (
    <div className={className}>
      <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5">
        {icon}
        {label}
      </p>
      {isEditing ? (
        type === 'textarea' ? (
          <Textarea
            value={value || ''}
            onChange={(e) => handleChange(e.target.value as T)}
            rows={2}
          />
        ) : (
          <Input
            type={type}
            value={value || ''}
            onChange={(e) => {
              const val = type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
              handleChange(val as T);
            }}
          />
        )
      ) : (
        <p className="font-medium">{displayValue || value || '-'}</p>
      )}
    </div>
  );
}
