import type { ComponentType } from "react";
import type { ZodType } from "zod";

export type WidgetType =
  | "hero"
  | "about"
  | "services"
  | "testimonials"
  | "pricing"
  | "faq"
  | "contact"
  | "social"
  | "gallery"
  | "cta"
  | "metrics"
  | "credentials";

export interface HeroContent {
  coverImageUrl?: string;
  profileImageUrl?: string;
  fullName: string;
  professionalTitle?: string;
  registrationNumber?: string;
  isVerified?: boolean;
  statusTag?: string;
  location?: string;
  description?: string;
  contactEmail?: string;
  contactPhone?: string;
  whatsapp?: string;
  institutionName?: string;
  institutionLogoUrl?: string;
  specialties?: string[];
  primaryCtaText?: string;
  primaryCtaLink?: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
}

export interface AboutContent {
  photoUrl?: string;
  biography: string;
  philosophy?: string;
}

export interface ServiceItem {
  name: string;
  description: string;
  icon: string;
}

export interface ServicesContent {
  title: string;
  items: ServiceItem[];
}

export interface TestimonialItem {
  patientName: string;
  photoUrl?: string;
  text: string;
  rating?: number;
}

export interface TestimonialsContent {
  title?: string;
  items: TestimonialItem[];
}

export interface PricingPlan {
  name: string;
  price: string;
  features: string[];
  ctaText?: string;
  ctaLink?: string;
}

export interface PricingContent {
  title?: string;
  plans: PricingPlan[];
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface FAQContent {
  title?: string;
  items: FAQItem[];
}

export interface ContactContent {
  email?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  showContactForm?: boolean;
}

export type SocialPlatformName =
  | "instagram"
  | "linkedin"
  | "youtube"
  | "twitter"
  | "tiktok"
  | "facebook"
  | "website";

export interface SocialPlatform {
  platform: SocialPlatformName;
  url?: string;
  enabled: boolean;
}

export interface SocialContent {
  platforms: SocialPlatform[];
}

export interface GalleryImage {
  url: string;
  caption?: string;
}

export interface GalleryContent {
  title?: string;
  images: GalleryImage[];
}

export interface CTAContent {
  title: string;
  description?: string;
  buttonText: string;
  buttonLink: string;
}

export interface MetricItem {
  value: string;
  label: string;
  subtext?: string;
}

export interface MetricsContent {
  title?: string;
  items: MetricItem[];
}

export interface CredentialItem {
  title: string;
  institution: string;
  year?: string;
  description?: string;
  type?: "education" | "certification" | "award" | "registration";
}

export interface CredentialsContent {
  title?: string;
  items: CredentialItem[];
}

export interface WidgetContentMap {
  hero: HeroContent;
  about: AboutContent;
  services: ServicesContent;
  testimonials: TestimonialsContent;
  pricing: PricingContent;
  faq: FAQContent;
  contact: ContactContent;
  social: SocialContent;
  gallery: GalleryContent;
  cta: CTAContent;
  metrics: MetricsContent;
  credentials: CredentialsContent;
}

export interface PortfolioWidget<T extends WidgetType = WidgetType> {
  id: string;
  type: T;
  order: number;
  visible: boolean;
  content: WidgetContentMap[T];
}

export interface PortfolioConfig {
  palette: string;
  widgets: PortfolioWidget[];
}

export interface WidgetDefinition<T extends WidgetType = WidgetType> {
  type: T;
  label: string;
  icon: string;
  schema: ZodType<WidgetContentMap[T]>;
  defaultContent: WidgetContentMap[T];
  component: ComponentType<{ content: WidgetContentMap[T]; palette: Palette }>;
  editorComponent: ComponentType<{
    content: WidgetContentMap[T];
    onChange: (content: WidgetContentMap[T]) => void;
  }>;
}

export interface Palette {
  id: string;
  name: string;
  icon: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
}
