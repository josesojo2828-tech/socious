export interface PortfolioSocialLinks {
  facebook?: string;
  instagram?: string;
  tiktok?: string;
  x?: string;
  twitter?: string;
  linkedin?: string;
  website?: string;
  whatsapp?: string;
  phone?: string;
}

export type VerificationStatus = "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED";

export interface PortfolioPublic {
  username: string;
  fullName: string;
  avatarUrl: string | null;
  bio: string | null;
  about: string | null;
  services: string[];
  socialLinks: PortfolioSocialLinks;
  photoUrl: string | null;
  template: string;
  config: Record<string, unknown>;
  role?: string;
  isClinic?: boolean;

  // Accreditation & Verification
  verificationStatus?: VerificationStatus;
  universityDegree?: string | null;
  graduationYear?: number | null;
  mppsCode?: string | null;
  cndvCode?: string | null;
  cndvState?: string | null;
  verifiedAt?: string | null;
}

export interface Portfolio extends PortfolioPublic {
  isPublic: boolean;
  identityCard?: string | null;
  degreeFileUrl?: string | null;
  licenseFileUrl?: string | null;
  rejectionReason?: string | null;
}

export interface PortfolioUpdate {
  bio?: string;
  about?: string;
  services?: string[];
  photoUrl?: string | null;
  socialLinks?: PortfolioSocialLinks;
  isPublic?: boolean;

  // Accreditation
  universityDegree?: string;
  graduationYear?: number;
  mppsCode?: string;
  cndvCode?: string;
  cndvState?: string;
  identityCard?: string;
  degreeFileUrl?: string;
  licenseFileUrl?: string;
  showBio?: boolean;
  showServices?: boolean;
  showAccreditation?: boolean;
  showPapers?: boolean;
  showSocials?: boolean;
  showWhatsappButton?: boolean;
  showLocationMap?: boolean;
  showBookingForm?: boolean;
  palette?: string;
  address?: string;
  schedule?: string;
  mapUrl?: string;
  config?: Record<string, unknown>;
  template?: string;
}

export interface PortfolioValidateResponse {
  available: boolean;
}

export interface ClinicTeamMember {
  id: string;
  userId?: string;
  name: string;
  specialty: string;
  license?: string;
  photoUrl?: string;
  enabled: boolean;
  bookingUrl?: string;
}

export interface ClinicTestimonial {
  id: string;
  patientName: string;
  text: string;
  rating: number;
  photoUrl?: string;
}

export interface ClinicServiceItem {
  id: string;
  title: string;
  description: string;
  icon?: string;
}

export interface ClinicWebsiteConfig {
  isClinicConfig?: boolean;
  slogan?: string;
  description?: string;
  whatsapp?: string;
  phone?: string;
  email?: string;
  address?: string;
  schedule?: string;
  mapUrl?: string;
  lat?: number;
  lng?: number;
  bannerUrl?: string;
  logoUrl?: string;
  palette?: string;
  services?: ClinicServiceItem[];
  staff?: ClinicTeamMember[];
  testimonials?: ClinicTestimonial[];
  gallery?: Array<{ id: string; url: string; caption?: string }>;
}

export interface PortfolioAnalytics {
  periodDays: number;
  startDate: string;
  totalEvents: number;
  totalViews: number;
  whatsappClicks: number;
  socialClicks: {
    instagram: number;
    linkedin: number;
    facebook: number;
    tiktok: number;
    x: number;
    website: number;
    total: number;
  };
  appointmentRequests: number;
}

export interface TrackPortfolioEventPayload {
  eventType:
    | "PAGE_VIEW"
    | "CLICK_WHATSAPP"
    | "CLICK_INSTAGRAM"
    | "CLICK_LINKEDIN"
    | "CLICK_FACEBOOK"
    | "CLICK_TIKTOK"
    | "CLICK_X"
    | "CLICK_WEBSITE"
    | "APPOINTMENT_REQUESTED";
  referrer?: string;
  metadata?: Record<string, unknown>;
}

export interface BookConsultationPayload {
  fullName: string;
  email: string;
  phone?: string;
  scheduledAt: string;
  reason?: string;
  notes?: string;
  // S6 (legal-compliance): el backend exige aceptación explícita del Aviso.
  acceptedPrivacyNotice: boolean;
}

