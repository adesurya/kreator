// public/js/pricing.js

document.addEventListener('DOMContentLoaded', function() {
    // Pricing toggle functionality
    const toggle = document.getElementById('pricing-toggle');
    const monthlyPrices = document.querySelectorAll('.monthly-price');
    const yearlyPrices = document.querySelectorAll('.yearly-price');
    const monthlyText = document.getElementById('monthly-text');
    const yearlyText = document.getElementById('yearly-text');

    toggle.addEventListener('click', function() {
        const isYearly = toggle.getAttribute('aria-checked') === 'true';
        toggle.setAttribute('aria-checked', !isYearly);
        
        if (!isYearly) {
            // Switch to yearly
            monthlyPrices.forEach(el => el.classList.add('hidden'));
            yearlyPrices.forEach(el => el.classList.remove('hidden'));
            monthlyText.classList.remove('font-semibold', 'text-gray-900');
            monthlyText.classList.add('text-gray-500');
            yearlyText.classList.remove('text-gray-500');
            yearlyText.classList.add('font-semibold', 'text-gray-900');
            toggle.querySelector('span').classList.add('translate-x-5');
        } else {
            // Switch to monthly
            monthlyPrices.forEach(el => el.classList.remove('hidden'));
            yearlyPrices.forEach(el => el.classList.add('hidden'));
            yearlyText.classList.remove('font-semibold', 'text-gray-900');
            yearlyText.classList.add('text-gray-500');
            monthlyText.classList.remove('text-gray-500');
            monthlyText.classList.add('font-semibold', 'text-gray-900');
            toggle.querySelector('span').classList.remove('translate-x-5');
        }
    });

    // FAQ Accordion functionality
    const faqButtons = document.querySelectorAll('[role="button"]');
    
    faqButtons.forEach(button => {
        button.addEventListener('click', () => {
            const isExpanded = button.getAttribute('aria-expanded') === 'true';
            const answer = button.parentElement.nextElementSibling;
            const icon = button.querySelector('svg');
            
            // Close all other sections
            faqButtons.forEach(otherButton => {
                if (otherButton !== button) {
                    otherButton.setAttribute('aria-expanded', 'false');
                    otherButton.parentElement.nextElementSibling.classList.add('hidden');
                    otherButton.querySelector('svg').classList.remove('-rotate-180');
                }
            });
            
            // Toggle current section
            button.setAttribute('aria-expanded', !isExpanded);
            answer.classList.toggle('hidden');
            icon.classList.toggle('-rotate-180');
            
            // Smooth scroll if needed
            if (!isExpanded && window.innerWidth < 768) {
                const topOffset = button.getBoundingClientRect().top + window.pageYOffset - 20;
                window.scrollTo({
                    top: topOffset,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Feature hover effects
    const features = document.querySelectorAll('.feature-card');
    features.forEach(feature => {
        feature.addEventListener('mouseenter', function() {
            this.classList.add('transform', 'scale-105', 'shadow-lg');
        });

        feature.addEventListener('mouseleave', function() {
            this.classList.remove('transform', 'scale-105', 'shadow-lg');
        });
    });

    // Price animation on scroll
    const priceElements = document.querySelectorAll('.price-animate');
    const animatePrice = (element) => {
        const finalPrice = parseInt(element.dataset.price);
        const duration = 1000;
        const steps = 20;
        const stepValue = finalPrice / steps;
        let currentStep = 0;

        const animation = setInterval(() => {
            currentStep++;
            const currentValue = Math.floor(stepValue * currentStep);
            element.textContent = currentValue;

            if (currentStep === steps) {
                clearInterval(animation);
                element.textContent = finalPrice;
            }
        }, duration / steps);
    };

    const priceObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animatePrice(entry.target);
                priceObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.5
    });

    priceElements.forEach(element => {
        priceObserver.observe(element);
    });

    // Mobile responsive adjustments
    const handleResize = () => {
        const pricingCards = document.querySelectorAll('.pricing-card');
        if (window.innerWidth < 768) {
            pricingCards.forEach(card => {
                card.classList.remove('hover:scale-105');
            });
        } else {
            pricingCards.forEach(card => {
                card.classList.add('hover:scale-105');
            });
        }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check
});

// Helper function for smooth scrolling
function scrollToElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// Handle hash links in URL
if (window.location.hash) {
    setTimeout(() => {
        scrollToElement(window.location.hash.slice(1));
    }, 100);
}

// Track pricing interactions for analytics
function trackPricingInteraction(action, plan) {
    if (typeof gtag !== 'undefined') {
        gtag('event', 'pricing_interaction', {
            'action': action,
            'plan': plan
        });
    }
}

// Export functions for use in other modules if needed
export {
    scrollToElement,
    trackPricingInteraction
};