'use client';

import { useEffect, useRef, useState } from 'react';

interface NumericInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: number;
  onChange: (n: number) => void;
  fallback?: number;
}

interface NullableNumericInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: number | null;
  onChange: (n: number | null) => void;
}

// Like NumericInput, but an empty field commits null instead of a fallback number.
export function NullableNumericInput({ value, onChange, onBlur, ...props }: NullableNumericInputProps) {
  const [raw, setRaw] = useState(value === null ? '' : String(value));
  const lastCommitted = useRef(value);

  useEffect(() => {
    if (value !== lastCommitted.current) {
      setRaw(value === null ? '' : String(value));
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
        const n = isNaN(parsed) ? null : parsed;
        lastCommitted.current = n;
        onChange(n);
        setRaw(n === null ? '' : String(n));
        onBlur?.(e);
      }}
    />
  );
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
