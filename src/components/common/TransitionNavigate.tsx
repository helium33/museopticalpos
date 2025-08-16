import React, { useEffect, startTransition } from 'react';
import { useNavigate } from 'react-router-dom';

interface TransitionNavigateProps {
  to: string;
  replace?: boolean;
}

const TransitionNavigate: React.FC<TransitionNavigateProps> = ({ to, replace = false }) => {
  const navigate = useNavigate();

  useEffect(() => {
    startTransition(() => {
      navigate(to, { replace });
    });
  }, [navigate, to, replace]);

  return null;
};

export default TransitionNavigate;