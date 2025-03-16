
import React from 'react';
import { Briefcase } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface NicheSelectionProps {
  selectedNiches: string[];
  setSelectedNiches: React.Dispatch<React.SetStateAction<string[]>>;
  updateProfile: (updates: any) => Promise<void>;
}

const niches = ["Fashion & Style", "Beauty & Makeup", "Fitness & Health", "Food & Cooking", "Travel & Adventure", "Lifestyle", "Technology", "Business & Entrepreneurship", "Education & Learning", "Entertainment", "Gaming", "Art & Design", "Photography", "DIY & Crafts", "Parenting", "Music", "Sports", "Pets & Animals", "Motivational & Inspirational", "Comedy & Humor"];

const NicheSelection = ({ 
  selectedNiches, 
  setSelectedNiches,
  updateProfile
}: NicheSelectionProps) => {
  const { toast } = useToast();

  const handleNicheChange = async (niche: string) => {
    try {
      let updatedNiches;
      if (selectedNiches.includes(niche)) {
        updatedNiches = selectedNiches.filter(n => n !== niche);
      } else {
        updatedNiches = [...selectedNiches, niche];
      }
      setSelectedNiches(updatedNiches);
      await updateProfile({
        selected_niches: updatedNiches
      });
    } catch (error) {
      console.error('Error updating niches:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update niche selection.",
        variant: "destructive"
      });
    }
  };

  return (
    <section className="animate-fade-in">
      <div className="flex items-center mb-4">
        <Briefcase className="mr-2 h-5 w-5 text-primary" />
        <h2 className="text-2xl font-medium">Select Your Niches</h2>
      </div>
      <p className="text-muted-foreground mb-6">Choose niches that best describe your content (select multiple)</p>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {niches.map(niche => (
          <button
            key={niche}
            type="button"
            onClick={() => handleNicheChange(niche)}
            className={`py-2 px-3 rounded-md text-sm text-start transition-colors ${
              selectedNiches.includes(niche)
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary/50 hover:bg-secondary'
            }`}
          >
            {niche}
          </button>
        ))}
      </div>

      {selectedNiches.length > 0 && (
        <div className="mt-4">
          <p className="text-sm text-muted-foreground mb-2">Selected niches:</p>
          <div className="flex flex-wrap gap-2">
            {selectedNiches.map(niche => (
              <div key={niche} className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm flex items-center">
                {niche}
                <button
                  type="button"
                  onClick={() => handleNicheChange(niche)}
                  className="ml-2 h-4 w-4 rounded-full inline-flex items-center justify-center hover:bg-primary/20"
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

export default NicheSelection;
