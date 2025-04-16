import React, { useState, useRef, useEffect } from 'react';
import { Upload, Trash2, Check, Mic, FileAudio, AlertTriangle, Scissors } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { uploadToBunny, deleteFromBunny, getPathFromBunnyUrl } from '@/integrations/bunny/client';
import AudioRecorder, { RecordingStatus } from '@/utils/audioRecorder';
import AudioTrimmer from './AudioTrimmer';
import LoadingOverlay from './audio/LoadingOverlay';

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
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>('inactive');
  const [recordingTime, setRecordingTime] = useState(0);
  const [isLiveRecording, setIsLiveRecording] = useState(false);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showTrimmer, setShowTrimmer] = useState(false);

  // Check if the maximum limit of voice files has been reached
  const hasReachedVoiceLimit = voiceFiles.length >= 5;

  // Initialize audio recorder
  useEffect(() => {
    if (isLiveRecording && !recorderRef.current) {
      recorderRef.current = new AudioRecorder({
        onStatusChange: (status) => setRecordingStatus(status),
        onTimeUpdate: (seconds) => setRecordingTime(seconds),
        onError: (error) => {
          console.error('Recording error:', error);
          toast({
            title: "Recording Error",
            description: error.message,
            variant: "destructive"
          });
          setIsLiveRecording(false);
        }
      });
    }
    
    return () => {
      if (recorderRef.current && recordingStatus !== 'inactive') {
        recorderRef.current.stop().catch(console.error);
      }
    };
  }, [isLiveRecording, toast, recordingStatus]);

  // Start recording
  const startRecording = async (e: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent form submission
    e.preventDefault();
    e.stopPropagation();
    
    try {
      setIsLiveRecording(true);
      setRecordingTime(0);
      
      if (!recorderRef.current) {
        recorderRef.current = new AudioRecorder({
          onStatusChange: (status) => setRecordingStatus(status),
          onTimeUpdate: (seconds) => setRecordingTime(seconds),
          onError: (error) => {
            console.error('Recording error:', error);
            toast({
              title: "Recording Error",
              description: error.message,
              variant: "destructive"
            });
            setIsLiveRecording(false);
          }
        });
      }
      
      await recorderRef.current.start();
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast({
        title: "Recording Failed",
        description: "Could not access your microphone. Please check permissions.",
        variant: "destructive"
      });
      setIsLiveRecording(false);
    }
  };

  // Stop recording
  const stopRecording = async (e: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent form submission
    e.preventDefault();
    e.stopPropagation();
    
    if (recorderRef.current && recordingStatus === 'recording') {
      try {
        const blob = await recorderRef.current.stop();
        setRecordedBlob(blob);
        
        // Create a File object from the blob
        const fileName = `recorded_voice_${new Date().toISOString().replace(/:/g, '-')}.wav`;
        const file = new File([blob], fileName, { type: 'audio/wav' });
        
        // Set the selected file for preview/trimming
        setSelectedFile(file);
        setShowTrimmer(true);
        
        toast({
          title: "Recording Complete",
          description: "Your voice has been recorded. You can now trim it before uploading."
        });
      } catch (error) {
        console.error('Error stopping recording:', error);
        toast({
          title: "Recording Error",
          description: "Failed to save your recording.",
          variant: "destructive"
        });
      } finally {
        setIsLiveRecording(false);
      }
    }
  };

  // Function to get audio duration
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

  // File upload handler now just prepares the file for preview/trimming
  const handleVoiceUpload = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>) => {
    // Prevent default actions and form submission
    e.preventDefault();
    e.stopPropagation();
    
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
      
      // Just select the first file for preview/trimming
      setSelectedFile(fileArray[0]);
      setShowTrimmer(true);
    }
  };

  // New function to handle saving and uploading the trimmed audio
  const handleSaveTrimmedAudio = async (trimmedBlob: Blob, duration: number) => {
    if (!selectedFile || !userId) return;
    
    try {
      // Create a filename for the trimmed audio
      const originalName = selectedFile.name;
      const fileExt = originalName.split('.').pop() || 'wav';
      const trimmedName = `trimmed_${originalName}`;
      
      const uploadId = uuidv4();
      const fileId = uuidv4();
      const fileName = `${fileId}.${fileExt}`;
      const filePath = `voices/${userId}/${fileName}`;
      
      // Set up progress tracking
      const uploadingProgress = { ...uploadingVoices };
      uploadingProgress[uploadId] = 0;
      setUploadingVoices(uploadingProgress);
      
      const progressCallback = (progress: number) => {
        setUploadingVoices(current => ({
          ...current,
          [uploadId]: progress
        }));
      };
      
      progressCallback(1);
      
      console.log(`Uploading trimmed voice file to BunnyCDN: ${filePath}`);
      
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
      
      // Upload to BunnyCDN
      const bunnyUrl = await uploadToBunny(
        new File([trimmedBlob], trimmedName, { type: 'audio/wav' }), 
        filePath
      );
      
      clearInterval(progressInterval);
      progressCallback(100);
      
      console.log('Voice file uploaded to BunnyCDN:', bunnyUrl);
      
      // Create new voice file object
      const newVoiceFile = {
        id: fileId,
        name: trimmedName,
        size: trimmedBlob.size,
        type: 'audio/wav',
        url: bunnyUrl,
        duration: duration
      };
      
      const newVoiceFiles = [...voiceFiles, newVoiceFile];
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
        description: `Successfully uploaded ${trimmedName} (${Math.round(duration)} seconds).`
      });
      
      // Important: Only update the profile with the JSON data, not the actual File object
      await updateProfile({
        voice_files: newVoiceFiles.map(voice => ({
          id: voice.id,
          name: voice.name,
          size: voice.size,
          type: voice.type,
          url: voice.url,
          duration: voice.duration
        })),
        selected_voice: {
          id: newVoiceFile.id,
          name: newVoiceFile.name,
          size: newVoiceFile.size,
          type: newVoiceFile.type,
          url: newVoiceFile.url,
          duration: newVoiceFile.duration
        }
      });
      
      // Reset the UI state
      setShowTrimmer(false);
      setSelectedFile(null);
      setRecordedBlob(null);
      
    } catch (error) {
      console.error('Error uploading trimmed voice file:', error);
      toast({
        title: "Upload Failed",
        description: `Failed to upload the trimmed voice file.`,
        variant: "destructive"
      });
    }
  };

  // Cancel trimming and reset the UI state
  const handleCancelTrim = (e?: React.MouseEvent) => {
    // Add optional event parameter
    if (e) {
      // Prevent form submission if event is provided
      e.preventDefault();
      e.stopPropagation();
    }
    
    setShowTrimmer(false);
    setSelectedFile(null);
    setRecordedBlob(null);
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
      
      // Delete the file from BunnyCDN
      try {
        // Get path from BunnyCDN URL
        const bunnyPath = getPathFromBunnyUrl(fileToRemove.url);
        
        if (bunnyPath) {
          console.log('Removing voice file from BunnyCDN:', bunnyPath);
          await deleteFromBunny(bunnyPath);
          console.log('Successfully deleted voice file from BunnyCDN');
        } else {
          console.warn('Could not determine correct path from URL:', fileToRemove.url);
        }
      } catch (storageError) {
        console.warn('Error removing voice file from storage:', storageError);
        // Continue with UI removal even if storage removal fails
      }
      
      // Update voice files state
      const updatedVoiceFiles = voiceFiles.filter(file => file.id !== id);
      setVoiceFiles(updatedVoiceFiles);
      
      // Important: Only update the profile with the JSON data, not the actual File objects
      await updateProfile({
        voice_files: updatedVoiceFiles.map(voice => ({
          id: voice.id,
          name: voice.name,
          size: voice.size,
          type: voice.type,
          url: voice.url,
          duration: voice.duration
        }))
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
      
      // Important: Only update the profile with the JSON data, not the actual File object
      await updateProfile({
        selected_voice: {
          id: voice.id,
          name: voice.name,
          size: voice.size,
          type: voice.type,
          url: voice.url,
          duration: voice.duration
        }
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
    <section className="animate-fade-in" onClick={e => e.stopPropagation()}>
      {showTrimmer && selectedFile ? (
        <AudioTrimmer 
          audioFile={selectedFile} 
          onSave={handleSaveTrimmedAudio}
          onCancel={handleCancelTrim}
        />
      ) : (
        <>
          <div className="flex items-center mb-4">
            <Mic className="mr-2 h-5 w-5 text-primary" />
            <h2 className="text-2xl font-medium">Voice Upload</h2>
          </div>
          <p className="text-muted-foreground mb-6">Upload your voice (8-40 seconds) and select one voice to continue</p>
          
          {/* Add warning alert about supported languages */}
          <Alert variant="warning" className="mb-6 border-amber-500 bg-amber-500/10">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-amber-600">
              <strong>Important:</strong> Please upload voice in a language we support. We currently support the following languages: English, Japanese, Chinese, French, and German.
              <br /><br />
              <strong>Voice Recording Tips:</strong>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Ensure a clear, professional-sounding recording</li>
                <li>Speak continuously without long pauses</li>
                <li>Maintain a consistent volume and tone</li>
                <li>Minimize background noise</li>
                <li>Avoid filler words like "um" or "ah"</li>
                <li>Speak naturally and confidently</li>
              </ul>
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
                <span>Record Using Your Device</span>
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
                    <p className="text-muted-foreground mb-4">Max 8MB, you'll be able to trim it next</p>
                    <label className={`button-hover-effect px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors ${
                      hasReachedVoiceLimit ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    }`}>
                      <input 
                        type="file" 
                        accept="audio/mpeg,audio/wav" 
                        className="hidden" 
                        onChange={handleVoiceUpload} 
                        disabled={hasReachedVoiceLimit} 
                      />
                      Select File
                    </label>
                    <p className="mt-3 text-sm text-muted-foreground">
                      Files will be previewed and can be trimmed before uploading
                    </p>
                    {hasReachedVoiceLimit && (
                      <p className="mt-3 text-amber-600 text-sm">
                        Delete existing voices to upload more
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            </TabsContent>
            
            {/* Record Tab Content - Now includes actual recording functionality */}
            <TabsContent value="record">
              <Card className="p-6">
                {isLiveRecording ? (
                  <div className="flex flex-col items-center text-center">
                    <div className={`bg-destructive/10 rounded-full p-8 mb-4 ${
                      recordingStatus === 'recording' ? 'animate-pulse' : ''
                    }`}>
                      <Mic className={`h-12 w-12 ${
                        recordingStatus === 'recording' ? 'text-destructive' : 'text-primary'
                      }`} />
                    </div>
                    
                    <h3 className="text-xl font-medium mb-4">
                      {recordingStatus === 'recording' ? 'Recording in Progress...' : 'Recording Paused'}
                    </h3>
                    
                    <div className="w-full max-w-md mb-6">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">
                          {Math.floor(recordingTime / 60).toString().padStart(2, '0')}:
                          {Math.floor(recordingTime % 60).toString().padStart(2, '0')}
                        </span>
                        <span className={`${
                          recordingTime < 8 ? 'text-destructive' : 
                          recordingTime > 40 ? 'text-destructive' : 'text-primary'
                        }`}>
                          {recordingTime < 8 ? `${8 - recordingTime}s more needed` : 
                           recordingTime > 40 ? 'Recording too long' : 'Good length'}
                        </span>
                      </div>
                      <Progress value={(recordingTime / 40) * 100} className="h-2" />
                    </div>
                    
                    <div className="flex gap-4">
                      <Button
                        variant="destructive"
                        onClick={stopRecording}
                        size="lg"
                        className="gap-2"
                      >
                        <Scissors className="h-4 w-4" />
                        Finish & Trim
                      </Button>
                    </div>
                    
                    <p className="mt-4 text-sm text-muted-foreground">
                      {recordingTime < 8 
                        ? "Keep recording until you reach at least 8 seconds" 
                        : recordingTime > 40 
                          ? "Your recording is too long, please finish now" 
                          : "Recording sounds good! You can finish when ready"}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center">
                    <div className="bg-secondary/50 rounded-full p-8 mb-4">
                      <Mic className="h-12 w-12 text-primary" />
                    </div>
                    
                    <h3 className="text-xl font-medium mb-4">Record Your Voice</h3>
                    
                    <div className="max-w-md mx-auto space-y-4 mb-6">
                      <p>Record your voice directly from your device:</p>
                      
                      <ul className="list-disc pl-5 space-y-2 text-muted-foreground text-left">
                        <li>Find a quiet environment</li>
                        <li>Speak clearly at a consistent volume</li>
                        <li>Record between 8-40 seconds</li>
                        <li>You'll be able to trim your recording afterward</li>
                      </ul>
                    </div>
                    
                    <Button 
                      onClick={startRecording}
                      variant="default"
                      size="lg"
                      className="gap-2"
                      disabled={hasReachedVoiceLimit}
                    >
                      <Mic className="h-4 w-4" />
                      Start Recording
                    </Button>
                    
                    {hasReachedVoiceLimit && (
                      <p className="mt-3 text-amber-600 text-sm">
                        Delete existing voices to record more
                      </p>
                    )}
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>

          {/* Upload progress indicators */}
          {Object.keys(uploadingVoices).length > 0 && (
            <div className="mt-4 space-y-3 relative">
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
              <LoadingOverlay message="Uploading voice to server..." />
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
        </>
      )}
    </section>
  );
};

export default VoiceUpload;
