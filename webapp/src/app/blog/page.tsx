'use client';

import { Navbar } from "@/features/public/components/Navbar";
import { Footer } from "@/features/public/components/Footer";
import { Badge } from "@/shared/components/atoms/Badge"; // Assuming a Badge component exists or we'll make a simple one inline if not
import { Calendar, Tag, ArrowRight, Star, Zap, Info } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useTranslation } from "@/context/i18n.context";

// Publicaciones reales cuando existan un CMS/backend de blog.
// Mientras tanto la página muestra el estado vacío ("No hay publicaciones").
export const BLOG_POSTS: Array<{
    id: number;
    titleKey?: string;
    title?: string;
    excerpt?: string;
    image: string | null;
    date: string;
    category: string;
    author: string;
}> = [];

const CATEGORIES = ["all", "major", "features", "security", "integration", "news"];

export default function BlogPage() {
    const { t } = useTranslation();
    const [selectedCategory, setSelectedCategory] = useState("all");

    // Hydrate posts with translations
    const posts = BLOG_POSTS.map((post, idx) => ({
        ...post,
        categoryLabel: t(`landing.blog.categories.${post.category.toLowerCase().split(' ')[0]}`) || post.category
    }));

    const filteredPosts = selectedCategory === "all"
        ? posts
        : posts.filter(post => post.category.toLowerCase().includes(selectedCategory === 'major' ? 'major' : selectedCategory));
    // Simplified category matching logic for the demo

    const getCategoryColor = (cat: string) => {
        // ... same logic but check against the original category ID or normalized string
        if (cat.includes('Major')) return 'text-purple-600 bg-purple-100';
        if (cat.includes('Features')) return 'text-emerald-600 bg-emerald-100';
        if (cat.includes('Security')) return 'text-green-600 bg-green-100';
        if (cat.includes('Integration')) return 'text-orange-600 bg-orange-100';
        return 'text-base-content/60 bg-base-200';
    };

    const getCategoryIcon = (cat: string) => {
        if (cat.includes('Major')) return <Star size={14} className="mr-1" />;
        if (cat.includes('Features')) return <Zap size={14} className="mr-1" />;
        if (cat.includes('Security')) return <Tag size={14} className="mr-1" />;
        return <Info size={14} className="mr-1" />;
    };

    return (
        <div className="min-h-screen flex flex-col bg-base-200">
            <Navbar />

            <main className="flex-grow pt-28 pb-16 px-4">
                {/* Header */}
                <div className="text-center mb-16 max-w-3xl mx-auto animate-fade-in-up">
                    <span className="text-primary font-bold tracking-wider text-sm uppercase mb-2 block">{t('landing.blog.header.kicker')}</span>
                    <h1 className="text-4xl md:text-5xl font-extrabold text-base-content mb-6">
                        {t('landing.blog.header.title')}
                    </h1>
                    <p className="text-lg text-base-content/60 leading-relaxed">
                        {t('landing.blog.header.desc')}
                    </p>
                </div>

                {/* Categories */}
                <div className="flex flex-wrap justify-center gap-2 mb-12 animate-fade-in-up delay-100">
                    {CATEGORIES.map(catKey => (
                        <button
                            key={catKey}
                            onClick={() => setSelectedCategory(catKey)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedCategory === catKey
                                ? 'bg-base-content text-base-100 shadow-lg transform scale-105'
                                : 'bg-base-100 text-base-content/60 hover:bg-base-200 border border-base-300'
                                }`}
                        >
                            {t(`landing.blog.categories.${catKey}`)}
                        </button>
                    ))}
                </div>

                {/* Feed */}
                <div className="max-w-4xl mx-auto space-y-8">
                    {filteredPosts.length > 0 ? (
                        filteredPosts.map((post) => (
                            <article
                                key={post.id}
                                className="bg-base-100 rounded-3xl shadow-sm hover:shadow-xl border border-base-300 overflow-hidden transition-all duration-300 group flex flex-col md:flex-row"
                            >
                                {post.image && (
                                    <div className="md:w-1/3 h-52 md:h-auto overflow-hidden relative">
                                        <div className="absolute inset-0 bg-slate-900/10 group-hover:bg-transparent transition-colors z-10" />
                                        <img
                                            src={post.image}
                                            alt={post.title}
                                            className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                                        />
                                    </div>
                                )}
                                <div className={`p-8 flex flex-col justify-center ${post.image ? 'md:w-2/3' : 'w-full'}`}>
                                    <div className="flex items-center gap-3 mb-4 text-xs font-semibold">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full ${getCategoryColor(post.category)}`}>
                                            {getCategoryIcon(post.category)}
                                            {/* Translate the category label displayed */}
                                            {t(`landing.blog.categories.${post.category.toLowerCase().split(' ')[0]}`) || post.category}
                                        </span>
                                        <span className="text-base-content/60 flex items-center">
                                            <Calendar size={12} className="mr-1" /> {post.date}
                                        </span>
                                    </div>
                                    <h2 className="text-2xl font-bold text-base-content mb-3 group-hover:text-primary transition-colors">
                                        <Link href={`/blog/${post.id}`} className="focus:outline-none">
                                            {post.title}
                                        </Link>
                                    </h2>
                                    <p className="text-base-content/60 mb-6 line-clamp-3">
                                        {post.excerpt}
                                    </p>
                                    <div className="flex items-center justify-between mt-auto">
                                        <span className="text-sm font-medium text-base-content/60">
                                            {t('landing.blog.card.by')} <span className="text-base-content">{post.author}</span>
                                        </span>
                                        <Link href={`/blog/${post.id}`} className="text-primary font-bold text-sm inline-flex items-center hover:translate-x-1 transition-transform">
                                            {t('landing.blog.card.read_more')} <ArrowRight size={16} className="ml-1" />
                                        </Link>
                                    </div>
                                </div>
                            </article>
                        ))
                    ) : (
                        <div className="text-center py-20 bg-base-100 rounded-3xl border border-dashed border-base-300">
                            <p className="text-base-content/60">{t('landing.blog.empty.message')}</p>
                            <button onClick={() => setSelectedCategory("all")} className="text-primary font-bold mt-2 hover:underline">{t('landing.blog.empty.view_all')}</button>
                        </div>
                    )}
                </div>

                {/* Newsletter / CTA */}
                <div className="mt-20 max-w-4xl mx-auto bg-slate-900 rounded-3xl p-8 md:p-12 text-center text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/20 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none"></div>

                    <div className="relative z-10 max-w-xl mx-auto">
                        <h3 className="text-2xl font-bold mb-4">{t('landing.blog.newsletter.title')}</h3>
                        <p className="text-slate-300 mb-8">{t('landing.blog.newsletter.desc')}</p>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <input type="email" placeholder={t('landing.blog.newsletter.placeholder')} className="input input-bordered w-full text-slate-900 bg-white" />
                            <button className="btn btn-primary px-8">{t('landing.blog.newsletter.btn')}</button>
                        </div>
                    </div>
                </div>

            </main>

            <Footer />
        </div>
    );
}
