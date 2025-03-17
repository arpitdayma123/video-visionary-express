
import React from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CreditDisplay from './CreditDisplay';

interface DashboardHeaderProps {
  userCredits: number;
  userStatus: string;
}

const DashboardHeader = ({ userCredits, userStatus }: DashboardHeaderProps) => {
  const navigate = useNavigate();
  
  return (
    <div className="flex justify-between items-center mb-6">
      <CreditDisplay userCredits={userCredits} userStatus={userStatus} />
      <Button onClick={() => navigate('/results')} variant="outline" className="gap-2">
        <ExternalLink className="h-4 w-4" />
        View Results
      </Button>
    </div>
  );
};

export default DashboardHeader;
