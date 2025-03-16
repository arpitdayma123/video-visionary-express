
import React, { useState } from 'react';
import { User, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface CompetitorInputProps {
  competitors: string[];
  setCompetitors: React.Dispatch<React.SetStateAction<string[]>>;
  updateProfile: (updates: any) => Promise<void>;
}

const CompetitorInput = ({
  competitors,
  setCompetitors,
  updateProfile
}: CompetitorInputProps) => {
  const { toast } = useToast();
  const [newCompetitor, setNewCompetitor] = useState('');

  const handleAddCompetitor = async (e: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent form submission
    e.preventDefault();
    
    if (newCompetitor.trim() === '') return;
    if (competitors.length >= 15) {
      toast({
        title: "Maximum competitors reached",
        description: "You can add up to 15 competitor usernames.",
        variant: "destructive"
      });
      return;
    }
    try {
      const updatedCompetitors = [...competitors, newCompetitor.trim()];
      setCompetitors(updatedCompetitors);
      setNewCompetitor('');
      await updateProfile({
        competitors: updatedCompetitors
      });
    } catch (error) {
      console.error('Error adding competitor:', error);
      toast({
        title: "Update Failed",
        description: "Failed to add competitor username.",
        variant: "destructive"
      });
    }
  };

  const handleRemoveCompetitor = async (index: number) => {
    try {
      const updatedCompetitors = competitors.filter((_, i) => i !== index);
      setCompetitors(updatedCompetitors);
      await updateProfile({
        competitors: updatedCompetitors
      });
    } catch (error) {
      console.error('Error removing competitor:', error);
      toast({
        title: "Update Failed",
        description: "Failed to remove competitor username.",
        variant: "destructive"
      });
    }
  };

  return (
    <section className="animate-fade-in">
      <div className="flex items-center mb-4">
        <User className="mr-2 h-5 w-5 text-primary" />
        <h2 className="text-2xl font-medium">Add Competitor Usernames</h2>
      </div>
      <p className="text-muted-foreground mb-6">Add usernames of competitors or accounts with similar content (max 15)</p>
      
      <div className="flex items-center space-x-2 mb-4">
        <input
          type="text"
          value={newCompetitor}
          onChange={(e) => setNewCompetitor(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Enter username (without @)"
          maxLength={30}
          disabled={competitors.length >= 15}
        />
        <Button
          type="button"
          onClick={handleAddCompetitor}
          disabled={competitors.length >= 15 || newCompetitor.trim() === ''}
          size="sm"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>
      
      {competitors.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">{competitors.length}/15 competitors added</h3>
          <div className="flex flex-wrap gap-2">
            {competitors.map((competitor, index) => (
              <div key={index} className="bg-secondary/50 px-3 py-1 rounded-full text-sm flex items-center">
                @{competitor}
                <button
                  type="button"
                  onClick={() => handleRemoveCompetitor(index)}
                  className="ml-2 h-4 w-4 rounded-full inline-flex items-center justify-center hover:bg-secondary-foreground/10"
                >
                  <span className="sr-only">Remove</span>
                  <svg width="6" height="6" viewBox="0 0 6 6" fill="none" xmlns="http://www.w3.org/2000/svg" className="stroke-current">
                    <path d="M1 1L5 5M1 5L5 1" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default CompetitorInput;
