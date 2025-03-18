
import { CreditCard, Star, Zap } from 'lucide-react';

export interface PackageOption {
  id: string;
  title: string;
  credits: number;
  price: string;
  priceValue: number;
  description: string;
  icon: React.ReactNode;
}

export const CREDIT_PACKAGES: PackageOption[] = [
  {
    id: 'basic',
    title: 'Basic',
    credits: 5,
    price: '₹499',
    priceValue: 499,
    description: 'Perfect for beginners',
    icon: <CreditCard className="text-primary" />,
  },
  {
    id: 'standard',
    title: 'Standard',
    credits: 20,
    price: '₹1,499',
    priceValue: 1499,
    description: 'Most popular choice',
    icon: <Star className="text-primary" />,
  },
  {
    id: 'premium',
    title: 'Premium',
    credits: 50,
    price: '₹2,999',
    priceValue: 2999,
    description: 'Best value for pros',
    icon: <Zap className="text-primary" />,
  },
];
