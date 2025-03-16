
import React from 'react';

interface CreditDisplayProps {
  userCredits: number;
  userStatus: string;
}

const CreditDisplay = ({ userCredits, userStatus }: CreditDisplayProps) => {
  return (
    <div className="flex items-center gap-4">
      <div className="bg-secondary/40 px-4 py-2 rounded-lg">
        <span className="text-sm mr-2">Credits:</span>
        <span className="font-medium">{userCredits}</span>
      </div>
      {userStatus === 'Processing' && (
        <div className="bg-yellow-100 text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-200 px-4 py-2 rounded-lg">
          <span className="text-sm">Processing video...</span>
        </div>
      )}
    </div>
  );
};

export default CreditDisplay;
