
import React, { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { useToast } from '@/hooks/use-toast';
import { Plus, Upload, Trash2, Video, Mic, Briefcase, User } from 'lucide-react';
import { Card } from '@/components/ui/card';

type UploadedFile = {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
};

type CompetitorUsername = {
  id: string;
  username: string;
};

const niches = [
  "Fashion & Style",
  "Beauty & Makeup",
  "Fitness & Health",
  "Food & Cooking",
  "Travel & Adventure",
  "Lifestyle",
  "Technology",
  "Business & Entrepreneurship",
  "Education & Learning",
  "Entertainment",
  "Gaming",
  "Art & Design",
  "Photography",
  "DIY & Crafts",
  "Parenting",
  "Music",
  "Sports",
  "Pets & Animals",
  "Motivational & Inspirational",
  "Comedy & Humor"
];

const Dashboard = () => {
  const { toast } = useToast();
  const [videos, setVideos] = useState<UploadedFile[]>([]);
  const [voiceFiles, setVoiceFiles] = useState<UploadedFile[]>([]);
  const [selectedNiches, setSelectedNiches] = useState<string[]>([]);
  const [competitors, setCompetitors] = useState<CompetitorUsername[]>([]);
  const [newCompetitor, setNewCompetitor] = useState('');
  const [isDraggingVideo, setIsDraggingVideo] = useState(false);
  const [isDraggingVoice, setIsDraggingVoice] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [resultVideoUrl, setResultVideoUrl] = useState<string | null>(null);

  // Handle video file uploads
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>) => {
    let files: FileList | null = null;
    
    if ('dataTransfer' in e) {
      e.preventDefault();
      files = e.dataTransfer.files;
      setIsDraggingVideo(false);
    } else if (e.target.files) {
      files = e.target.files;
    }

    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      
      // Validate file size and type
      const invalidFiles = fileArray.filter(file => {
        const isValidType = file.type === 'video/mp4';
        const isValidSize = file.size <= 30 * 1024 * 1024; // 30MB
        return !isValidType || !isValidSize;
      });

      if (invalidFiles.length > 0) {
        toast({
          title: "Invalid files detected",
          description: "Please upload MP4 videos under 30MB.",
          variant: "destructive"
        });
        return;
      }

      // Check total number of videos
      if (videos.length + fileArray.length > 5) {
        toast({
          title: "Too many videos",
          description: "You can upload a maximum of 5 videos.",
          variant: "destructive"
        });
        return;
      }

      // Process valid files
      const newVideos = fileArray.map(file => ({
        id: Math.random().toString(36).substring(2, 9),
        name: file.name,
        size: file.size,
        type: file.type,
        url: URL.createObjectURL(file)
      }));

      setVideos(prev => [...prev, ...newVideos]);
      toast({
        title: "Videos uploaded",
        description: `Successfully uploaded ${newVideos.length} video${newVideos.length > 1 ? 's' : ''}.`
      });
    }
  };

  // Handle voice file uploads
  const handleVoiceUpload = (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>) => {
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
      
      // Validate file size and type
      const invalidFiles = fileArray.filter(file => {
        const isValidType = file.type === 'audio/mpeg' || file.type === 'audio/wav';
        const isValidSize = file.size <= 8 * 1024 * 1024; // 8MB
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

      // Check total number of voice files
      if (voiceFiles.length + fileArray.length > 5) {
        toast({
          title: "Too many voice files",
          description: "You can upload a maximum of 5 voice files.",
          variant: "destructive"
        });
        return;
      }

      // Process valid files
      const newVoiceFiles = fileArray.map(file => ({
        id: Math.random().toString(36).substring(2, 9),
        name: file.name,
        size: file.size,
        type: file.type,
        url: URL.createObjectURL(file)
      }));

      setVoiceFiles(prev => [...prev, ...newVoiceFiles]);
      toast({
        title: "Voice files uploaded",
        description: `Successfully uploaded ${newVoiceFiles.length} voice file${newVoiceFiles.length > 1 ? 's' : ''}.`
      });
    }
  };

  // Handle niche selection
  const handleNicheChange = (niche: string) => {
    setSelectedNiches(prev => 
      prev.includes(niche) 
        ? prev.filter(n => n !== niche) 
        : [...prev, niche]
    );
  };

  // Handle adding competitor usernames
  const handleAddCompetitor = () => {
    if (newCompetitor.trim() === '') return;
    
    if (competitors.length >= 15) {
      toast({
        title: "Maximum competitors reached",
        description: "You can add up to 15 competitor usernames.",
        variant: "destructive"
      });
      return;
    }

    const newCompetitorObj = {
      id: Math.random().toString(36).substring(2, 9),
      username: newCompetitor.trim()
    };

    setCompetitors(prev => [...prev, newCompetitorObj]);
    setNewCompetitor('');
  };

  // Handle removing a competitor
  const handleRemoveCompetitor = (id: string) => {
    setCompetitors(prev => prev.filter(comp => comp.id !== id));
  };

  // Handle removing a video
  const handleRemoveVideo = (id: string) => {
    setVideos(prev => prev.filter(video => video.id !== id));
  };

  // Handle removing a voice file
  const handleRemoveVoiceFile = (id: string) => {
    setVoiceFiles(prev => prev.filter(file => file.id !== id));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (videos.length === 0 || voiceFiles.length === 0 || selectedNiches.length === 0 || competitors.length === 0) {
      toast({
        title: "Incomplete form",
        description: "Please fill in all required fields before submitting.",
        variant: "destructive"
      });
      return;
    }

    // Start processing
    setIsProcessing(true);
    
    // Simulate progress for demonstration
    const interval = setInterval(() => {
      setProcessingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 800);

    // Simulate API call to webhook
    try {
      // In a real implementation, this would be an actual API call
      await new Promise(resolve => setTimeout(resolve, 8000));
      
      // Simulate successful response
      setResultVideoUrl('https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4');
      
      toast({
        title: "Processing complete",
        description: "Your personalized video is ready to view!",
      });
    } catch (error) {
      toast({
        title: "Processing failed",
        description: "There was an error processing your request. Please try again.",
        variant: "destructive"
      });
    } finally {
      clearInterval(interval);
      setProcessingProgress(100);
      setTimeout(() => {
        setIsProcessing(false);
      }, 500);
    }
  };

  // Determine if form is complete
  const isFormComplete = videos.length > 0 && voiceFiles.length > 0 && selectedNiches.length > 0 && competitors.length > 0;

  return (
    <MainLayout title="Creator Dashboard" subtitle="Upload your content and create personalized videos">
      <div className="section-container py-12">
        <form onSubmit={handleSubmit} className="space-y-12">
          {/* Video Upload Section */}
          <section className="animate-fade-in">
            <div className="flex items-center mb-4">
              <Video className="mr-2 h-5 w-5 text-primary" />
              <h2 className="text-2xl font-medium">Video Upload</h2>
            </div>
            <p className="text-muted-foreground mb-6">Upload up to 5 MP4 videos (max 30MB each)</p>
            
            <div 
              className={`file-drop-area p-8 ${isDraggingVideo ? 'active' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingVideo(true);
              }}
              onDragLeave={() => setIsDraggingVideo(false)}
              onDrop={handleVideoUpload}
            >
              <div className="flex flex-col items-center justify-center text-center">
                <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Drag and drop your videos here</h3>
                <p className="text-muted-foreground mb-4">Or click to browse files</p>
                <label className="button-hover-effect px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer">
                  <input 
                    type="file" 
                    accept="video/mp4" 
                    multiple 
                    className="hidden" 
                    onChange={handleVideoUpload}
                  />
                  Select Videos
                </label>
              </div>
            </div>

            {/* Video Preview */}
            {videos.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-4">Uploaded Videos ({videos.length}/5)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {videos.map(video => (
                    <Card key={video.id} className="p-4 animate-zoom-in">
                      <div className="aspect-video mb-3 bg-secondary rounded-md overflow-hidden">
                        <video src={video.url} className="w-full h-full object-cover" controls />
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="truncate mr-2">
                          <p className="font-medium truncate">{video.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(video.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                        <button 
                          type="button"
                          onClick={() => handleRemoveVideo(video.id)}
                          className="p-1.5 rounded-full hover:bg-secondary-foreground/10 transition-colors"
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Voice Upload Section */}
          <section className="animate-fade-in animation-delay-100">
            <div className="flex items-center mb-4">
              <Mic className="mr-2 h-5 w-5 text-primary" />
              <h2 className="text-2xl font-medium">Voice Upload</h2>
            </div>
            <p className="text-muted-foreground mb-6">Upload up to 5 MP3 or WAV files (max 8MB each)</p>
            
            <div 
              className={`file-drop-area p-8 ${isDraggingVoice ? 'active' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingVoice(true);
              }}
              onDragLeave={() => setIsDraggingVoice(false)}
              onDrop={handleVoiceUpload}
            >
              <div className="flex flex-col items-center justify-center text-center">
                <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Drag and drop your voice files here</h3>
                <p className="text-muted-foreground mb-4">Or click to browse files</p>
                <label className="button-hover-effect px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer">
                  <input 
                    type="file" 
                    accept="audio/mpeg,audio/wav" 
                    multiple 
                    className="hidden" 
                    onChange={handleVoiceUpload}
                  />
                  Select Voice Files
                </label>
              </div>
            </div>

            {/* Voice File Preview */}
            {voiceFiles.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-4">Uploaded Voice Files ({voiceFiles.length}/5)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {voiceFiles.map(file => (
                    <Card key={file.id} className="p-4 animate-zoom-in">
                      <div className="bg-secondary rounded-md p-4 mb-3 flex justify-center items-center">
                        <audio src={file.url} className="w-full" controls />
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="truncate mr-2">
                          <p className="font-medium truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(file.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                        <button 
                          type="button"
                          onClick={() => handleRemoveVoiceFile(file.id)}
                          className="p-1.5 rounded-full hover:bg-secondary-foreground/10 transition-colors"
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Niche Selection */}
          <section className="animate-fade-in animation-delay-200">
            <div className="flex items-center mb-4">
              <Briefcase className="mr-2 h-5 w-5 text-primary" />
              <h2 className="text-2xl font-medium">Niche Selection</h2>
            </div>
            <p className="text-muted-foreground mb-6">Select one or more niches that match your content</p>

            <div className="flex flex-wrap gap-2">
              {niches.map(niche => (
                <button
                  key={niche}
                  type="button"
                  onClick={() => handleNicheChange(niche)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                    selectedNiches.includes(niche)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  {niche}
                </button>
              ))}
            </div>

            {selectedNiches.length > 0 && (
              <p className="mt-4 text-sm text-muted-foreground">
                Selected: {selectedNiches.length} niche{selectedNiches.length !== 1 ? 's' : ''}
              </p>
            )}
          </section>

          {/* Competitor Usernames */}
          <section className="animate-fade-in animation-delay-300">
            <div className="flex items-center mb-4">
              <User className="mr-2 h-5 w-5 text-primary" />
              <h2 className="text-2xl font-medium">Competitor Usernames</h2>
            </div>
            <p className="text-muted-foreground mb-6">Add up to 15 Instagram competitor usernames</p>

            <div className="flex mb-4">
              <input
                type="text"
                value={newCompetitor}
                onChange={(e) => setNewCompetitor(e.target.value)}
                placeholder="Enter Instagram username"
                className="flex-1 px-3 py-2 border border-input rounded-l-lg focus:outline-none focus:ring-2 focus:ring-primary"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCompetitor();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddCompetitor}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-r-lg hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>

            {/* Display competitors */}
            {competitors.length > 0 && (
              <div className="mt-4">
                <h3 className="text-lg font-medium mb-4">Added Competitors ({competitors.length}/15)</h3>
                <div className="flex flex-wrap gap-2">
                  {competitors.map(competitor => (
                    <div 
                      key={competitor.id} 
                      className="inline-flex items-center bg-secondary rounded-full pl-3 pr-1 py-1 animate-zoom-in"
                    >
                      <span className="text-sm">@{competitor.username}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCompetitor(competitor.id)}
                        className="ml-2 p-1 rounded-full hover:bg-secondary-foreground/10 transition-colors"
                      >
                        <Trash2 className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Result Video Section */}
          {resultVideoUrl && (
            <section className="animate-fade-in">
              <div className="flex items-center mb-4">
                <Video className="mr-2 h-5 w-5 text-primary" />
                <h2 className="text-2xl font-medium">Your Personalized Video</h2>
              </div>
              <p className="text-muted-foreground mb-6">Your personalized video is ready to download and share</p>
              
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="aspect-video w-full">
                  <video src={resultVideoUrl} className="w-full h-full object-cover" controls autoPlay />
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-medium mb-2">Personalized Content</h3>
                  <p className="text-muted-foreground mb-4">
                    This video has been optimized based on your uploads and selected parameters.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <a 
                      href={resultVideoUrl} 
                      download="personalized-video.mp4"
                      className="button-hover-effect px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      Download Video
                    </a>
                    <button
                      type="button"
                      className="px-4 py-2 rounded-lg border border-input hover:bg-secondary transition-colors"
                      onClick={() => {
                        navigator.clipboard.writeText(resultVideoUrl);
                        toast({
                          title: "Link copied",
                          description: "Video link copied to clipboard",
                        });
                      }}
                    >
                      Copy Link
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Submit Button */}
          <div className="pt-6 animate-fade-in animation-delay-400">
            {isProcessing ? (
              <div className="space-y-4">
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-500 ease-out"
                    style={{ width: `${processingProgress}%` }}
                  ></div>
                </div>
                <p className="text-center text-muted-foreground">
                  Processing your content... {processingProgress}%
                </p>
              </div>
            ) : (
              <button
                type="submit"
                disabled={!isFormComplete}
                className={`w-full py-3 rounded-lg text-center transition-all ${
                  isFormComplete
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90 button-hover-effect'
                    : 'bg-secondary text-muted-foreground cursor-not-allowed'
                }`}
              >
                Create Personalized Video
              </button>
            )}
          </div>
        </form>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
