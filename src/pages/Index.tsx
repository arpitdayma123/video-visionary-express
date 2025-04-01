
import React from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { ArrowRight, Upload, Film, Zap, Globe } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Upload className="h-6 w-6 text-primary" />,
      title: 'Seamless Uploads',
      description: 'Upload your videos and voice files with a simple drag and drop interface.'
    },
    {
      icon: <Film className="h-6 w-6 text-primary" />,
      title: 'Custom Videos',
      description: 'Receive personalized videos optimized for your Instagram audience.'
    },
    {
      icon: <Zap className="h-6 w-6 text-primary" />,
      title: 'Fast Processing',
      description: 'Our advanced system processes your content quickly and efficiently.'
    },
    {
      icon: <Globe className="h-6 w-6 text-primary" />,
      title: 'Niche Targeting',
      description: 'Select your niche and target competitors to optimize your content.'
    },
  ];

  return (
    <MainLayout showNav={false}>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-blue-50 to-transparent" />
        <div className="relative z-10 section-container flex flex-col items-center justify-center text-center py-20 md:py-32">
          <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 mb-6 animate-fade-in">
            Personalized Videos for Instagram Creators
          </span>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight max-w-4xl animate-slide-down">
            Create Engaging Instagram Videos <span className="text-primary">Personalized</span> For Your Audience
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl animation-delay-200 animate-fade-in">
            Upload your content and competitor data, and receive custom-tailored videos that resonate with your Instagram followers.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 animation-delay-300 animate-fade-in">
            <button
              onClick={() => navigate('/dashboard')}
              className="button-hover-effect px-8 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-2 font-medium"
            >
              Get Started <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => navigate('/about')}
              className="px-8 py-3 rounded-lg border border-border hover:bg-secondary transition-colors"
            >
              Learn More
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="section-container py-20">
        <div className="text-center mb-16 animate-slide-up">
          <h2 className="text-3xl font-bold tracking-tight mb-4">Streamlined Creativity</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Our platform provides everything you need to create personalized videos that engage your audience.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="bg-card rounded-xl p-6 border border-border shadow-sm hover:shadow-md transition-shadow animate-fade-in"
              style={{ animationDelay: `${index * 100 + 300}ms` }}
            >
              <div className="h-12 w-12 rounded-lg bg-secondary flex items-center justify-center mb-4">
                {feature.icon}
              </div>
              <h3 className="text-xl font-medium mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-primary/5 to-primary/10 py-16 md:py-24">
        <div className="section-container text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6 animate-fade-in">
            Ready to Create Engaging Content?
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-10 animation-delay-100 animate-fade-in">
            Join the community of creators who are already using our platform to enhance their Instagram presence.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="button-hover-effect px-8 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors animation-delay-200 animate-fade-in"
          >
            Start Creating Now
          </button>
        </div>
      </section>
    </MainLayout>
  );
};

export default Index;
