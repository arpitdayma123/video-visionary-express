
import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useScriptPreview } from '@/hooks/useScriptPreview';
import { User } from '@supabase/supabase-js';
import ScriptPreviewContent from './script/ScriptPreviewContent';
import { useAuth } from '@/contexts/AuthContext';

interface ScriptPreviewProps {
  scriptOption: string;
  onScriptLoaded: (script: string) => void;
}

const ScriptPreview: React.FC<ScriptPreviewProps> = ({
  scriptOption,
  onScriptLoaded
}) => {
  const { user } = useAuth();
  const [hasGeneratedPreview, setHasGeneratedPreview] = useState(false);
  
  const {
    isLoading,
    script,
    wordCount,
    isPreviewVisible,
    setIsPreviewVisible,
    handleScriptChange,
    handleGeneratePreview,
  } = useScriptPreview(user, (generatedScript: string) => {
    onScriptLoaded(generatedScript);
    setHasGeneratedPreview(true);
  }, scriptOption);

  const handlePreviewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleGeneratePreview();
    setIsPreviewVisible(true);
  };

  return (
    <div className="mt-6">
      <Button
        type="button"
        onClick={handlePreviewClick}
        disabled={isLoading}
        className="mb-4"
      >
        Generate Script Preview
      </Button>

      {isPreviewVisible && (
        <ScriptPreviewContent
          isLoading={isLoading}
          script={script}
          wordCount={wordCount}
          onScriptChange={handleScriptChange}
          onRegenerateScript={handleGeneratePreview}
        />
      )}
    </div>
  );
};

export default ScriptPreview;
