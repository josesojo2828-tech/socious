import { z } from "zod";

// URL opcional — string vacío, undefined, o URL. Sin validación estricta de formato
// porque las URLs pueden ser relativas o de upload interno.
const optionalUrl = z.string().optional();

export const heroSchema = z.object({
  coverImageUrl: optionalUrl,
  profileImageUrl: optionalUrl,
  fullName: z.string().min(1).max(100),
  professionalTitle: z.string().max(120).optional(),
  registrationNumber: z.string().max(60).optional(),
  isVerified: z.boolean().optional(),
  statusTag: z.string().max(80).optional(),
  location: z.string().max(100).optional(),
  description: z.string().max(300).optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().max(30).optional(),
  whatsapp: z.string().max(30).optional(),
  institutionName: z.string().max(100).optional(),
  institutionLogoUrl: optionalUrl,
  specialties: z.array(z.string().max(50)).optional(),
  primaryCtaText: z.string().max(40).optional(),
  primaryCtaLink: optionalUrl,
  secondaryCtaText: z.string().max(40).optional(),
  secondaryCtaLink: optionalUrl,
});

export const aboutSchema = z.object({
  photoUrl: optionalUrl,
  biography: z.string().min(1).max(2000),
  philosophy: z.string().max(1000).optional(),
});

export const serviceItemSchema = z.object({
  name: z.string().min(1).max(60),
  description: z.string().min(1).max(300),
  icon: z.string().min(1),
});

export const servicesSchema = z.object({
  title: z.string().min(1).max(100),
  items: z.array(serviceItemSchema).min(1).max(12),
});

export const testimonialItemSchema = z.object({
  patientName: z.string().min(1).max(80),
  photoUrl: optionalUrl,
  text: z.string().min(1).max(500),
  rating: z.number().int().min(1).max(5).optional(),
});

export const testimonialsSchema = z.object({
  title: z.string().max(100).optional(),
  items: z.array(testimonialItemSchema).min(1).max(20),
});

export const pricingPlanSchema = z.object({
  name: z.string().min(1).max(60),
  price: z.string().min(1).max(20),
  features: z.array(z.string().min(1)).min(0).max(15),
  ctaText: z.string().max(40).optional(),
  ctaLink: optionalUrl,
});

export const pricingSchema = z.object({
  title: z.string().max(100).optional(),
  plans: z.array(pricingPlanSchema).min(1).max(6),
});

export const faqItemSchema = z.object({
  question: z.string().min(1).max(200),
  answer: z.string().min(1).max(2000),
});

export const faqSchema = z.object({
  title: z.string().max(100).optional(),
  items: z.array(faqItemSchema).min(1).max(30),
});

export const contactSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  address: z.string().optional(),
  showContactForm: z.boolean().optional().default(false),
});

export const socialPlatformSchema = z.object({
  platform: z.enum([
    "instagram",
    "linkedin",
    "youtube",
    "twitter",
    "tiktok",
    "facebook",
    "website",
  ]),
  url: z.string().optional(),
  enabled: z.boolean(),
});

export const socialSchema = z.object({
  platforms: z.array(socialPlatformSchema).max(6),
});

export const galleryImageSchema = z.object({
  url: z.string().min(1, "La URL de la imagen es requerida"),
  caption: z.string().max(200).optional(),
});

export const gallerySchema = z.object({
  title: z.string().max(100).optional(),
  images: z.array(galleryImageSchema).min(1).max(30),
});

export const ctaSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(300).optional(),
  buttonText: z.string().min(1).max(40),
  buttonLink: z.string().min(1).max(500),
});

export const metricItemSchema = z.object({
  value: z.string().min(1).max(30),
  label: z.string().min(1).max(60),
  subtext: z.string().max(80).optional(),
});

export const metricsSchema = z.object({
  title: z.string().max(100).optional(),
  items: z.array(metricItemSchema).min(1).max(8),
});

export const credentialItemSchema = z.object({
  title: z.string().min(1).max(100),
  institution: z.string().min(1).max(100),
  year: z.string().max(30).optional(),
  description: z.string().max(300).optional(),
  type: z.enum(["education", "certification", "award", "registration"]).optional(),
});

export const credentialsSchema = z.object({
  title: z.string().max(100).optional(),
  items: z.array(credentialItemSchema).min(1).max(15),
});

export const portfolioConfigSchema = z.object({
  palette: z.string().min(1),
  widgets: z.array(
    z.object({
      id: z.string().min(1),
      type: z.enum([
        "hero",
        "about",
        "services",
        "testimonials",
        "pricing",
        "faq",
        "contact",
        "social",
        "gallery",
        "cta",
        "metrics",
        "credentials",
      ]),
      order: z.number().int().min(0),
      visible: z.boolean(),
      content: z.record(z.string(), z.unknown()),
    })
  ),
});
