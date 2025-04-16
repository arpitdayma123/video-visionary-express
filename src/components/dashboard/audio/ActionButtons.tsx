
import React from 'react';
import { Button } from '@/components/ui/button';
import { Save, X } from 'lucide-react';

interface ActionButtonsProps {
  onSave: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onCancel: (e: React.MouseEvent<HTMLButtonElement>) => void;
  isValidDuration: boolean;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  onSave,
  onCancel,
  isValidDuration
}) => {
  return (
    <div className="flex justify-end gap-2">
      <Button 
        variant="outline" 
        onClick={onCancel}
        type="button"
      >
        Cancel
      </Button>
      <Button 
        onClick={onSave}
        disabled={!isValidDuration}
        className="gap-1"
        type="button"
      >
        <Save className="h-4 w-4" />
        Save Trimmed Audio
      </Button>
    </div>
  );
};

export default ActionButtons;
