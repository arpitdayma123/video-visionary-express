import React, { useState, useRef, useEffect } from 'react';
import { Upload, Trash2, Check, Mic, Square, Pause, FileAudio, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import AudioRecorder, { RecordingStatus } from '@/utils/audioRecorder';

type UploadedFile = {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  duration?: number;
};

interface VoiceUploadProps {
  voiceFiles: UploadedFile[];
  setVoiceFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
  selectedVoice: UploadedFile | null;
  setSelectedVoice: React.Dispatch<React.SetStateAction<UploadedFile | null>>;
  userId: string;
  updateProfile: (updates: any) => Promise<void>;
}

const VoiceUpload = ({
  voiceFiles,
  setVoiceFiles,
  selectedVoice,
  setSelectedVoice,
  userId,
  updateProfile
}: VoiceUploadProps) => {
  const { toast } = useToast();
  const [isDraggingVoice, setIsDraggingVoice] = useState(false);
  const [uploadingVoices, setUploadingVoices] = useState<{
    [key: string]: number;
  }>({});

  // Voice recording states
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>('inactive');
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  
  // Initialize audio recorder
  useEffect(() => {
    audioRecorderRef.current = new AudioRecorder({
      onStatusChange: (status) => setRecordingStatus(status),
      onTimeUpdate: (seconds) => setRecordingTime(seconds),
      onError: (error) => {
        console.error('Recording error:', error);
        toast({
          title: "Recording Error",
          description: error.message || "An error occurred during recording",
          variant: "destructive"
        });
      }
    });
    
    return () => {
      // Clean up on component unmount
      if (audioRecorderRef.current && audioRecorderRef.current.getStatus() !== 'inactive') {
        audioRecorderRef.current.stop().catch(err => console.error('Error stopping recorder:', err));
      }
    };
  }, [toast]);

  // Check if the maximum limit of voice files has been reached
  const hasReachedVoiceLimit = voiceFiles.length >= 5;

  // Function to get media duration
  const getMediaDuration = (file: File): Promise<number> => {
    return new Promise(resolve => {
      const element = file.type.startsWith('video/') ? document.createElement('video') : document.createElement('audio');
      element.preload = 'metadata';
      element.onloadedmetadata = () => {
        window.URL.revokeObjectURL(element.src);
        resolve(element.duration);
      };
      element.src = URL.createObjectURL(file);
    });
  };

  // File upload handler
  const handleVoiceUpload = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>) => {
    if (!userId) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to upload files.",
        variant: "destructive"
      });
      return;
    }
    
    if (hasReachedVoiceLimit) {
      toast({
        title: "Maximum Limit Reached",
        description: "You can only upload 5 voice files. To upload more, delete previous voices.",
        variant: "destructive"
      });
      return;
    }
    
    let files: FileList | null = null;
    
    if ('dataTransfer' in e) {
      e.preventDefault();
      files = e.dataTransfer.files;
      setIsDraggingVoice(false);
    } else if (e.target.files) {
      files = e.target.files;
    }
    
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      const invalidFiles = fileArray.filter(file => {
        const isValidType = file.type === 'audio/mpeg' || file.type === 'audio/wav';
        const isValidSize = file.size <= 8 * 1024 * 1024;
        return !isValidType || !isValidSize;
      });
      
      if (invalidFiles.length > 0) {
        toast({
          title: "Invalid files detected",
          description: "Please upload MP3 or WAV files under 8MB.",
          variant: "destructive"
        });
        return;
      }
      
      if (voiceFiles.length + fileArray.length > 5) {
        toast({
          title: "Too many voice files",
          description: "You can upload a maximum of 5 voice files.",
          variant: "destructive"
        });
        return;
      }
      
      const newVoiceFiles = [...voiceFiles];
      const uploadingProgress = { ...uploadingVoices };

      // Process each valid file
      for (const file of fileArray) {
        try {
          // Check voice duration
          const duration = await getMediaDuration(file);

          // Validate duration (between 8 and 40 seconds)
          if (duration < 8 || duration > 40) {
            toast({
              title: "Invalid voice duration",
              description: `Voice file must be between 8 and 40 seconds (current: ${Math.round(duration)} seconds).`,
              variant: "destructive"
            });
            continue; // Skip this file but process others
          }
          
          const uploadId = uuidv4();
          uploadingProgress[uploadId] = 0;
          setUploadingVoices(uploadingProgress);
          
          const fileExt = file.name.split('.').pop();
          const fileName = `${userId}/${uuidv4()}.${fileExt}`;
          const filePath = `voices/${fileName}`;
          
          const progressCallback = (progress: number) => {
            setUploadingVoices(current => ({
              ...current,
              [uploadId]: progress
            }));
          };
          
          progressCallback(1);
          
          const progressInterval = setInterval(() => {
            setUploadingVoices(current => {
              const currentProgress = current[uploadId] || 0;
              if (currentProgress >= 90) {
                clearInterval(progressInterval);
                return current;
              }
              return {
                ...current,
                [uploadId]: Math.min(90, currentProgress + 10)
              };
            });
          }, 500);
          
          const { data: uploadData, error: uploadError } = 
            await supabase.storage.from('creator_files').upload(filePath, file);
            
          clearInterval(progressInterval);
          
          if (uploadError) throw uploadError;
          
          progressCallback(100);
          
          const { data: urlData } = 
            supabase.storage.from('creator_files').getPublicUrl(filePath);

          // Include duration in the new voice file object
          const newVoiceFile = {
            id: uuidv4(),
            name: file.name,
            size: file.size,
            type: file.type,
            url: urlData.publicUrl,
            duration: duration
          };
          
          newVoiceFiles.push(newVoiceFile);
          setVoiceFiles(newVoiceFiles);
          setSelectedVoice(newVoiceFile);
          
          setTimeout(() => {
            setUploadingVoices(current => {
              const updated = { ...current };
              delete updated[uploadId];
              return updated;
            });
          }, 1000);

          // Update success message to include duration
          toast({
            title: "Voice file uploaded",
            description: `Successfully uploaded ${file.name} (${Math.round(duration)} seconds).`
          });
          
          await updateProfile({
            voice_files: newVoiceFiles,
            selected_voice: newVoiceFile
          });
          
        } catch (error) {
          console.error('Error uploading voice file:', error);
          toast({
            title: "Upload Failed",
            description: `Failed to upload ${file.name}.`,
            variant: "destructive"
          });
        }
      }
    }
  };

  // Voice recording functions
  const startRecording = async () => {
    // Check if maximum limit has been reached
    if (hasReachedVoiceLimit) {
      toast({
        title: "Maximum Limit Reached",
        description: "You can only have 5 voice files. To record more, delete previous voices.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      if (audioRecorderRef.current) {
        await audioRecorderRef.current.start();
      }
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Recording Failed",
        description: "Could not access microphone. Please check your browser permissions.",
        variant: "destructive"
      });
    }
  };
  
  const pauseRecording = () => {
    if (audioRecorderRef.current && recordingStatus === 'recording') {
      audioRecorderRef.current.pause();
    }
  };
  
  const resumeRecording = () => {
    if (audioRecorderRef.current && recordingStatus === 'paused') {
      audioRecorderRef.current.resume();
    }
  };
  
  const stopRecording = async () => {
    if (audioRecorderRef.current && recordingStatus !== 'inactive') {
      try {
        const blob = await audioRecorderRef.current.stop();
        setRecordingBlob(blob);
      } catch (error) {
        console.error('Error stopping recording:', error);
        toast({
          title: "Recording Error",
          description: "Failed to stop recording properly.",
          variant: "destructive"
        });
      }
    }
  };
  
  const saveRecording = async () => {
    if (!recordingBlob || !userId) return;
    
    try {
      // Validate recording duration
      if (recordingTime < 8) {
        toast({
          title: "Recording too short",
          description: "Voice recording must be at least 8 seconds long.",
          variant: "destructive"
        });
        return;
      }
      
      setIsProcessing(true);
      
      // Show processing message
      toast({
        title: "Processing recording",
        description: "Preparing your high-quality WAV recording...",
      });
      
      const uploadId = uuidv4();
      setUploadingVoices(prev => ({
        ...prev,
        [uploadId]: 0
      }));

      // Create file from WAV blob
      const fileName = `recorded_voice_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.wav`;
      const filePath = `voices/${userId}/${uuidv4()}.wav`;

      // Upload progress simulation
      const progressInterval = setInterval(() => {
        setUploadingVoices(current => {
          const currentProgress = current[uploadId] || 0;
          if (currentProgress >= 90) {
            clearInterval(progressInterval);
            return current;
          }
          return {
            ...current,
            [uploadId]: Math.min(90, currentProgress + 10)
          };
        });
      }, 300);

      // Upload to Supabase
      const { data: uploadData, error: uploadError } = 
        await supabase.storage.from('creator_files').upload(filePath, recordingBlob);
        
      clearInterval(progressInterval);
      
      if (uploadError) throw uploadError;
      
      setUploadingVoices(prev => ({
        ...prev,
        [uploadId]: 100
      }));

      // Get public URL
      const { data: urlData } = 
        supabase.storage.from('creator_files').getPublicUrl(filePath);

      // Create voice file object
      const newVoiceFile = {
        id: uuidv4(),
        name: fileName,
        size: recordingBlob.size,
        type: 'audio/wav',
        url: urlData.publicUrl,
        duration: recordingTime
      };

      // Update state
      const updatedVoiceFiles = [...voiceFiles, newVoiceFile];
      setVoiceFiles(updatedVoiceFiles);
      setSelectedVoice(newVoiceFile);

      // Clean up
      setTimeout(() => {
        setUploadingVoices(current => {
          const updated = { ...current };
          delete updated[uploadId];
          return updated;
        });
      }, 1000);

      // Reset recording state
      setRecordingBlob(null);
      setRecordingTime(0);

      // Update user profile
      await updateProfile({
        voice_files: updatedVoiceFiles,
        selected_voice: newVoiceFile
      });
      
      toast({
        title: "Recording saved",
        description: `Successfully saved as high-quality WAV format (${recordingTime} seconds).`
      });
    } catch (error) {
      console.error('Error saving recording:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save voice recording.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const discardRecording = () => {
    setRecordingBlob(null);
    setRecordingTime(0);
  };
  
  const handleRemoveVoiceFile = async (id: string) => {
    try {
      const fileToRemove = voiceFiles.find(file => file.id === id);
      if (!fileToRemove) return;
      
      // If the deleted voice is the selected one, clear the selection
      if (selectedVoice && selectedVoice.id === id) {
        setSelectedVoice(null);
        await updateProfile({
          selected_voice: null
        });
      }
      
      // Delete the file from Supabase storage
      try {
        // Extract the file path from the URL
        const fileUrl = new URL(fileToRemove.url);
        const pathParts = fileUrl.pathname.split('/');
        
        // Find the index of 'creator_files' in the path
        const creatorFilesIndex = pathParts.findIndex(part => part === 'creator_files');
        
        if (creatorFilesIndex !== -1 && creatorFilesIndex + 1 < pathParts.length) {
          // Get the path after 'creator_files/'
          const storagePath = pathParts.slice(creatorFilesIndex + 1).join('/');
          
          console.log('Removing voice file from storage path:', storagePath);
          
          const { error: deleteError } = await supabase.storage
            .from('creator_files')
            .remove([storagePath]);
          
          if (deleteError) {
            console.error('Error deleting voice file from storage:', deleteError);
            throw deleteError;
          }
          
          console.log('Successfully deleted voice file from storage:', storagePath);
        } else {
          console.warn('Could not determine correct storage path from URL:', fileToRemove.url);
        }
      } catch (storageError) {
        console.warn('Error removing voice file from storage:', storageError);
        // Continue with UI removal even if storage removal fails
      }
      
      // Update voice files state and profile
      const updatedVoiceFiles = voiceFiles.filter(file => file.id !== id);
      setVoiceFiles(updatedVoiceFiles);
      
      await updateProfile({
        voice_files: updatedVoiceFiles
      });
      
      toast({
        title: "Voice file removed",
        description: "Successfully removed the voice file from your collection and storage."
      });
    } catch (error) {
      console.error('Error removing voice file:', error);
      toast({
        title: "Removal Failed",
        description: "Failed to completely remove the voice file. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const handleSelectVoice = async (voice: UploadedFile) => {
    try {
      setSelectedVoice(voice);
      
      await updateProfile({
        selected_voice: voice
      });
      
      toast({
        title: "Target Voice Selected",
        description: `"${voice.name}" is now your target voice.`
      });
    } catch (error) {
      console.error('Error selecting voice:', error);
      toast({
        title: "Selection Failed",
        description: "Failed to select the target voice.",
        variant: "destructive"
      });
    }
  };

  return (
    <section className="animate-fade-in">
      <div className="flex items-center mb-4">
        <Mic className="mr-2 h-5 w-5 text-primary" />
        <h2 className="text-2xl font-medium">Voice Upload</h2>
      </div>
      <p className="text-muted-foreground mb-6">Choose to record or upload your voice (8-40 seconds) and select one voice to continue</p>
      
      {/* Add warning alert about supported languages */}
      <Alert variant="warning" className="mb-6 border-amber-500 bg-amber-500/10">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <AlertDescription className="text-amber-600">
          <strong>Important:</strong> Please upload voice in a language we support. We currently support the following languages: English, Japanese, Chinese, French, and German.
        </AlertDescription>
      </Alert>
      
      {/* Display limit warning if maximum has been reached */}
      {hasReachedVoiceLimit && (
        <Alert variant="warning" className="mb-4 border-amber-500 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-amber-600">
            You've reached the maximum limit of 5 voice files. To add more, please delete existing files.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Simplified UI with Tabs for "Record or Upload" */}
      <Tabs defaultValue="upload" className="mb-6">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <FileAudio className="h-4 w-4" />
            <span>Upload Voice File</span>
          </TabsTrigger>
          <TabsTrigger value="record" className="flex items-center gap-2">
            <Mic className="h-4 w-4" />
            <span>Record Your Voice</span>
          </TabsTrigger>
        </TabsList>
        
        {/* Upload Tab Content */}
        <TabsContent value="upload">
          <Card className="p-6">
            <div 
              className={`file-drop-area p-8 border-2 border-dashed rounded-lg ${
                isDraggingVoice ? 'border-primary bg-primary/5' : 'border-muted'
              } ${hasReachedVoiceLimit ? 'opacity-50 pointer-events-none' : ''}`} 
              onDragOver={e => {
                e.preventDefault();
                setIsDraggingVoice(true);
              }} 
              onDragLeave={() => setIsDraggingVoice(false)} 
              onDrop={handleVoiceUpload}
            >
              <div className="flex flex-col items-center justify-center text-center">
                <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Drag MP3 or WAV files here</h3>
                <p className="text-muted-foreground mb-4">Max 8MB, 8-40 seconds long</p>
                <label className={`button-hover-effect px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors ${
                  hasReachedVoiceLimit ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                }`}>
                  <input 
                    type="file" 
                    accept="audio/mpeg,audio/wav" 
                    multiple 
                    className="hidden" 
                    onChange={handleVoiceUpload} 
                    disabled={hasReachedVoiceLimit} 
                  />
                  Select Files
                </label>
                {hasReachedVoiceLimit && (
                  <p className="mt-3 text-amber-600 text-sm">
                    Delete existing voices to upload more
                  </p>
                )}
              </div>
            </div>
          </Card>
        </TabsContent>
        
        {/* Record Tab Content */}
        <TabsContent value="record">
          <Card className="p-6">
            {!recordingBlob ? (
              <div className="mb-4">
                {recordingStatus === 'inactive' ? (
                  <div className="flex flex-col items-center text-center">
                    <div className="bg-secondary/50 rounded-full p-8 mb-4">
                      <Mic className="h-12 w-12 text-primary" />
                    </div>
                    <div className="text-center mb-4">
                      <p className="text-sm mb-2 font-medium">Recording Tips:</p>
                      <ul className="text-xs text-muted-foreground text-left list-disc pl-5 space-y-1">
                        <li>Use a quiet environment with minimal background noise</li>
                        <li>Speak clearly at a consistent volume</li>
                        <li>Position yourself 6-12 inches from your microphone</li>
                        <li>Avoid plosive sounds (p, b, t) by speaking at an angle</li>
                      </ul>
                    </div>
                    <Button 
                      type="button" 
                      onClick={startRecording} 
                      size="lg" 
                      className="text-white px-6 flex items-center gap-2 mb-3 bg-primary" 
                      disabled={hasReachedVoiceLimit}
                    >
                      <Mic className="h-4 w-4" />
                      Start High-Quality Recording
                    </Button>
                    {hasReachedVoiceLimit ? (
                      <p className="text-sm text-amber-600 font-medium">
                        You've reached the limit of 5 voices. Delete existing voices to record more.
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Recording must be between 8-40 seconds</p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="bg-black/5 dark:bg-white/5 p-6 rounded-xl mb-4 text-center">
                      <div className="flex items-center justify-center gap-4 mb-4">
                        <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                        <span className="text-2xl font-mono tabular-nums">{recordingTime}s</span>
                        {recordingTime < 8 && (
                          <span className="text-sm text-amber-500 font-medium">
                            (Need {8 - recordingTime}s more)
                          </span>
                        )}
                      </div>
                      
                      <div className="mb-4">
                        <Progress value={recordingTime / 40 * 100} className="h-2" />
                      </div>
                      
                      <div className="flex justify-center gap-3">
                        {recordingStatus === 'paused' ? (
                          <Button 
                            type="button" 
                            onClick={resumeRecording} 
                            variant="outline" 
                            className="gap-2"
                          >
                            <Mic className="h-4 w-4" />
                            Resume
                          </Button>
                        ) : (
                          <Button 
                            type="button" 
                            onClick={pauseRecording} 
                            variant="outline" 
                            className="gap-2"
                          >
                            <Pause className="h-4 w-4" />
                            Pause
                          </Button>
                        )}
                        
                        <Button 
                          type="button" 
                          onClick={stopRecording} 
                          variant="secondary" 
                          className="gap-2"
                        >
                          <Square className="h-4 w-4" />
                          Stop Recording
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-card rounded-lg overflow-hidden p-4">
                <div className="flex flex-col mb-3">
                  <h4 className="text-sm font-medium mb-2">Review Recording</h4>
                  <div className="bg-secondary/30 p-3 rounded-md mb-2">
                    <audio src={URL.createObjectURL(recordingBlob)} className="w-full" controls />
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {recordingTime} seconds {recordingTime < 8 ? "(too short)" : ""}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {(recordingBlob.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <Button 
                    type="button" 
                    onClick={discardRecording} 
                    variant="outline" 
                    className="gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Discard
                  </Button>
                  <Button 
                    type="button" 
                    onClick={saveRecording} 
                    className="bg-primary hover:bg-primary/90 text-white gap-2" 
                    disabled={recordingTime < 8 || isProcessing}
                  >
                    {isProcessing ? (
                      <div className="flex items-center">
                        <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-opacity-50 border-t-white rounded-full"></div>
                        Processing...
                      </div>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        Save High-Quality WAV
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Upload progress indicators */}
      {Object.keys(uploadingVoices).length > 0 && (
        <div className="mt-4 space-y-3">
          <h4 className="text-sm font-medium">Uploading voice files...</h4>
          {Object.keys(uploadingVoices).map(id => (
            <div key={id} className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Uploading</span>
                <span>{uploadingVoices[id]}%</span>
              </div>
              <Progress value={uploadingVoices[id]} className="h-2" />
            </div>
          ))}
        </div>
      )}

      {/* Uploaded Files Display */}
      {voiceFiles.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-4">Your Voice Files ({voiceFiles.length}/5)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {voiceFiles.map(voice => (
              <Card 
                key={voice.id} 
                className={`p-4 animate-zoom-in ${selectedVoice?.id === voice.id ? 'ring-2 ring-primary' : ''}`}
              >
                <div className="mb-3 bg-secondary rounded-md overflow-hidden relative p-3">
                  <audio src={voice.url} className="w-full" controls />
                </div>
                <div className="flex justify-between items-center">
                  <div className="truncate mr-2">
                    <p className="font-medium truncate">{voice.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(voice.size / (1024 * 1024)).toFixed(2)} MB
                      {voice.duration && ` • ${Math.round(voice.duration)}s`}
                    </p>
                  </div>
                  <div className="flex">
                    <button 
                      type="button" 
                      onClick={() => handleSelectVoice(voice)} 
                      className={`p-1.5 rounded-full mr-1 transition-colors ${
                        selectedVoice?.id === voice.id 
                          ? 'bg-primary text-primary-foreground' 
                          : 'hover:bg-secondary-foreground/10'
                      }`} 
                      title="Select as target voice"
                    >
                      <Check 
                        className={`h-4 w-4 ${
                          selectedVoice?.id === voice.id ? 'text-white' : 'text-muted-foreground'
                        }`} 
                      />
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleRemoveVoiceFile(voice.id)} 
                      className="p-1.5 rounded-full hover:bg-secondary-foreground/10 transition-colors"
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default VoiceUpload;
