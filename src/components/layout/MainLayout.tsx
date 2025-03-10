
import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Video, User, Settings } from 'lucide-react';

type MainLayoutProps = {
  children: React.ReactNode;
  showNav?: boolean;
  title?: string;
  subtitle?: string;
};

const MainLayout = ({ 
  children, 
  showNav = true, 
  title, 
  subtitle 
}: MainLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/';
  const isDashboard = location.pathname === '/dashboard';

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="w-full py-4 backdrop-blur-lg bg-background/80 border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {!isHome && (
              <button 
                onClick={() => navigate(-1)}
                className="mr-4 p-2 rounded-full hover:bg-secondary transition-colors"
                aria-label="Go back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            
            <div className="flex-1">
              <h1 className="text-xl font-medium">
                {title || 'Video Visionary'}
              </h1>
              {subtitle && (
                <p className="text-sm text-muted-foreground mt-0.5 animate-fade-in">
                  {subtitle}
                </p>
              )}
            </div>

            {!isDashboard ? (
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => navigate('/dashboard')}
                  className="button-hover-effect px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Dashboard
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-1">
                <button className="p-2 rounded-full hover:bg-secondary transition-colors">
                  <Settings className="h-5 w-5" />
                </button>
                <button className="p-2 rounded-full hover:bg-secondary transition-colors">
                  <User className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Video Visionary. All rights reserved.
            </p>
          </div>
          <div className="flex space-x-6">
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact</a>
          </div>
        </div>
      </footer>

      <Toaster />
    </div>
  );
};

export default MainLayout;
