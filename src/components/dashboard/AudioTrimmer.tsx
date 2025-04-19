
import React from 'react';
import { Card } from '@/components/ui/card';
import { Info, Loader } from 'lucide-react';
import LoadingOverlay from './audio/LoadingOverlay';
import TrimmerHeader from './audio/TrimmerHeader';
import TrimmerAlerts from './audio/TrimmerAlerts';
import Waveform from './audio/Waveform';
import TrimmerSlider from './audio/TrimmerSlider';
import TrimmerControls from './audio/TrimmerControls';
import TrimmerActions from './audio/TrimmerActions';
import { useAudioTrimmer } from '@/hooks/useAudioTrimmer';

interface AudioTrimmerProps {
  audioFile: File;
  onSave: (trimmedBlob: Blob, duration: number) => void;
  onCancel: () => void;
  autoDetectSilence?: boolean;
}

const AudioTrimmer: React.FC<AudioTrimmerProps> = ({ 
  audioFile, 
  onSave, 
  onCancel,
  autoDetectSilence = true
}) => {
  const {
    audioUrl,
    audioRef,
    isPlaying,
    duration,
    currentTime,
    trimRange,
    waveformData,
    isSaving,
    isDragging,
    isAnalyzing,
    volumeInfo,
    silenceDetected,
    trimDuration,
    setIsDragging,
    handleTimeUpdate,
    togglePlayPause,
    handleTrimChange,
    handleMouseMove,
    handleTouchMove,
    handleMouseUp,
    handleTouchEnd,
    skipForward,
    skipBackward,
    saveTrimmedAudio,
    setTrimRange
  } = useAudioTrimmer({ audioFile, autoDetectSilence });

  // Handle save button click
  const handleSaveTrim = async (e: React.MouseEvent<HTMLButtonElement>) => {
    const result = await saveTrimmedAudio(e);
    if (result) {
      onSave(result.blob, result.duration);
    }
  };

  // Handle cancel button click
  const handleCancel = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onCancel();
  };

  // Stop any form submission when clicking inside the trimmer
  const handleFormClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <Card 
      className="p-6 animate-fade-in relative" 
      onClick={handleFormClick}
      data-active-trimmer="true"
    >
      {(isSaving || isAnalyzing) && (
        <LoadingOverlay message={isAnalyzing ? "Analyzing audio..." : "Processing audio..."} />
      )}
      
      <div className="space-y-6">
        <TrimmerHeader onCancel={handleCancel} />
        
        <TrimmerAlerts 
          silenceDetected={silenceDetected} 
          volumeInfo={volumeInfo} 
        />

        <div className="bg-secondary rounded-md p-4">
          <audio 
            ref={audioRef} 
            src={audioUrl} 
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => isPlaying ? togglePlayPause : null}
            className="hidden"
          />
          
          <Waveform 
            waveformData={waveformData}
            trimRange={trimRange}
            currentTime={currentTime}
            duration={duration}
            isDragging={isDragging}
            setIsDragging={setIsDragging}
            setTrimRange={setTrimRange}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />

          <TrimmerSlider 
            trimRange={trimRange}
            duration={duration}
            onValueChange={handleTrimChange}
          />

          <TrimmerControls 
            isPlaying={isPlaying}
            onPlayPause={togglePlayPause}
            onSkipBackward={skipBackward}
            onSkipForward={skipForward}
          />
        </div>

        <TrimmerActions 
          onSave={handleSaveTrim}
          onCancel={handleCancel}
          isSaving={isSaving}
          trimDuration={trimDuration}
        />

        <div className="text-sm text-muted-foreground">
          <p className="flex items-start gap-2">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>
              Trim your audio to between 8 and 40 seconds by dragging the slider handles or the circular trim points.
              We recommend trimming any silent sections at the beginning or end of your recording for better quality.
            </span>
          </p>
        </div>
      </div>
    </Card>
  );
};

export default AudioTrimmer;
