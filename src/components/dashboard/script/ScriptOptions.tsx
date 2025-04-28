import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface ScriptOptionsProps {
  scriptOption: string;
  onScriptOptionChange: (value: string) => void;
}

const ScriptOptions: React.FC<ScriptOptionsProps> = ({
  scriptOption,
  onScriptOptionChange,
}) => {
  return (
    <RadioGroup
      value={scriptOption}
      onValueChange={onScriptOptionChange}
      className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
    >
      <div>
        <RadioGroupItem
          value="script_from_prompt"
          id="script_from_prompt"
          className="peer sr-only"
        />
        <Label
          htmlFor="script_from_prompt"
          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
        >
          <div className="mb-2">Live Topic to Script</div>
          <p className="text-xs text-muted-foreground">
            Just type the latest topic you want to cover — our AI will research it live on the internet and instantly create an engaging script for you.
          </p>
        </Label>
      </div>

      <div>
        <RadioGroupItem value="ai_find" id="ai_find" className="peer sr-only" />
        <Label
          htmlFor="ai_find"
          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
        >
          <div className="mb-2">AI Find</div>
          <p className="text-xs text-muted-foreground">
            Our AI will automatically find a trending topic and create a script
            for you.
          </p>
        </Label>
      </div>

      <div>
        <RadioGroupItem value="ig_reel" id="ig_reel" className="peer sr-only" />
        <Label
          htmlFor="ig_reel"
          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
        >
          <div className="mb-2">Instagram Reel</div>
          <p className="text-xs text-muted-foreground">
            Paste an Instagram Reel URL and our AI will create a script for you.
          </p>
        </Label>
      </div>

      <div>
        <RadioGroupItem value="custom" id="custom" className="peer sr-only" />
        <Label
          htmlFor="custom"
          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
        >
          <div className="mb-2">Custom</div>
          <p className="text-xs text-muted-foreground">
            Write your own script.
          </p>
        </Label>
      </div>

      <div>
        <RadioGroupItem value="ai_remake" id="ai_remake" className="peer sr-only" />
        <Label
          htmlFor="ai_remake"
          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
        >
          <div className="mb-2">AI Remake</div>
          <p className="text-xs text-muted-foreground">
            AI Remake
          </p>
        </Label>
      </div>
    </RadioGroup>
  );
};

export default ScriptOptions;
