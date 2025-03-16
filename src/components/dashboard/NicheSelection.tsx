
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Briefcase, Check } from 'lucide-react';

interface NicheSelectionProps {
  niches: string[];
  selectedNiches: string[];
  onNicheChange: (niche: string) => Promise<void>;
}

const NicheSelection: React.FC<NicheSelectionProps> = ({
  niches,
  selectedNiches,
  onNicheChange
}) => {
  return (
    <Card className="mb-6 p-6">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <Briefcase className="w-5 h-5" /> Target Niches
      </h2>
      <p className="text-muted-foreground mb-6">
        Select niches that are relevant to your content. We'll use these to generate targeted videos.
      </p>
      
      <div className="flex flex-wrap gap-2">
        {niches.map((niche) => (
          <Button
            key={niche}
            variant={selectedNiches.includes(niche) ? "default" : "outline"}
            className="mb-2"
            onClick={() => onNicheChange(niche)}
          >
            {selectedNiches.includes(niche) && <Check className="mr-1 h-4 w-4" />}
            {niche}
          </Button>
        ))}
      </div>
    </Card>
  );
};

export default NicheSelection;
