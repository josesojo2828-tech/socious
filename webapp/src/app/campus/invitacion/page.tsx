'use client';

import { useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import gsap from 'gsap';

function CampusInvitacionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const codeParam = searchParams.get('code') || '';

  const mainCardRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const ctaContainerRef = useRef<HTMLDivElement>(null);
  const confettiWrapperRef = useRef<HTMLDivElement>(null);
  const bgBlobsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. Initial State for entrance
    gsap.set(mainCardRef.current, { scale: 0.9, opacity: 0 });
    if (headlineRef.current) {
      gsap.set(headlineRef.current.querySelectorAll('span'), { y: 30, opacity: 0 });
    }
    gsap.set(ctaContainerRef.current, { y: 20, opacity: 0 });

    const tl = gsap.timeline();

    // 2. Entrance Animation
    tl.to(mainCardRef.current, {
      duration: 1.2,
      scale: 1,
      opacity: 1,
      ease: 'expo.out',
    });

    if (headlineRef.current) {
      tl.to(
        headlineRef.current.querySelectorAll('span'),
        {
          duration: 0.8,
          y: 0,
          opacity: 1,
          stagger: 0.2,
          ease: 'power3.out',
        },
        '-=0.8'
      );
    }

    tl.to(
      ctaContainerRef.current,
      {
        duration: 0.8,
        y: 0,
        opacity: 1,
        ease: 'power2.out',
        onComplete: createConfetti,
      },
      '-=0.4'
    );

    // 3. Floating Blobs Animation
    if (bgBlobsRef.current) {
      const blobs = bgBlobsRef.current.querySelectorAll('.blob');
      blobs.forEach((blob) => {
        gsap.to(blob, {
          x: 'random(-100, 100)',
          y: 'random(-100, 100)',
          duration: 'random(10, 20)',
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
      });
    }

    // 4. Confetti Effect Function
    function createConfetti() {
      const colors = ['#9333ea', '#a7f3d0', '#ffffff', '#059669'];
      const container = confettiWrapperRef.current;
      if (!container) return;

      for (let i = 0; i < 80; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.position = 'absolute';
        confetti.style.width = '10px';
        confetti.style.height = '10px';
        confetti.style.opacity = '0.8';
        confetti.style.zIndex = '1';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.top = '-20px';
        container.appendChild(confetti);

        gsap.to(confetti, {
          y: window.innerHeight + 50,
          x: 'random(-200, 200)',
          rotation: 'random(0, 360)',
          duration: 'random(2, 4)',
          ease: 'power1.out',
          delay: Math.random() * 0.5,
          opacity: 0,
          onComplete: () => confetti.remove(),
        });
      }
    }
  }, []);

  const handleStart = () => {
    if (codeParam) {
      router.push(`/register?ref=${codeParam}`);
    } else {
      router.push('/campus/solicitar');
    }
  };

  return (
    <div
      className="relative min-h-screen w-full flex items-center justify-center overflow-hidden p-6 bg-[#064e3b] font-sans text-white select-none"
      style={{
        margin: 0,
        padding: 0,
        boxSizing: 'border-box',
      }}
    >
      {/* Background Blobs */}
      <div ref={bgBlobsRef} className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="blob absolute w-[500px] h-[500px] bg-[#9333ea] rounded-full blur-[80px] opacity-40 top-[-10%] right-[-10%]"
          style={{ filter: 'blur(80px)' }}
        ></div>
        <div
          className="blob absolute w-[600px] h-[600px] bg-[#a7f3d0] rounded-full blur-[80px] opacity-30 bottom-[-20%] left-[-10%]"
          style={{ filter: 'blur(80px)' }}
        ></div>
        <div
          className="blob absolute w-[400px] h-[400px] bg-emerald-500 rounded-full blur-[80px] opacity-30 top-[20%] left-[10%]"
          style={{ filter: 'blur(80px)' }}
        ></div>
      </div>

      {/* Confetti Container */}
      <div ref={confettiWrapperRef} className="absolute inset-0 pointer-events-none z-20"></div>

      {/* Main Container */}
      <main
        ref={mainCardRef}
        className="relative z-10 max-w-2xl w-full text-center px-4"
      >
        {/* Title */}
        <h1
          ref={headlineRef}
          className="font-display text-4xl md:text-6xl lg:text-7xl font-bold mb-10 leading-[1.1] tracking-tight text-center"
        >
          <span className="block text-white/95">Bienvenido a tus,</span>
          <span className="block text-[#a7f3d0] italic">prácticas profesionales!</span>
        </h1>

        {/* Action Button */}
        <div ref={ctaContainerRef}>
          <button
            onClick={handleStart}
            className="bg-[#9333ea] hover:bg-[#7e22ce] text-white px-12 py-5 rounded-full text-xl font-bold transition-transform hover:scale-105 active:scale-95 shadow-2xl shadow-purple-900/40 cursor-pointer inline-flex items-center gap-3 group border-none outline-none"
          >
            <span>Comenzar mi Carrera</span>
            <svg
              className="w-6 h-6 transform group-hover:translate-x-1 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              ></path>
            </svg>
          </button>
        </div>
      </main>

      {/* Decorative Wave at the Bottom */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-[0] pointer-events-none">
        <svg
          className="relative block w-full h-[150px]"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
        >
          <path
            d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.8C1132.19,118.92,1055.71,111.31,985.66,92.83Z"
            fill="#a7f3d0"
            opacity="0.05"
          ></path>
        </svg>
      </div>
    </div>
  );
}

export default function CampusInvitacionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full flex items-center justify-center bg-[#064e3b] text-white">
        <div className="animate-pulse">Cargando invitación...</div>
      </div>
    }>
      <CampusInvitacionContent />
    </Suspense>
  );
}
