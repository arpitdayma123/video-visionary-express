
import React from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface ScriptOptionsProps {
  scriptOption: string;
  onScriptOptionChange: (value: string) => void;
}

const ScriptOptions: React.FC<ScriptOptionsProps> = ({
  scriptOption,
  onScriptOptionChange
}) => {
  return (
    <RadioGroup 
      value={scriptOption} 
      onValueChange={onScriptOptionChange}
      className="space-y-4"
    >
      <div className="flex items-start space-x-2">
        <RadioGroupItem value="ai_find" id="ai_find" />
        <div className="grid gap-1.5">
          <Label htmlFor="ai_find" className="font-medium">Let our AI find viral script</Label>
          <p className="text-sm text-muted-foreground">Our AI will analyze trending content and create a viral script for you</p>
        </div>
      </div>
      
      <div className="flex items-start space-x-2">
        <RadioGroupItem value="custom" id="custom" />
        <div className="grid gap-1.5">
          <Label htmlFor="custom" className="font-medium">Use your own script</Label>
          <p className="text-sm text-muted-foreground">Write your own script for the video (limit: 200 words)</p>
        </div>
      </div>
      
      <div className="flex items-start space-x-2">
        <RadioGroupItem value="ai_remake" id="ai_remake" />
        <div className="grid gap-1.5">
          <Label htmlFor="ai_remake" className="font-medium">Let our AI remake your script</Label>
          <p className="text-sm text-muted-foreground">Provide a script and our AI will enhance it for better engagement</p>
        </div>
      </div>

      <div className="flex items-start space-x-2">
        <RadioGroupItem value="ig_reel" id="ig_reel" />
        <div className="grid gap-1.5">
          <Label htmlFor="ig_reel" className="font-medium">Recreate Instagram Reel</Label>
          <p className="text-sm text-muted-foreground">Provide an Instagram reel URL to recreate its content</p>
        </div>
      </div>

      <div className="flex items-start space-x-2">
        <RadioGroupItem value="script_from_prompt" id="script_from_prompt" />
        <div className="grid gap-1.5">
          <Label htmlFor="script_from_prompt" className="font-medium">Live Topic to Script</Label>
          <p className="text-sm text-muted-foreground">Just type the latest topic you want to cover — our AI will research it live on the internet and instantly create an engaging script for you.</p>
        </div>
      </div>
    </RadioGroup>
  );
};

export default ScriptOptions;
