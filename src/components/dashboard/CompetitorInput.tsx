
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User, Plus, Trash2 } from 'lucide-react';

interface CompetitorInputProps {
  competitors: string[];
  onAddCompetitor: (e: React.MouseEvent<HTMLButtonElement>) => Promise<void>;
  onRemoveCompetitor: (index: number) => Promise<void>;
  newCompetitor: string;
  setNewCompetitor: React.Dispatch<React.SetStateAction<string>>;
}

const CompetitorInput: React.FC<CompetitorInputProps> = ({
  competitors,
  onAddCompetitor,
  onRemoveCompetitor,
  newCompetitor,
  setNewCompetitor
}) => {
  return (
    <Card className="mb-6 p-6">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <User className="w-5 h-5" /> Target Competitors
      </h2>
      <p className="text-muted-foreground mb-6">
        Add usernames of competitors whose content you want to analyze and emulate.
      </p>
      
      <form className="flex items-center space-x-2 mb-4">
        <Input
          placeholder="Enter competitor username"
          value={newCompetitor}
          onChange={(e) => setNewCompetitor(e.target.value)}
        />
        <Button
          type="button"
          onClick={onAddCompetitor}
          disabled={!newCompetitor.trim()}
        >
          <Plus className="mr-1 h-4 w-4" />
          Add
        </Button>
      </form>
      
      {competitors.length > 0 ? (
        <div className="space-y-2">
          {competitors.map((competitor, index) => (
            <div
              key={index}
              className="flex justify-between items-center p-3 bg-muted/40 rounded-lg"
            >
              <span className="font-medium">{competitor}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemoveCompetitor(index)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground italic">No competitors added yet</p>
      )}
    </Card>
  );
};

export default CompetitorInput;
