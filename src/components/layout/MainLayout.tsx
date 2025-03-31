
import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Video, User, Settings, LogOut, CreditCard, FileVideo, BookOpen } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const { user, signOut } = useAuth();
  const isHome = location.pathname === '/';
  const isDashboard = location.pathname === '/dashboard';

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

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

            <div className="flex items-center space-x-2">
              {user ? (
                <>
                  {!isDashboard && (
                    <button 
                      onClick={() => navigate('/dashboard')}
                      className="button-hover-effect px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      Dashboard
                    </button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-2 rounded-full hover:bg-secondary transition-colors">
                        <User className="h-5 w-5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                        <Video className="mr-2 h-4 w-4" />
                        Dashboard
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/tutorial')}>
                        <BookOpen className="mr-2 h-4 w-4" />
                        Tutorial
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/results')}>
                        <FileVideo className="mr-2 h-4 w-4" />
                        Results
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/buy-credits')}>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Buy Credits
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/settings')}>
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleSignOut}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <button 
                  onClick={() => navigate('/auth')}
                  className="button-hover-effect px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Sign In
                </button>
              )}
            </div>
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
