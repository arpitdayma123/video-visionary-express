
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Instagram } from 'lucide-react';

interface InstagramReelInputProps {
  reelUrl: string;
  isValidReelUrl: boolean;
  isSaving: boolean;
  onReelUrlChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const InstagramReelInput: React.FC<InstagramReelInputProps> = ({
  reelUrl,
  isValidReelUrl,
  isSaving,
  onReelUrlChange
}) => {
  return (
    <div className="mt-6 animate-fade-in">
      <div className="flex items-center mb-2">
        <Instagram className="h-5 w-5 mr-2 text-pink-500" />
        <Label htmlFor="reel-url" className="font-medium">Instagram Reel URL</Label>
        {isSaving && <span className="ml-2 text-xs text-muted-foreground">Saving...</span>}
      </div>
      
      <div className="flex flex-col space-y-2">
        <Input
          id="reel-url"
          placeholder="https://www.instagram.com/reel/..."
          value={reelUrl}
          onChange={onReelUrlChange}
          className={`${!isValidReelUrl ? 'border-destructive' : ''}`}
          type="url"
        />
        
        {!isValidReelUrl && reelUrl && (
          <Alert variant="destructive" className="mt-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Invalid Instagram URL</AlertTitle>
            <AlertDescription>
              Please paste a valid Instagram reel URL (e.g., https://www.instagram.com/reel/ABC123).
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
};

export default InstagramReelInput;
