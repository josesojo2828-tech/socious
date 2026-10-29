import { Mail, Phone, MessageCircle, MapPin, Send } from "lucide-react";
import type { ContactContent, Palette } from "../types";
import { SectionHeading } from "../ui/SectionHeading";
import { ContactInfoList } from "../ui/ContactInfoList";

interface ContactWidgetProps {
  content: ContactContent;
  palette: Palette;
}

export function ContactWidget({ content, palette }: ContactWidgetProps) {
  const { email, phone, whatsapp, address, showContactForm } = content;
  const hasInfo = email || phone || whatsapp || address;

  if (!hasInfo && !showContactForm) return null;

  const contactItems = [];
  if (email) contactItems.push({ icon: <Mail className="w-5 h-5" />, label: email, href: `mailto:${email}` });
  if (phone) contactItems.push({ icon: <Phone className="w-5 h-5" />, label: phone, href: `tel:${phone}` });
  if (whatsapp) contactItems.push({ icon: <MessageCircle className="w-5 h-5" />, label: whatsapp, href: `https://wa.me/${whatsapp.replace(/[^0-9]/g, "")}`, isExternal: true });
  if (address) contactItems.push({ icon: <MapPin className="w-5 h-5" />, label: address });

  return (
    <>
      <SectionHeading badge="Contacto" title="Conversemos" />

      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-5 min-h-full">
            {/* Left: Contact Info */}
            {hasInfo && (
              <div className="md:col-span-2 p-6 md:p-8 bg-gradient-to-br from-[var(--p-primary)] to-[var(--p-secondary)] text-white">
                <h3 className="text-lg font-bold mb-6">Información de contacto</h3>
                <ContactInfoList items={contactItems} />
                <div className="mt-8 flex gap-2">
                  <div className="w-2 h-2 rounded-full bg-white/20" />
                  <div className="w-2 h-2 rounded-full bg-white/15" />
                  <div className="w-2 h-2 rounded-full bg-white/10" />
                </div>
              </div>
            )}

            {/* Right: Contact Form */}
            {showContactForm && (
              <div className={`p-6 md:p-8 ${hasInfo ? "md:col-span-3" : "md:col-span-5"}`}>
                <h3 className="text-lg font-bold text-[var(--p-primary)] mb-6">Enviame un mensaje</h3>
                <form className="space-y-4" action="#">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input type="text" placeholder="Tu nombre" className="w-full px-4 py-3.5 rounded-xl border border-[var(--p-accent)]/30 bg-[var(--p-bg)] text-[var(--p-text)] placeholder:text-[var(--p-text)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--p-primary)]/30 focus:border-[var(--p-primary)] transition-all" />
                    <input type="email" placeholder="Tu email" className="w-full px-4 py-3.5 rounded-xl border border-[var(--p-accent)]/30 bg-[var(--p-bg)] text-[var(--p-text)] placeholder:text-[var(--p-text)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--p-primary)]/30 focus:border-[var(--p-primary)] transition-all" />
                  </div>
                  <input type="text" placeholder="Asunto" className="w-full px-4 py-3.5 rounded-xl border border-[var(--p-accent)]/30 bg-[var(--p-bg)] text-[var(--p-text)] placeholder:text-[var(--p-text)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--p-primary)]/30 focus:border-[var(--p-primary)] transition-all" />
                  <textarea placeholder="Tu mensaje" rows={4} className="w-full px-4 py-3.5 rounded-xl border border-[var(--p-accent)]/30 bg-[var(--p-bg)] text-[var(--p-text)] placeholder:text-[var(--p-text)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--p-primary)]/30 focus:border-[var(--p-primary)] transition-all resize-none" />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-[var(--p-primary)] to-[var(--p-secondary)] text-white font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all cursor-pointer border-0"
                  >
                    <Send className="w-4 h-4" />
                    Enviar mensaje
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
