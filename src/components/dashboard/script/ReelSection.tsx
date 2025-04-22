
import React from 'react';
import InstagramReelInput from './InstagramReelInput';

interface ReelSectionProps {
  reelUrl: string;
  isValidReelUrl: boolean;
  isSaving: boolean;
  onReelUrlChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const ReelSection: React.FC<ReelSectionProps> = ({
  reelUrl,
  isValidReelUrl,
  isSaving,
  onReelUrlChange
}) => (
  <InstagramReelInput
    reelUrl={reelUrl}
    isValidReelUrl={isValidReelUrl}
    isSaving={isSaving}
    onReelUrlChange={onReelUrlChange}
  />
);

export default ReelSection;
