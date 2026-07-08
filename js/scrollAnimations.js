export function initScrollAnimations() {
    gsap.registerPlugin(ScrollTrigger);

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) return;

    // Navbar background on scroll
    ScrollTrigger.create({
        start: 'top -50',
        onEnter: () => gsap.to('#navbar', { backgroundColor: 'rgba(11, 13, 16, 0.95)', duration: 0.3 }),
        onLeaveBack: () => gsap.to('#navbar', { backgroundColor: 'transparent', duration: 0.3 }),
    });

    // Hero Text Reveal
    gsap.from('.reveal-text', {
        y: 100,
        opacity: 0,
        duration: 1,
        ease: 'power4.out',
        stagger: 0.2
    });

    gsap.from('.reveal-text-sub', {
        opacity: 0,
        duration: 1,
        delay: 0.5
    });

    // Scroll Cue Fade Out
    gsap.to('.scroll-cue', {
        opacity: 0,
        scrollTrigger: {
            trigger: '#showroom',
            start: 'top top',
            end: '20% top',
            scrub: true
        }
    });

    // Inventory Cards Reveal
    gsap.from('.car-card', {
        scrollTrigger: {
            trigger: '#inventory',
            start: 'top 80%',
        },
        y: 60,
        opacity: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: 'power2.out'
    });

    // Trust Section Reveal
    gsap.from('.trust-stats, .trust-text', {
        scrollTrigger: {
            trigger: '#trust',
            start: 'top 80%',
        },
        y: 40,
        opacity: 0,
        duration: 1,
        stagger: 0.2,
        ease: 'power2.out'
    });

    // Contact Cards Reveal
    gsap.from('.contact-card', {
        scrollTrigger: {
            trigger: '#contact',
            start: 'top 80%',
        },
        scale: 0.9,
        opacity: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: 'back.out(1.7)'
    });

    // 3D Camera Move on Scroll (Stretch Goal)
    if (window.CD3D.camera) {
        gsap.to(window.CD3D.camera.position, {
            scrollTrigger: {
                trigger: '#showroom',
                start: 'top top',
                end: 'bottom top',
                scrub: 1
            },
            x: -5,
            y: 5,
            z: 12
        });
    }
}
