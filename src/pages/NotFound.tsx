
import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md text-center">
        <h1 className="text-9xl font-bold text-primary mb-2 animate-fade-in">404</h1>
        <div className="h-0.5 w-16 bg-border mx-auto my-6 animate-slide-up animation-delay-100"></div>
        <h2 className="text-2xl font-medium mb-4 animate-fade-in animation-delay-200">Page not found</h2>
        <p className="text-muted-foreground mb-8 animate-fade-in animation-delay-300">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <button
          onClick={() => navigate('/')}
          className="button-hover-effect inline-flex items-center px-4 py-2 rounded-lg border border-input hover:bg-secondary transition-colors animate-fade-in animation-delay-400"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Return to Home
        </button>
      </div>
    </div>
  );
};

export default NotFound;
