import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

type Option = { value: string; label: string };

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options?: Option[];
  placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(({ options = [], placeholder, className = '', children, ...props }, ref) => {
  return (
    <div className="relative">
      <select
        ref={ref}
        {...props}
        className={`w-full pr-10 px-3 py-2 bg-card border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring appearance-none ${className}`}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
        {children}
      </select>
      <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
    </div>
  );
});

Select.displayName = 'Select';

export default Select;
