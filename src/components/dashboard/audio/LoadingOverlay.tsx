
import React from 'react';
import { Loader } from 'lucide-react';

interface LoadingOverlayProps {
  message?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message = 'Processing...' }) => {
  return (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 rounded-md">
      <Loader className="h-8 w-8 text-primary animate-spin mb-3" />
      <p className="text-sm font-medium text-primary">{message}</p>
    </div>
  );
};

export default LoadingOverlay;
