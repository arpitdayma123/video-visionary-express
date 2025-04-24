
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
  const isValidDuration = trimDuration >= 8 && trimDuration <= 20;
  
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
        className="gap-2 relative" // Added relative positioning
        type="button"
      >
        {isSaving ? (
          <>
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-primary-foreground" />
            </div>
            <span className="opacity-0">Save Trimmed Audio</span>
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

