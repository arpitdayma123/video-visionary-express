
import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface CreditPackageProps {
  title: string;
  credits: number;
  price: string;
  description: string;
  icon: React.ReactNode;
  onSelect: () => void;
}

const CreditPackage = ({ 
  title, 
  credits, 
  price, 
  description, 
  icon, 
  onSelect 
}: CreditPackageProps) => (
  <Card className="flex flex-col hover:shadow-lg transition-shadow">
    <CardHeader>
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
        {icon}
      </div>
      <CardTitle>{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent className="flex-grow">
      <div className="text-3xl font-bold mb-2">{price}</div>
      <div className="text-muted-foreground">
        Get {credits} credits to create videos
      </div>
    </CardContent>
    <CardFooter>
      <Button className="w-full" onClick={onSelect}>
        Select Package
      </Button>
    </CardFooter>
  </Card>
);

export default CreditPackage;
