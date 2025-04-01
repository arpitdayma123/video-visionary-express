
import React from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { 
  ArrowRight, 
  Clock, 
  Zap, 
  Globe, 
  Lightbulb, 
  Sparkles, 
  Repeat, 
  TrendingUp,
  CheckCircle, 
  Clock3,
  Compass,
  Rocket,
  BarChart3
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Compass className="h-8 w-8 text-green-400" />,
      title: 'Finding Viral Topics in Your Niche',
      description: 'Analyzes 15 hours of trend research in just 5 minutes to show you what\'s really working in your niche.'
    },
    {
      icon: <Lightbulb className="h-8 w-8 text-green-400" />,
      title: 'Creating Scripts That Really Work',
      description: 'Trained on 500+ viral video scripts, our AI turns a 3-hour task into a 2-minute magic trick.'
    },
    {
      icon: <Sparkles className="h-8 w-8 text-green-400" />,
      title: 'Generating Hyper-Personalized Videos',
      description: 'Automatically creates videos using your face and voice—so natural, no one will know it\'s AI.'
    }
  ];

  const benefits = [
    {
      percentage: '90%',
      title: 'Viral Script',
      description: 'Proven viral potential'
    },
    {
      percentage: '95%',
      title: 'Cost Effective',
      description: 'Save money on production'
    },
    {
      percentage: '100%',
      title: 'Time Saving',
      description: 'Focus on your business'
    },
    {
      percentage: '100%',
      title: 'Consistent Posting',
      description: 'Never miss a beat'
    },
  ];

  const challenges = [
    {
      icon: <Clock3 className="h-6 w-6 text-green-400" />,
      title: 'Time-Consuming Research',
      description: 'Our AI does 10 hours of research in just 5 minutes.'
    },
    {
      icon: <Lightbulb className="h-6 w-6 text-green-400" />,
      title: 'Idea Generation Fatigue',
      description: 'Instantly scans thousands of videos to deliver creative ideas.'
    },
    {
      icon: <TrendingUp className="h-6 w-6 text-green-400" />,
      title: 'Low Engagement & Reach',
      description: 'Boosts your chances of viral success by up to 90%.'
    },
    {
      icon: <Rocket className="h-6 w-6 text-green-400" />,
      title: 'Lack of Niche Customization',
      description: 'Tailors every video to your unique niche.'
    },
  ];

  const caseStudies = [
    {
      name: 'Client A',
      before: {
        views: '900',
        likes: '300',
        comments: '51k',
      },
      after: {
        views: '100k',
        likes: '72k',
        comments: '194k',
      },
      description: 'Started as a niche influencer, and growing her profile has been like a personal mission. We've not only gained her followers, but now whenever she needs a good lead, she'll get one more efficiently than most online services out there.'
    },
    {
      name: 'Client B',
      before: {
        views: '1.2k',
        likes: '450',
        comments: '62k',
      },
      after: {
        views: '120k',
        likes: '84k',
        comments: '210k',
      },
      description: 'A fitness coach who struggled with content consistency. With our AI, their engagement increased by 800% in just 30 days.'
    },
  ];

  const faqs = [
    {
      question: 'How does your AI content automation work?',
      answer: 'Our AI analyzes trending content in your niche, creates scripts based on viral patterns, and generates videos with your face and voice using advanced machine learning models.'
    },
    {
      question: 'What kind of improvements can I expect?',
      answer: 'Our clients typically see a 400-800% increase in engagement, 200% growth in followers, and a 90% reduction in content creation time.'
    },
    {
      question: 'What if my reel doesn\'t go viral?',
      answer: 'We guarantee results. If your content doesn\'t achieve agreed-upon metrics within 15 days, we\'ll create new content until it does.'
    },
    {
      question: 'Do you personalize content for my niche?',
      answer: 'Absolutely! We analyze your specific niche, competitors, and audience to create hyper-personalized content that resonates with your followers.'
    },
    {
      question: 'How soon will I see results?',
      answer: 'Most clients start seeing improved engagement within the first week, with significant growth by the 15-day mark.'
    },
  ];

  return (
    <MainLayout showNav={false} className="bg-black text-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-green-900/20 to-transparent" />
        <div className="relative z-10 section-container flex flex-col items-center justify-center text-center py-20 md:py-32">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight max-w-4xl animate-slide-down">
            Too Lazy to Create Content? Let Our AI Work Like a Team of <span className="text-green-400">7 Experts</span> for You.
          </h1>
          <p className="mt-6 text-xl md:text-2xl text-gray-300 max-w-3xl animation-delay-200 animate-fade-in">
            Guaranteed Viral Reels in Just 15 Days
          </p>
          <p className="mt-6 text-lg md:text-xl text-gray-400 max-w-2xl animation-delay-300 animate-fade-in">
            It's 2025 – Not Using AI? Save time, money, and energy by automating your content creation journey. Our platform scans trends in 5 minutes, writes viral scripts in 2 minutes, and creates hyper-personalized videos with your face and voice.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 animation-delay-300 animate-fade-in">
            <button
              onClick={() => navigate('/dashboard')}
              className="button-hover-effect px-8 py-3 rounded-lg bg-green-500 text-black hover:bg-green-400 flex items-center justify-center gap-2 font-medium"
            >
              GET STARTED <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-black py-20">
        <div className="section-container">
          <div className="text-center mb-16 animate-slide-up">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Our AI is <span className="text-green-400">Capable Of</span></h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Cutting-edge artificial intelligence that transforms your content strategy
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="bg-zinc-900 rounded-xl p-8 border border-zinc-800 shadow-lg hover:border-green-500/50 transition-all duration-300 animate-fade-in"
                style={{ animationDelay: `${index * 100 + 300}ms` }}
              >
                <div className="h-16 w-16 rounded-lg bg-zinc-800 flex items-center justify-center mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <button
              onClick={() => navigate('/dashboard')}
              className="button-hover-effect px-8 py-3 rounded-lg bg-green-500 text-black hover:bg-green-400 flex items-center justify-center gap-2 font-medium mx-auto"
            >
              GET STARTED <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gradient-to-b from-black to-zinc-900">
        <div className="section-container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose <span className="text-green-400">Zockto?</span></h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              We deliver results that speak for themselves
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <div 
                key={index}
                className="text-center p-6 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="text-4xl font-bold text-green-400 mb-2">{benefit.percentage}</div>
                <h3 className="text-xl font-semibold text-white mb-2">{benefit.title}</h3>
                <p className="text-gray-400">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Challenges Section */}
      <section className="py-20 bg-zinc-900">
        <div className="section-container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Content Challenges? <span className="text-green-400">Our AI Solves Them!</span></h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Turn your biggest content creation hurdles into opportunities
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {challenges.map((challenge, index) => (
              <div 
                key={index}
                className="p-6 bg-zinc-800 rounded-xl border border-zinc-700 hover:border-green-500/30 transition-all duration-300 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center mb-4">
                  {challenge.icon}
                  <h3 className="text-lg font-semibold text-white ml-3">{challenge.title}</h3>
                </div>
                <p className="text-gray-400">{challenge.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <button
              onClick={() => navigate('/dashboard')}
              className="button-hover-effect px-8 py-3 rounded-lg bg-green-500 text-black hover:bg-green-400 flex items-center justify-center gap-2 font-medium mx-auto"
            >
              GET A FREE DEMO <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </section>

      {/* Case Studies Section */}
      <section className="py-20 bg-black">
        <div className="section-container">
          <div className="mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">Our <span className="text-green-400">Case Studies</span></h2>
            <p className="text-gray-400 max-w-2xl">
              Transformative Personal Branding Journeys with Our Proven Services
            </p>
            <p className="text-green-400 mt-4 text-sm font-medium">We sign just 10 clients monthly</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {caseStudies.map((study, index) => (
              <div 
                key={index}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 animate-fade-in"
                style={{ animationDelay: `${index * 200}ms` }}
              >
                <div className="bg-zinc-800 rounded-xl p-6 mb-6">
                  <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 rounded-full bg-zinc-700 flex items-center justify-center">
                      <span className="text-white font-medium">{study.name}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <p className="text-center text-gray-400 mb-2">Before</p>
                      <div className="flex justify-around">
                        <div className="text-center">
                          <p className="text-green-400 font-bold">{study.before.views}</p>
                          <p className="text-xs text-gray-500">Views</p>
                        </div>
                        <div className="text-center">
                          <p className="text-green-400 font-bold">{study.before.likes}</p>
                          <p className="text-xs text-gray-500">Likes</p>
                        </div>
                        <div className="text-center">
                          <p className="text-green-400 font-bold">{study.before.comments}</p>
                          <p className="text-xs text-gray-500">Comments</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-center text-gray-400 mb-2">After</p>
                      <div className="flex justify-around">
                        <div className="text-center">
                          <p className="text-green-400 font-bold">{study.after.views}</p>
                          <p className="text-xs text-gray-500">Views</p>
                        </div>
                        <div className="text-center">
                          <p className="text-green-400 font-bold">{study.after.likes}</p>
                          <p className="text-xs text-gray-500">Likes</p>
                        </div>
                        <div className="text-center">
                          <p className="text-green-400 font-bold">{study.after.comments}</p>
                          <p className="text-xs text-gray-500">Comments</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-300 text-sm">{study.description}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-gray-500 mt-6">P.S. We prioritize client privacy. Profiles are caricatures reflecting our clients' professions.</p>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-zinc-900">
        <div className="section-container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Frequently Asked <span className="text-green-400">Questions</span></h2>
          </div>

          <div className="max-w-3xl mx-auto">
            {faqs.map((faq, index) => (
              <div 
                key={index}
                className="mb-6 pb-6 border-b border-zinc-800 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <h3 className="text-xl font-semibold mb-3 text-white flex items-start">
                  <span className="text-green-400 mr-3">{index + 1}.</span> {faq.question}
                </h3>
                <p className="text-gray-400 pl-7">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-black">
        <div className="section-container text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 animate-fade-in">
            Let's <span className="text-green-400">Work Together</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto mb-10 animation-delay-100 animate-fade-in">
            Ready to transform your content strategy and boost your social media presence?
          </p>
          <div className="flex flex-col md:flex-row justify-center gap-4">
            <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
              <button
                onClick={() => navigate('/dashboard')}
                className="button-hover-effect px-10 py-4 rounded-lg bg-green-500 text-black hover:bg-green-400 flex items-center justify-center gap-2 font-medium mx-auto text-lg"
              >
                GET A FREE DEMO <ArrowRight className="h-5 w-5" />
              </button>
            </div>
            <div className="animate-fade-in" style={{ animationDelay: '300ms' }}>
              <button
                onClick={() => navigate('/contact')}
                className="button-hover-effect px-10 py-4 rounded-lg border border-green-500 text-white hover:bg-green-500/10 flex items-center justify-center gap-2 font-medium mx-auto text-lg"
              >
                CONTACT US
              </button>
            </div>
          </div>
          
          <div className="mt-12 text-gray-400">
            <p className="mb-2">Email: hello@zockto.com</p>
            <p>Phone: +91XXXXXXX</p>
          </div>
        </div>
      </section>
    </MainLayout>
  );
};

export default Index;
