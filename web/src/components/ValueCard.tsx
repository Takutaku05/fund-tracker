import React from 'react';

interface ValueCardProps {
  label: string;
  value: string;
  subValue?: string | React.ReactNode;
  isPositive?: boolean | null;
  className?: string;
  important?: boolean;
}

export const ValueCard: React.FC<ValueCardProps> = ({
  label,
  value,
  subValue,
  isPositive = null,
  className = '',
  important = false,
}) => {
  const valueColor = isPositive === true
    ? 'text-green-600'
    : isPositive === false
      ? 'text-red-500'
      : 'text-gray-900';

  const subValueColor = isPositive === true
    ? 'text-green-600 bg-green-50'
    : isPositive === false
      ? 'text-red-600 bg-red-50'
      : 'text-gray-500';

  return (
    <div className={`value-card ${important ? 'value-card-important' : ''} ${className}`}>
      <div className="card-label">{label}</div>
      <div className="card-value-container">
        <span className={`card-value ${important ? 'card-value-lg text-primary' : valueColor}`}>
          {value}
        </span>
        {subValue && (
          <span className={`card-subvalue ${important && isPositive !== null ? subValueColor : 'text-gray-500'}`}>
            {subValue}
          </span>
        )}
      </div>
    </div>
  );
};
