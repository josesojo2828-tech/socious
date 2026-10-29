'use client';

import { Navbar } from "@/features/public/components/Navbar";
import { Footer } from "@/features/public/components/Footer";
import { useTranslation } from "@/context/i18n.context";
import { ArrowLeft, Scale } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { apiClient } from "@/shared/api/api.client";
import { parseMarkdown } from "@/shared/components/organisms/DynamicForm/MarkdownEditor";

interface CmsContent {
  title: string;
  description: string;
  content: string;
  updatedAt?: string;
}

export default function TermsPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<CmsContent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/api/cms/public/key/terms')
      .then(res => {
        setData(res.data);
      })
      .catch(err => {
        console.error("Error fetching terms from CMS:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-base-200 font-sans text-base-content">
      <Navbar />

      <main className="flex-grow pt-24 pb-16 relative">
        {/* Decorative Background Blobs */}
        <div className="absolute top-0 right-0 -z-10 opacity-30 translate-x-1/4 pointer-events-none">
          <div className="w-[600px] h-[600px] rounded-full bg-[#2b0c4f]/10 blur-[150px]" />
        </div>
        <div className="absolute bottom-0 left-0 -z-10 opacity-35 -translate-x-1/3 pointer-events-none">
          <div className="w-[500px] h-[500px] rounded-full bg-[#0d0ea0]/10 blur-[130px]" />
        </div>

        {/* Header */}
        <div className="bg-base-100/80 backdrop-blur-md border-b border-base-300 py-16 mb-12 relative overflow-hidden shadow-sm">
          <div className="container mx-auto px-6 lg:px-8 max-w-4xl">
            <Link href="/" className="inline-flex items-center text-sm font-bold text-base-content/60 hover:text-primary mb-6 transition-colors group">
              <ArrowLeft size={16} className="mr-2 group-hover:-translate-x-0.5 transition-transform" />
              Volver al inicio
            </Link>
            
            {loading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-10 bg-base-200 rounded-xl w-2/3"></div>
                <div className="h-6 bg-base-200 rounded-xl w-1/2"></div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="p-3.5 bg-primary/10 rounded-2xl text-primary border border-primary/15 inline-block shadow-sm">
                    <Scale size={32} />
                  </span>
                  <div>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-base-content leading-tight">
                      {data?.title || "Términos y Condiciones"}
                    </h1>
                    <p className="text-base-content/60 text-sm font-medium mt-1">
                      {data?.description || "Condiciones de uso de Nutringest"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-6 lg:px-8 max-w-4xl relative z-10">
          <div className="bg-base-100 rounded-[2rem] border border-base-300 shadow-xl p-8 md:p-14 hover:shadow-2xl transition-all duration-300">
            {loading ? (
              <div className="animate-pulse space-y-6">
                <div className="h-4 bg-base-200 rounded w-full"></div>
                <div className="h-4 bg-base-200 rounded w-5/6"></div>
                <div className="h-4 bg-base-200 rounded w-4/5"></div>
                <div className="h-4 bg-base-200 rounded w-full"></div>
                <div className="h-4 bg-base-200 rounded w-2/3"></div>
              </div>
            ) : (
              <div
                className="markdown-content max-w-none break-words leading-relaxed text-base-content/80"
                dangerouslySetInnerHTML={{ __html: parseMarkdown(data?.content || "") }}
              />
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
