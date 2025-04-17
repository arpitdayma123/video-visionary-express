
import React from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface TrimmerHeaderProps {
  onCancel: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

const TrimmerHeader: React.FC<TrimmerHeaderProps> = ({ onCancel }) => {
  return (
    <div className="flex justify-between items-center">
      <h3 className="text-lg font-medium">Trim Audio</h3>
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={onCancel} 
        aria-label="Cancel"
        type="button"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default TrimmerHeader;
