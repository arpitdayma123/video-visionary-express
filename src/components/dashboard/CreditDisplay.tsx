
import React from 'react';
import { Separator } from '@/components/ui/separator';

interface CreditDisplayProps {
  userCredits: number;
}

const CreditDisplay: React.FC<CreditDisplayProps> = ({ userCredits }) => {
  return (
    <div className="flex items-center gap-4">
      <div className="bg-secondary/40 px-4 py-2 rounded-lg">
        <span className="font-medium">Credits: {userCredits}</span>
      </div>
      <Separator orientation="vertical" className="h-6" />
      <span className="text-sm text-muted-foreground">
        1 credit = 1 video generation
      </span>
    </div>
  );
};

export default CreditDisplay;
