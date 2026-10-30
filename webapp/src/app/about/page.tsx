'use client';

import { ArrowLeft, Compass, Eye, Target } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { apiClient } from "@/shared/api/api.client";
import { parseMarkdown } from "@/shared/components/organisms/DynamicForm/MarkdownEditor";
import { PublicFooter, PublicHeader } from "@/shared/components/molecules/PublicShell";

interface CmsContent {
  title: string;
  description: string;
  content: string;
}

export default function AboutPage() {
  const [mission, setMission] = useState<CmsContent | null>(null);
  const [vision, setVision] = useState<CmsContent | null>(null);
  const [objectives, setObjectives] = useState<CmsContent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient.get('/api/cms/public/key/mission').then(res => res.data).catch(() => null),
      apiClient.get('/api/cms/public/key/vision').then(res => res.data).catch(() => null),
      apiClient.get('/api/cms/public/key/objectives').then(res => res.data).catch(() => null),
    ])
      .then(([missionData, visionData, objectivesData]) => {
        setMission(missionData);
        setVision(visionData);
        setObjectives(objectivesData);
      })
      .catch(err => {
        console.error("Error fetching about content from CMS:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-base-200 font-sans text-base-content">
      <PublicHeader />

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
          <div className="container mx-auto px-6 lg:px-8 max-w-5xl">
            <Link href="/" className="inline-flex items-center text-sm font-bold text-base-content/60 hover:text-primary mb-6 transition-colors group">
              <ArrowLeft size={16} className="mr-2 group-hover:-translate-x-0.5 transition-transform" />
              Volver al inicio
            </Link>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-base-content leading-tight">
              Sobre Nosotros
            </h1>
            <p className="text-base-content/60 text-sm sm:text-base font-medium mt-2 max-w-2xl">
              Conoce nuestra misión, visión y los objetivos que nos impulsan a transformar el sector de la salud y nutrición.
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-6 lg:px-8 max-w-5xl relative z-10">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-pulse">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-base-100 rounded-[2rem] border border-base-300 p-8 space-y-4 shadow-sm">
                  <div className="w-12 h-12 bg-base-200 rounded-2xl"></div>
                  <div className="h-6 bg-base-200 rounded w-1/2"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-base-200 rounded w-full"></div>
                    <div className="h-4 bg-base-200 rounded w-5/6"></div>
                    <div className="h-4 bg-base-200 rounded w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-8">
              {/* Mission & Vision Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Misión */}
                <div className="bg-base-100 rounded-[2rem] border border-base-300 shadow-xl p-8 hover:shadow-2xl transition-all duration-300 flex flex-col items-start">
                  <span className="p-3.5 bg-primary/10 rounded-2xl text-primary border border-primary/15 mb-6 inline-block shadow-sm">
                    <Compass size={28} />
                  </span>
                  <h2 className="text-2xl font-black text-base-content mb-4">
                    {mission?.title || "Misión"}
                  </h2>
                  <div
                    className="markdown-content max-w-none text-base-content/60 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: parseMarkdown(mission?.content || "") }}
                  />
                </div>

                {/* Visión */}
                <div className="bg-base-100 rounded-[2rem] border border-base-300 shadow-xl p-8 hover:shadow-2xl transition-all duration-300 flex flex-col items-start">
                  <span className="p-3.5 bg-primary/10 rounded-2xl text-primary border border-primary/15 mb-6 inline-block shadow-sm">
                    <Eye size={28} />
                  </span>
                  <h2 className="text-2xl font-black text-base-content mb-4">
                    {vision?.title || "Visión"}
                  </h2>
                  <div
                    className="markdown-content max-w-none text-base-content/60 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: parseMarkdown(vision?.content || "") }}
                  />
                </div>
              </div>

              {/* Objectives Card */}
              {objectives && (
                <div className="bg-base-100 rounded-[2rem] border border-base-300 shadow-xl p-8 md:p-12 hover:shadow-2xl transition-all duration-300">
                  <div className="flex items-center gap-4 mb-8">
                    <span className="p-3.5 bg-primary/10 rounded-2xl text-primary border border-primary/15 inline-block shadow-sm">
                      <Target size={28} />
                    </span>
                    <div>
                      <h2 className="text-2xl font-black text-base-content">
                        {objectives.title || "Objetivos"}
                      </h2>
                      <p className="text-base-content/60 text-xs font-semibold mt-0.5">
                        {objectives.description || "Nuestras metas de desarrollo continuo"}
                      </p>
                    </div>
                  </div>
                  <div
                    className="markdown-content max-w-none break-words leading-relaxed text-base-content/80"
                    dangerouslySetInnerHTML={{ __html: parseMarkdown(objectives.content || "") }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
