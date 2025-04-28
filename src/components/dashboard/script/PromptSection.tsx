
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PromptSectionProps {
  userQuery: string;
  onQueryChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isSaving?: boolean;
}

const PromptSection: React.FC<PromptSectionProps> = ({
  userQuery,
  onQueryChange,
  isSaving = false
}) => {
  return (
    <div className="space-y-4 mt-4">
      <div className="space-y-2">
        <Label htmlFor="prompt">Enter your topic, idea, or keywords</Label>
        <Input
          id="prompt"
          placeholder="E.g.,: China's new DeepSeek R2 AI model or ByteDance's OmniHuman 1, etc."
          value={userQuery}
          onChange={onQueryChange}
          disabled={isSaving}
        />
      </div>
    </div>
  );
};

export default PromptSection;
