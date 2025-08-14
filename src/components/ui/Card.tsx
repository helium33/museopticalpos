import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className }) => {
  return (
    <div className={cn(
      'bg-white dark:bg-gray-800 rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl',
      className
    )}>
      {children}
    </div>
  );
};

export default Card;