
import React from 'react';
import { Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

const ScriptSectionHeader: React.FC = () => {
  const { user } = useAuth();
  
  const { data: freepoint } = useQuery({
    queryKey: ['freepoint', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { data, error } = await supabase
        .from('profiles')
        .select('freepoint')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error('Error fetching freepoint:', error);
        return 0;
      }
      
      return data?.freepoint ?? 0;
    },
    enabled: !!user
  });

  return (
    <section className="animate-fade-in border-b border-border pb-8 mb-8">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-medium">Script Selection</h2>
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-500" />
          <span className="text-sm font-medium">{freepoint} Free Points</span>
        </div>
      </div>
    </section>
  );
};

export default ScriptSectionHeader;
