import React, { useEffect, useState, useRef } from 'react';

interface TelemetryCounterProps {
  value: number;
  digits?: number;
  className?: string;
}

export const TelemetryCounter: React.FC<TelemetryCounterProps> = ({
  value,
  digits = 3,
  className = '',
}) => {
  const [isChanging, setIsChanging] = useState(false);
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (prevValueRef.current !== value) {
      prevValueRef.current = value;
      setIsChanging(true);
      const timer = setTimeout(() => setIsChanging(false), 220);
      return () => clearTimeout(timer);
    }
  }, [value]);

  const formatted = String(value).padStart(digits, '0');

  return (
    <span
      className={`inline-block font-mono transition-all duration-200 ${
        isChanging
          ? 'text-[#39FF88] scale-110 drop-shadow-[0_0_8px_#00FF41]'
          : 'text-inherit scale-100'
      } ${className}`}
    >
      {formatted}
    </span>
  );
};
