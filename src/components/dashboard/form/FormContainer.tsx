
import React from 'react';
import { useToast } from '@/hooks/use-toast';
import { UploadedFile } from '@/hooks/useDashboardData';
import { supabase } from '@/integrations/supabase/client';

interface FormContainerProps {
  children: React.ReactNode;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}

const FormContainer: React.FC<FormContainerProps> = ({ children, onSubmit }) => {
  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      e.currentTarget !== e.target ||
      (target.tagName === 'BUTTON' && !target.textContent?.includes('Generate Video'))
    ) {
      e.stopPropagation();
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-12"
      onClick={handleClick}
    >
      {children}
    </form>
  );
};

export default FormContainer;
