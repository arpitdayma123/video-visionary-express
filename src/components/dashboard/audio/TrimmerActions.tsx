
import React from 'react';
import { Button } from '@/components/ui/button';
import { Save, Loader2 } from 'lucide-react';

interface TrimmerActionsProps {
  onSave: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onCancel: (e: React.MouseEvent<HTMLButtonElement>) => void;
  isSaving: boolean;
  trimDuration: number;
}

const TrimmerActions: React.FC<TrimmerActionsProps> = ({
  onSave,
  onCancel,
  isSaving,
  trimDuration
}) => {
  const isValidDuration = trimDuration >= 8 && trimDuration <= 20; // Updated max duration
  
  return (
    <div className="flex justify-end gap-2">
      <Button 
        variant="outline" 
        onClick={onCancel}
        type="button"
        disabled={isSaving}
      >
        Cancel
      </Button>
      <Button 
        onClick={onSave}
        disabled={!isValidDuration || isSaving}
        className="gap-2"
        type="button"
      >
        {isSaving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Save className="h-4 w-4" />
            Save Trimmed Audio
          </>
        )}
      </Button>
    </div>
  );
};

export default TrimmerActions;

