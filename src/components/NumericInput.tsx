'use client';

import { useEffect, useRef, useState } from 'react';

interface NumericInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: number;
  onChange: (n: number) => void;
  fallback?: number;
}

export function NumericInput({ value, onChange, fallback = 0, onBlur, ...props }: NumericInputProps) {
  const [raw, setRaw] = useState(String(value));
  const lastCommitted = useRef(value);

  useEffect(() => {
    if (value !== lastCommitted.current) {
      setRaw(String(value));
      lastCommitted.current = value;
    }
  }, [value]);

  return (
    <input
      {...props}
      type="number"
      value={raw}
      onChange={e => setRaw(e.target.value)}
      onBlur={e => {
        const parsed = parseFloat(e.target.value);
        const n = isNaN(parsed) ? fallback : parsed;
        lastCommitted.current = n;
        onChange(n);
        setRaw(String(n));
        onBlur?.(e);
      }}
    />
  );
}
