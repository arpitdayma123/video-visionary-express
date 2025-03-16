
import React, { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Mic, Upload, Trash2, Check, Square, Pause } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

type UploadedFile = {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  duration?: number;
};

interface VoiceRecordingProps {
  userId: string | undefined;
  voiceFiles: UploadedFile[];
  setVoiceFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
  selectedVoice: UploadedFile | null;
  setSelectedVoice: React.Dispatch<React.SetStateAction<UploadedFile | null>>;
  updateProfile: (updates: any) => Promise<void>;
}

const VoiceRecording: React.FC<VoiceRecordingProps> = ({
  userId,
  voiceFiles,
  setVoiceFiles,
  selectedVoice,
  setSelectedVoice,
  updateProfile
}) => {
  const { toast } = useToast();
  const [isDraggingVoice, setIsDraggingVoice] = useState(false);
  const [uploadingVoices, setUploadingVoices] = useState<{[key: string]: number}>({});
  
  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  // Function to get media duration
  const getMediaDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const element = file.type.startsWith('video/') 
        ? document.createElement('video') 
        : document.createElement('audio');
        
      element.preload = 'metadata';
      
      element.onloadedmetadata = () => {
        window.URL.revokeObjectURL(element.src);
        resolve(element.duration);
      };
      
      element.src = URL.createObjectURL(file);
    });
  };

  const handleVoiceUpload = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>) => {
    if (!userId) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to upload files.",
        variant: "destructive"
      });
      return;
    }
    
    let files: FileList | null = null;
    if ('dataTransfer' in e) {
      e.preventDefault();
      files = e.dataTransfer.files;
      setIsDraggingVoice(false);
    } else if ('target' in e && 'files' in e.target) {
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
      const uploadingProgress = {
        ...uploadingVoices
      };
      
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
          const {
            data: uploadData,
            error: uploadError
          } = await supabase.storage.from('creator_files').upload(filePath, file);
          clearInterval(progressInterval);
          if (uploadError) throw uploadError;
          progressCallback(100);
          const {
            data: urlData
          } = supabase.storage.from('creator_files').getPublicUrl(filePath);
          
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
              const updated = {
                ...current
              };
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

  // Voice recording functions with improved quality
  const startRecording = async () => {
    try {
      // Request high-quality audio stream with improved settings
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 48000, // Higher sample rate for better quality
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      audioChunksRef.current = [];
      
      // Setup MediaRecorder with better options for high-quality audio
      const options = { 
        mimeType: 'audio/webm;codecs=opus', // Opus codec for better compression quality
        audioBitsPerSecond: 128000 // Higher bitrate for better quality
      };
      
      // Check if the browser supports the specified MIME type
      if (MediaRecorder.isTypeSupported(options.mimeType)) {
        mediaRecorderRef.current = new MediaRecorder(stream, options);
      } else {
        // Fallback to default settings if not supported
        console.log('Codec not supported, using default settings');
        mediaRecorderRef.current = new MediaRecorder(stream);
      }
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      
      mediaRecorderRef.current.onstop = async () => {
        // Combine audio chunks into a single blob with appropriate audio type
        const audioBlob = new Blob(audioChunksRef.current, { 
          type: 'audio/webm;codecs=opus' 
        });
        
        setRecordingBlob(audioBlob);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
        
        // Reset timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
      
      // Start recording with a longer timeslice for better quality chunks
      mediaRecorderRef.current.start(1000);
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          
          // Auto-stop recording if it reaches 40 seconds
          if (newTime >= 40) {
            stopRecording();
          }
          
          return newTime;
        });
      }, 1000);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Recording Failed",
        description: "Could not access microphone. Please check your browser permissions.",
        variant: "destructive"
      });
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
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
      
      const uploadId = uuidv4();
      setUploadingVoices(prev => ({ ...prev, [uploadId]: 0 }));
      
      // Create file from blob with higher quality audio file extension
      const fileName = `recorded_voice_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`;
      const filePath = `voices/${userId}/${uuidv4()}.webm`;
      
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
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('creator_files')
        .upload(filePath, recordingBlob);
        
      clearInterval(progressInterval);
      
      if (uploadError) throw uploadError;
      
      setUploadingVoices(prev => ({ ...prev, [uploadId]: 100 }));
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('creator_files')
        .getPublicUrl(filePath);
      
      // Create voice file object
      const newVoiceFile = {
        id: uuidv4(),
        name: fileName,
        size: recordingBlob.size,
        type: 'audio/webm;codecs=opus',
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
        description: `Successfully saved high quality voice recording (${recordingTime} seconds).`
      });
      
    } catch (error) {
      console.error('Error saving recording:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save voice recording.",
        variant: "destructive"
      });
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
      if (selectedVoice && selectedVoice.id === id) {
        setSelectedVoice(null);
        await updateProfile({
          selected_voice: null
        });
      }
      try {
        const urlParts = fileToRemove.url.split('/');
        const filePath = urlParts.slice(urlParts.indexOf('creator_files') + 1).join('/');
        await supabase.storage.from('creator_files').remove([filePath]);
      } catch (storageError) {
        console.warn('Could not remove file from storage:', storageError);
      }
      const updatedVoiceFiles = voiceFiles.filter(file => file.id !== id);
      setVoiceFiles(updatedVoiceFiles);
      await updateProfile({
        voice_files: updatedVoiceFiles
      });
      toast({
        title: "Voice file removed",
        description: "Successfully removed the voice file."
      });
    } catch (error) {
      console.error('Error removing voice file:', error);
      toast({
        title: "Removal Failed",
        description: "Failed to remove the voice file.",
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

  // Format seconds to mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="mb-6 p-6">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <Mic className="w-5 h-5" /> Target Voice
      </h2>
      <p className="text-muted-foreground mb-6">
        Upload or record a voice sample that you want to emulate. We'll use it to create content with a similar voice.
      </p>
      
      {/* Voice recording section */}
      <div className="mb-6 p-6 bg-muted/30 rounded-lg">
        <h3 className="text-lg font-medium mb-4">Record Your Voice</h3>
        
        {!recordingBlob && (
          <div className="flex flex-col items-center justify-center gap-4">
            {!isRecording ? (
              <Button
                className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600"
                onClick={startRecording}
              >
                <Mic className="h-6 w-6" />
              </Button>
            ) : (
              <Button
                className="h-16 w-16 rounded-full bg-gray-500 hover:bg-gray-600"
                onClick={stopRecording}
              >
                <Square className="h-6 w-6" />
              </Button>
            )}
            
            {isRecording && (
              <div className="flex flex-col items-center">
                <div className="animate-pulse text-red-500 text-lg font-medium mb-1">
                  Recording...
                </div>
                <div className="text-lg font-mono">{formatTime(recordingTime)}</div>
              </div>
            )}
            
            {!isRecording && (
              <p className="text-center text-muted-foreground">
                Click to start recording. Speak for 8-40 seconds.
              </p>
            )}
          </div>
        )}
        
        {recordingBlob && (
          <div className="space-y-4">
            <div className="flex justify-center items-center gap-2">
              <div className="text-lg font-medium">Recording completed: {formatTime(recordingTime)}</div>
            </div>
            
            <audio className="w-full" controls src={URL.createObjectURL(recordingBlob)} />
            
            <div className="flex justify-center gap-4 mt-4">
              <Button variant="outline" onClick={discardRecording}>
                Discard
              </Button>
              <Button onClick={saveRecording}>
                Save Recording
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {/* Drag and drop area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 mb-6 text-center ${
          isDraggingVoice ? 'border-primary bg-primary/5' : 'border-border'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingVoice(true);
        }}
        onDragLeave={() => setIsDraggingVoice(false)}
        onDrop={handleVoiceUpload}
      >
        <Upload className="w-10 h-10 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-medium mb-2">Drag and drop your voice file here</h3>
        <p className="text-muted-foreground mb-4">
          MP3 or WAV format, max 8MB, duration between 8-40 seconds
        </p>
        <input
          type="file"
          id="voice-upload"
          className="hidden"
          accept="audio/mpeg,audio/wav"
          multiple
          onChange={handleVoiceUpload}
        />
        <Button variant="outline" onClick={() => document.getElementById('voice-upload')?.click()}>
          Browse Files
        </Button>
      </div>
      
      {/* Uploaded voice files section */}
      {voiceFiles.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium mb-2">Your Voice Files</h3>
          {voiceFiles.map((voice) => (
            <div
              key={voice.id}
              className={`flex items-center justify-between p-4 rounded-lg ${
                selectedVoice?.id === voice.id ? 'bg-primary/10 border border-primary' : 'bg-muted/40'
              }`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Mic className="w-8 h-8 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{voice.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(voice.size / (1024 * 1024)).toFixed(2)} MB • {voice.duration && Math.round(voice.duration)}s
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedVoice?.id !== voice.id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectVoice(voice)}
                  >
                    Select
                  </Button>
                )}
                {selectedVoice?.id === voice.id && (
                  <div className="flex items-center gap-1 text-primary">
                    <Check className="w-4 h-4" />
                    <span className="text-sm">Selected</span>
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveVoiceFile(voice.id)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Display uploading progress */}
      {Object.keys(uploadingVoices).length > 0 && (
        <div className="mt-4 space-y-4">
          {Object.entries(uploadingVoices).map(([id, progress]) => (
            <div key={id} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading voice file...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default VoiceRecording;
