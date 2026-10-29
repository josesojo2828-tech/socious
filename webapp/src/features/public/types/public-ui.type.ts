
export interface FeatureProps {
    icon: React.ElementType;
    title: string;
    description: string;
    gradient: string;
}

export interface PricingTierProps {
    name: string;
    price: string;
    period: string;
    features: string[];
    isPopular?: boolean;
    ctaText: string;
}

export interface TestimonialProps {
    name: string;
    role: string;
    content: string;
    rating: number;
    image?: string;
}






