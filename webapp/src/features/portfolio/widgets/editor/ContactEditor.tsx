"use client";

import { Input } from "@/shared/components/atoms/Input";
import { Toggle } from "@/shared/components/atoms/Toggle";
import type { ContactContent } from "@/features/portfolio/widgets/types";

interface ContactEditorProps {
  content: ContactContent;
  onChange: (content: ContactContent) => void;
}

export function ContactEditor({ content, onChange }: ContactEditorProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email</label>
        <Input type="email" value={content.email ?? ""} onChange={(e) => onChange({ ...content, email: e.target.value })} placeholder="nutricionista@email.com" />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Teléfono</label>
        <Input value={content.phone ?? ""} onChange={(e) => onChange({ ...content, phone: e.target.value })} placeholder="+54 11 1234-5678" />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">WhatsApp</label>
        <Input value={content.whatsapp ?? ""} onChange={(e) => onChange({ ...content, whatsapp: e.target.value })} placeholder="+54 11 1234-5678" />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Dirección</label>
        <Input value={content.address ?? ""} onChange={(e) => onChange({ ...content, address: e.target.value })} placeholder="Av. Corrientes 1234, CABA" />
      </div>
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-600">Mostrar formulario de contacto</label>
        <Toggle checked={content.showContactForm ?? false} onChange={(e) => onChange({ ...content, showContactForm: e.target.checked })} variant="success" size="sm" />
      </div>
    </div>
  );
}
