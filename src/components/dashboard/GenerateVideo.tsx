
import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import CreditDisplay from './CreditDisplay';
import { UploadedFile } from '@/hooks/useDashboardData';
import { Alert } from '@/components/ui/alert';
import { CheckCircle2, XCircle } from 'lucide-react';

interface GenerateVideoProps {
  isFormComplete: boolean;
  userCredits: number;
  userStatus: string;
  userId: string | undefined;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  videos: UploadedFile[];
  voiceFiles: UploadedFile[];
  selectedVideo: UploadedFile | null;
  selectedVoice: UploadedFile | null;
  selectedNiches: string[];
  competitors: string[];
  isScriptSelected?: boolean;
  // Props for script preview handling:
  isScriptPreviewVisible?: boolean;
  scriptOption?: string;
}

const GenerateVideo: React.FC<GenerateVideoProps> = ({
  isFormComplete,
  userCredits,
  userStatus,
  userId,
  onSubmit,
  videos,
  voiceFiles,
  selectedVideo,
  selectedVoice,
  selectedNiches,
  competitors,
  isScriptSelected = true,
  isScriptPreviewVisible = true,
  scriptOption = ''
}) => {
  const isProcessing = userStatus === 'Processing';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(e);
  };

  // Check individual requirements
  const hasVideoSelected = selectedVideo !== null;
  const hasVoiceSelected = selectedVoice !== null;
  const hasNiches = selectedNiches.length > 0;
  const hasCompetitors = competitors.length > 0;
  const hasCredits = userCredits >= 1;

  // Only require script preview is visible for ai_find / ig_reel
  const requiresScriptPreview = scriptOption === 'ai_find' || scriptOption === 'ig_reel';
  const scriptPreviewOk = !requiresScriptPreview || isScriptPreviewVisible;
  
  // Ensure we're logging the state for debugging
  console.log('GenerateVideo - Script Preview Status:', {
    scriptOption,
    requiresScriptPreview,
    isScriptPreviewVisible,
    scriptPreviewOk,
    isFormComplete,
    hasCredits,
    isProcessing
  });
  
  const buttonEnabled =
    isFormComplete &&
    hasCredits &&
    !isProcessing &&
    scriptPreviewOk;

  // Updated list of requirements
  const remainingTasks = [
    { completed: hasVideoSelected, label: 'Select a target video' },
    { completed: hasVoiceSelected, label: 'Select a voice file' },
    { completed: hasNiches, label: 'Choose at least one niche' },
    { completed: hasCompetitors, label: 'Add competitor accounts' },
    { completed: hasCredits, label: 'Have at least 1 credit' },
    ...(requiresScriptPreview
      ? [{ completed: isScriptPreviewVisible, label: 'Generate Script Preview' }]
      : []),
  ];

  const incompleteTasks = remainingTasks.filter(task => !task.completed);

  return (
    <section className="animate-fade-in pb-8">
      <h2 className="text-xl font-medium mb-4">Generate Video</h2>

      <div className="flex flex-col space-y-4">
        <div className="p-4 bg-muted rounded-md">
          <p className="font-medium text-sm mb-3">Generation Requirements:</p>
          <ul className="space-y-2">
            {remainingTasks.map((task, index) => (
              <li key={index} className="flex items-center text-sm">
                {task.completed ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500 mr-2 shrink-0" />
                )}
                <span className={task.completed ? 'text-muted-foreground line-through' : ''}>
                  {task.label}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-4 bg-muted rounded-md">
          <div>
            <CreditDisplay userCredits={userCredits} userStatus={userStatus} />
            {!hasCredits && (
              <p className="text-sm text-red-500 mt-1">You need at least 1 credit to generate a video.</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={!buttonEnabled}
            className="w-full sm:w-auto"
            onClick={handleSubmit}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Generate Video'
            )}
          </Button>
        </div>

        {incompleteTasks.length > 0 && !isProcessing && (
          <Alert variant="info" className="bg-blue-50 border-blue-200">
            <p className="text-sm text-blue-700">
              <strong>Remaining steps:</strong> {incompleteTasks.map(task => task.label).join(', ')}
            </p>
          </Alert>
        )}

        {isProcessing && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-700">
              Your video is currently being generated. This process may take 5-10 minutes. You'll be notified when it's ready to view in the Results section.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default GenerateVideo;
