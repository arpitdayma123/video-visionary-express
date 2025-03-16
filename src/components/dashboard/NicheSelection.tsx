
import React from 'react';
import { Briefcase } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

  const handleRemoveNiche = async (niche: string) => {
    try {
      const updatedNiches = selectedNiches.filter(n => n !== niche);
      setSelectedNiches(updatedNiches);
      await updateProfile({
        selected_niches: updatedNiches
      });
    } catch (error) {
      console.error('Error removing niche:', error);
      toast({
        title: "Update Failed",
        description: "Failed to remove niche selection.",
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
      
      <div className="space-y-4">
        <div className="relative">
          <Select onValueChange={(value) => handleNicheChange(value)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a niche" />
            </SelectTrigger>
            <SelectContent>
              {niches
                .filter(niche => !selectedNiches.includes(niche))
                .map(niche => (
                  <SelectItem key={niche} value={niche}>
                    {niche}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        {selectedNiches.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground mb-2">Selected niches:</p>
            <div className="flex flex-wrap gap-2">
              {selectedNiches.map(niche => (
                <Badge 
                  key={niche} 
                  variant="secondary"
                  className="text-sm px-3 py-1 flex items-center gap-1"
                >
                  {niche}
                  <button
                    type="button"
                    onClick={() => handleRemoveNiche(niche)}
                    className="ml-1 rounded-full inline-flex items-center justify-center hover:bg-background/20"
                  >
                    <X className="h-3 w-3" />
                    <span className="sr-only">Remove {niche}</span>
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default NicheSelection;
