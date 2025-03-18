
import React from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { CreditCard } from 'lucide-react';

interface CreditDisplayProps {
  userCredits: number;
  userStatus: string;
}

const CreditDisplay = ({ userCredits, userStatus }: CreditDisplayProps) => {
  const navigate = useNavigate();
  
  return (
    <div className="flex items-center gap-4">
      <div className="bg-secondary/40 px-4 py-2 rounded-lg">
        <span className="text-sm mr-2">Credits:</span>
        <span className="font-medium">{userCredits}</span>
      </div>
      
      <Button 
        variant="outline" 
        size="sm" 
        className="flex items-center gap-1"
        onClick={() => navigate('/buy-credits')}
      >
        <CreditCard className="h-4 w-4" />
        Buy Credits
      </Button>
      
      {userStatus === 'Processing' && (
        <div className="bg-yellow-100 text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-200 px-4 py-2 rounded-lg font-medium">
          <span className="text-sm">Processing video...</span>
        </div>
      )}
    </div>
  );
};

export default CreditDisplay;
