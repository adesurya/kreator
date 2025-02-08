// public/js/landing.js

document.addEventListener('DOMContentLoaded', function() {
    // Initialize variables
    const header = document.querySelector('nav');
    const mobileMenuButton = document.querySelector('[onclick="toggleMobileMenu()"]');
    const mobileMenu = document.getElementById('mobile-menu');
    let lastScroll = 0;
    
    // Scroll Animation Observer
    const scrollObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                if (entry.target.classList.contains('stagger-animation')) {
                    staggerChildren(entry.target);
                }
            }
        });
    }, {
        threshold: 0.1
    });

    // Observe all scroll trigger elements
    document.querySelectorAll('.scroll-trigger').forEach(element => {
        scrollObserver.observe(element);
    });

    // Stagger animation for children elements
    function staggerChildren(parent) {
        const children = parent.children;
        Array.from(children).forEach((child, index) => {
            child.style.transitionDelay = `${index * 100}ms`;
            child.classList.add('visible');
        });
    }

    // Header scroll behavior
    function handleScroll() {
        const currentScroll = window.pageYOffset;
        
        if (currentScroll <= 0) {
            header.classList.remove('shadow-lg');
            header.classList.add('bg-transparent');
            return;
        }

        if (currentScroll > lastScroll && currentScroll > 100) {
            // Scrolling down
            header.classList.add('-translate-y-full');
            header.classList.remove('shadow-lg');
        } else {
            // Scrolling up
            header.classList.remove('-translate-y-full');
            header.classList.add('shadow-lg', 'bg-white', 'bg-opacity-90');
        }

        lastScroll = currentScroll;
    }

    window.addEventListener('scroll', handleScroll, { passive: true });

    // Mobile menu toggle
    window.toggleMobileMenu = function() {
        const isHidden = mobileMenu.classList.contains('hidden');
        
        if (isHidden) {
            mobileMenu.classList.remove('hidden');
            setTimeout(() => mobileMenu.classList.add('visible'), 10);
        } else {
            mobileMenu.classList.remove('visible');
            setTimeout(() => mobileMenu.classList.add('hidden'), 300);
        }
        
        // Toggle menu icon
        const menuIcon = mobileMenuButton.querySelector('svg');
        menuIcon.classList.toggle('rotate-90');
    };

    // Close mobile menu on click outside
    document.addEventListener('click', function(event) {
        if (!mobileMenu.contains(event.target) && 
            !mobileMenuButton.contains(event.target) && 
            !mobileMenu.classList.contains('hidden')) {
            toggleMobileMenu();
        }
    });

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            
            if (target) {
                // Close mobile menu if open
                if (!mobileMenu.classList.contains('hidden')) {
                    toggleMobileMenu();
                }

                // Smooth scroll to target
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Feature cards hover effect
    document.querySelectorAll('.feature-card').forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.querySelector('.feature-icon').classList.add('rotate-6');
        });

        card.addEventListener('mouseleave', function() {
            this.querySelector('.feature-icon').classList.remove('rotate-6');
        });
    });

    // Pricing toggle
    const pricingToggle = document.getElementById('pricing-toggle');
    if (pricingToggle) {
        pricingToggle.addEventListener('change', function() {
            const monthlyPrices = document.querySelectorAll('.monthly-price');
            const yearlyPrices = document.querySelectorAll('.yearly-price');
            const monthlyText = document.getElementById('monthly-text');
            const yearlyText = document.getElementById('yearly-text');

            if (this.checked) {
                // Show yearly prices
                monthlyPrices.forEach(el => el.classList.add('hidden'));
                yearlyPrices.forEach(el => el.classList.remove('hidden'));
                monthlyText.classList.remove('font-semibold', 'text-gray-900');
                yearlyText.classList.add('font-semibold', 'text-gray-900');
            } else {
                // Show monthly prices
                monthlyPrices.forEach(el => el.classList.remove('hidden'));
                yearlyPrices.forEach(el => el.classList.add('hidden'));
                monthlyText.classList.add('font-semibold', 'text-gray-900');
                yearlyText.classList.remove('font-semibold', 'text-gray-900');
            }
        });
    }

    // Testimonial carousel
    const testimonialContainer = document.querySelector('.testimonial-container');
    if (testimonialContainer) {
        const testimonials = testimonialContainer.querySelectorAll('.testimonial-card');
        let currentTestimonial = 0;
        const autoplayInterval = 5000; // 5 seconds

        function showTestimonial(index) {
            testimonials.forEach((testimonial, i) => {
                if (i === index) {
                    testimonial.classList.remove('hidden');
                    testimonial.classList.add('animate-fade-in');
                } else {
                    testimonial.classList.add('hidden');
                    testimonial.classList.remove('animate-fade-in');
                }
            });
        }

        function nextTestimonial() {
            currentTestimonial = (currentTestimonial + 1) % testimonials.length;
            showTestimonial(currentTestimonial);
        }

        // Auto rotate testimonials
        let autoplayTimer = setInterval(nextTestimonial, autoplayInterval);

        // Pause autoplay on hover
        testimonialContainer.addEventListener('mouseenter', () => {
            clearInterval(autoplayTimer);
        });

        testimonialContainer.addEventListener('mouseleave', () => {
            autoplayTimer = setInterval(nextTestimonial, autoplayInterval);
        });
    }

    // Statistics counter animation
    const stats = document.querySelectorAll('.stat-number');
    stats.forEach(stat => {
        const target = parseInt(stat.getAttribute('data-target'));
        const duration = 2000; // 2 seconds
        const step = target / (duration / 16); // 60fps
        let current = 0;

        function updateCounter() {
            current += step;
            if (current < target) {
                stat.textContent = Math.floor(current).toLocaleString();
                requestAnimationFrame(updateCounter);
            } else {
                stat.textContent = target.toLocaleString();
            }
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    updateCounter();
                    observer.unobserve(entry.target);
                }
            });
        });

        observer.observe(stat);
    });

    // Contact form validation
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            const submitButton = this.querySelector('button[type="submit"]');
            
            // Disable submit button
            submitButton.disabled = true;
            submitButton.innerHTML = '<span class="loading-spinner"></span> Sending...';

            // Simulate form submission
            setTimeout(() => {
                submitButton.innerHTML = 'Message Sent!';
                submitButton.classList.remove('bg-blue-600');
                submitButton.classList.add('bg-green-600');
                this.reset();

                // Reset button after 3 seconds
                setTimeout(() => {
                    submitButton.disabled = false;
                    submitButton.innerHTML = 'Send Message';
                    submitButton.classList.remove('bg-green-600');
                    submitButton.classList.add('bg-blue-600');
                }, 3000);
            }, 1500);
        });
    }

    // Video modal
    const videoTriggers = document.querySelectorAll('[data-video]');
    videoTriggers.forEach(trigger => {
        trigger.addEventListener('click', function() {
            const videoId = this.getAttribute('data-video');
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75';
            modal.innerHTML = `
                <div class="relative w-full max-w-4xl aspect-video">
                    <iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1" 
                            class="w-full h-full"
                            allow="autoplay; encrypted-media" 
                            allowfullscreen></iframe>
                    <button class="absolute top-4 right-4 text-white hover:text-gray-300">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
            `;

            document.body.appendChild(modal);
            document.body.style.overflow = 'hidden';

            modal.querySelector('button').addEventListener('click', () => {
                document.body.removeChild(modal);
                document.body.style.overflow = '';
            });

            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    document.body.removeChild(modal);
                    document.body.style.overflow = '';
                }
            });
        });
    });

    // Initialize custom cursor (if enabled)
    const cursor = document.createElement('div');
    cursor.className = 'custom-cursor';
    document.body.appendChild(cursor);

    document.addEventListener('mousemove', (e) => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
    });

    document.addEventListener('mousedown', () => cursor.classList.add('cursor-clicked'));
    document.addEventListener('mouseup', () => cursor.classList.remove('cursor-clicked'));

    // Add parallax effect to hero section
    const heroImage = document.querySelector('.hero-image');
    if (heroImage) {
        window.addEventListener('mousemove', (e) => {
            const { clientX, clientY } = e;
            const xPos = (clientX / window.innerWidth - 0.5) * 20;
            const yPos = (clientY / window.innerHeight - 0.5) * 20;
            heroImage.style.transform = `translate(${xPos}px, ${yPos}px)`;
        });
    }
});