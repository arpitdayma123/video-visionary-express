
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { VolumeX } from 'lucide-react';

interface TrimmerAlertsProps {
  silenceDetected: boolean;
  volumeInfo: {
    average: number;
    isTooQuiet: boolean;
  } | null;
}

const TrimmerAlerts: React.FC<TrimmerAlertsProps> = ({
  silenceDetected,
  volumeInfo
}) => {
  return (
    <>
      {silenceDetected && (
        <Alert className="bg-primary/10 border-primary">
          <VolumeX className="h-4 w-4 text-primary" />
          <AlertDescription className="text-sm">
            Silent parts detected at the beginning and/or end of your audio. 
            We recommend trimming these low-volume sections to improve your audio quality.
          </AlertDescription>
        </Alert>
      )}

      {volumeInfo?.isTooQuiet && (
        <Alert variant="warning" className="bg-amber-500/10">
          <VolumeX className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-sm">
            Your audio seems very quiet. Consider:
            • Adjusting microphone volume
            • Speaking closer to the microphone
            • Reducing background noise
          </AlertDescription>
        </Alert>
      )}
    </>
  );
};

export default TrimmerAlerts;
