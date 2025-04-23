
import { useAuth } from '@/contexts/AuthContext';

export const useUser = () => {
  // Get the user from the AuthContext
  const { user } = useAuth();
  
  return { 
    user 
  };
};
