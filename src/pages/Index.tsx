
import React from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { ArrowRight, CheckCircle, Sparkles, TrendingUp, Clock, Lightbulb, Rocket } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const Index = () => {
  const navigate = useNavigate();

  const capabilities = [
    {
      icon: <TrendingUp className="h-8 w-8 text-green-500" />,
      title: "Finding Viral Topics in Your Niche",
      description: "It analyzes what would take a human 15 hours of trend research in just 5 minutes, showing you what's really working in your niche."
    },
    {
      icon: <Sparkles className="h-8 w-8 text-green-500" />,
      title: "Creating Scripts That Really Work",
      description: "Trained on 500+ viral video scripts, our AI turns a 3-hour task into a 2-minute magic trick—faster than you can cook a Maggi!"
    },
    {
      icon: <Rocket className="h-8 w-8 text-green-500" />,
      title: "Generating Hyper-Personalized Videos",
      description: "Say goodbye to endless retakes and memorizing lines. Our AI automatically creates videos using your face and voice, so natural that no one will know it's AI."
    }
  ];

  const benefits = [
    {
      percentage: "90%",
      title: "Viral Script Success"
    },
    {
      percentage: "95%",
      title: "Cost Effectiveness"
    },
    {
      percentage: "100%",
      title: "Time Saving"
    },
    {
      percentage: "100%",
      title: "Consistent Posting"
    }
  ];

  const challenges = [
    {
      icon: <Clock className="h-6 w-6 text-green-500" />,
      problem: "Time-Consuming Content Creation",
      solution: "Our AI does 10 hours of research in just 5 minutes to deliver viral-ready content."
    },
    {
      icon: <Lightbulb className="h-6 w-6 text-green-500" />,
      problem: "Idea Generation Fatigue",
      solution: "It instantly scans thousands of videos to bring you creative, proven ideas."
    },
    {
      icon: <TrendingUp className="h-6 w-6 text-green-500" />,
      problem: "Low Engagement and Reach",
      solution: "Using a viral dataset, our content boosts your chances by up to 90%."
    },
    {
      icon: <CheckCircle className="h-6 w-6 text-green-500" />,
      problem: "Lack of Niche Customization",
      solution: "Every video is tailored to your niche to perfectly resonate with your audience."
    }
  ];

  const faqs = [
    {
      question: "How does your AI content automation work?",
      answer: "Our AI analyzes viral content in your niche, creates scripts based on proven patterns, and generates personalized videos using your face and voice, all within minutes."
    },
    {
      question: "What kind of improvements can I expect?",
      answer: "Our clients typically see a 5-10x increase in engagement, 3x growth in followers, and save 15+ hours per week on content creation."
    },
    {
      question: "What if my reel doesn't go viral?",
      answer: "We guarantee viral reels within 15 days or we continue working with you at no extra cost until we achieve the desired results."
    },
    {
      question: "Do you personalize content for my niche?",
      answer: "Absolutely! Our AI specifically analyzes your niche and competitors to create hyper-targeted content that resonates with your specific audience."
    },
    {
      question: "How soon will I see results?",
      answer: "Most clients see initial improvements within the first week and significant growth within 15 days of implementing our AI-generated content."
    }
  ];

  return (
    <MainLayout showNav={false}>
      {/* Hero Section */}
      <section className="relative bg-black text-white overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-20 bg-[linear-gradient(45deg,#00ff8a,#00a1ff)]"></div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 flex flex-col items-center justify-center text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight max-w-4xl animate-slide-down">
            <span className="text-white">Too Lazy to Create Content? Let Our AI Work Like a Team of </span>
            <span className="text-green-500">7 Experts</span>
            <span className="text-white"> for You.</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-gray-300 max-w-2xl animation-delay-200 animate-fade-in">
            Guaranteed Viral Reels in Just 15 Days
          </p>
          <p className="mt-4 text-md text-gray-400 max-w-3xl">
            Upload your video and voice. Get personalized viral-ready content with your face and voice.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 animation-delay-300 animate-fade-in">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-8 py-3 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors flex items-center justify-center gap-2 font-medium"
            >
              GET STARTED <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Primary Value Statement */}
      <section className="bg-gray-900 text-white py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-6">It's 2025 – Not Using AI? Save Time, Money & Energy!</h2>
          <p className="text-gray-300 max-w-4xl mx-auto">
            Forget wasting 15 hours on research or hiring expensive teams. Our AI scans trends in just 5 minutes, 
            writes viral scripts in 2 minutes (faster than you can cook Maggi), and creates personalized videos 
            using your face and voice. It's like having a team of 7 experts working for you—delivering viral results 
            with zero hassle, guaranteeing viral reels in just 15 days.
          </p>
        </div>
      </section>

      {/* Capabilities Section */}
      <section className="bg-black text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Our AI is <span className="text-green-500">Capable Of</span></h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Our platform provides everything you need to create personalized videos that engage your audience.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {capabilities.map((capability, index) => (
              <Card key={index} className="bg-gray-800 border-gray-700 hover:border-green-500 transition-colors">
                <CardContent className="p-6">
                  <div className="h-14 w-14 rounded-lg bg-gray-700 flex items-center justify-center mb-4">
                    {capability.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-white">{capability.title}</h3>
                  <p className="text-gray-400">{capability.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-center mt-12">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-8 py-3 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors flex items-center justify-center gap-2 font-medium"
            >
              GET STARTED <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Our AI Agent <span className="text-green-500">Helps You Achieve</span></h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <div key={index} className="text-center p-6 bg-gray-800 rounded-lg">
                <div className="text-4xl font-bold text-green-500 mb-2">{benefit.percentage}</div>
                <div className="text-gray-300">{benefit.title}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Problem Solution Section */}
      <section className="bg-black text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Content Challenges? <span className="text-green-500">Our AI Solves Them!</span></h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {challenges.map((challenge, index) => (
              <div key={index} className="bg-gray-800 p-6 rounded-lg flex items-start gap-4">
                <div className="bg-gray-700 p-3 rounded-full">
                  {challenge.icon}
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">{challenge.problem}</h3>
                  <p className="text-gray-400">{challenge.solution}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Case Studies */}
      <section className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Case <span className="text-green-500">Studies</span></h2>
            <p className="text-gray-400">Transformative Personal Branding Journeys with Our Proven Services</p>
          </div>

          <div className="bg-gray-800 p-8 rounded-lg">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <img 
                  src="/lovable-uploads/8c69d3db-492b-4543-a832-b1db5a24abc9.png" 
                  alt="Case Study" 
                  className="rounded-lg w-full"
                />
              </div>
              <div className="flex flex-col justify-center">
                <h3 className="text-2xl font-bold mb-4">riddhi.ai & betheunicorn</h3>
                <p className="text-gray-300 mb-6">
                  Shah's one of our oldest clients, and growing her profile has been like a personal journey. We've not only gained her followers, but now whenever she needs a good face shot and peel away layers of complexity, we're at her doorstep. We're getting her 5+ inbound leads everyday for her + close 3-4 clients every month.
                </p>
                <p className="text-gray-400 italic">
                  P.S. We prioritize client privacy. Profiles are caricatures reflecting our clients' professions.
                </p>
                <p className="text-green-500 mt-6 font-bold">
                  We sign just 10 clients monthly—Don't wait; start your lazy content creation journey now!
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-center mt-12">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-8 py-3 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors flex items-center justify-center gap-2 font-medium"
            >
              GET A FREE DEMO <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-black text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Frequently <span className="text-green-500">Asked Questions</span></h2>
          </div>

          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-gray-800 p-6 rounded-lg">
                <h3 className="font-bold text-lg mb-3">{faq.question}</h3>
                <p className="text-gray-400">{faq.answer}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-xl mb-4">Don't wait, start your lazy content creation journey now!</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-8 py-3 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors flex items-center justify-center gap-2 font-medium"
            >
              GET A FREE DEMO <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="bg-gray-900 text-white py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12">
            <div className="flex flex-col justify-center">
              <h2 className="text-3xl font-bold mb-4">Let's <span className="text-green-500">Work Together</span></h2>
              <p className="text-gray-400 mb-4">
                Still not convinced? Tough crowd.
              </p>
              <p className="text-gray-400 mb-6">
                Fill out this form and our team will get back to you automatically (we like machines!) if the information is relevant to the workflow.
              </p>
              <div>
                <p className="text-green-500 font-semibold mb-1">Just Drop Me a Line</p>
                <p className="text-gray-300">hello@zockto.com</p>
                <p className="text-gray-300">+91XXXXXXX</p>
              </div>
            </div>
            <div>
              <img 
                src="/lovable-uploads/f7a7fc77-8e67-4182-a533-e30f0542c419.png" 
                alt="Contact" 
                className="rounded-lg w-full"
              />
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
};

export default Index;
