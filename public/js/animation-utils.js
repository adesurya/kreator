// public/js/animation-utils.js

const animationUtils = {
    // Intersection Observer for scroll animations
    createScrollObserver(options = {}) {
        const defaultOptions = {
            threshold: 0.2,
            rootMargin: '0px',
            onIntersect: (el) => {
                el.classList.add('animate-in');
            }
        };

        const config = { ...defaultOptions, ...options };

        return new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    config.onIntersect(entry.target);
                    if (options.once !== false) {
                        observer.unobserve(entry.target);
                    }
                }
            });
        }, {
            threshold: config.threshold,
            rootMargin: config.rootMargin
        });
    },

    // Stagger children animations
    staggerChildren(container, options = {}) {
        const defaultOptions = {
            staggerDelay: 100,
            initialDelay: 0,
            animation: 'fade-up'
        };

        const config = { ...defaultOptions, ...options };
        const children = Array.from(container.children);

        children.forEach((child, index) => {
            child.style.opacity = '0';
            child.style.transform = 'translateY(20px)';
            child.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
            child.style.transitionDelay = `${config.initialDelay + (index * config.staggerDelay)}ms`;
        });

        setTimeout(() => {
            children.forEach(child => {
                child.style.opacity = '1';
                child.style.transform = 'translateY(0)';
            });
        }, 100);
    },

    // Parallax effect
    createParallax(element, options = {}) {
        const defaultOptions = {
            speed: 0.5,
            orientation: 'up' // 'up' or 'down'
        };

        const config = { ...defaultOptions, ...options };

        const handleScroll = () => {
            const scrolled = window.pageYOffset;
            const rate = scrolled * config.speed;
            const transform = config.orientation === 'up' ? -rate : rate;
            element.style.transform = `translate3d(0, ${transform}px, 0)`;
        };

        window.addEventListener('scroll', handleScroll);

        return {
            destroy: () => window.removeEventListener('scroll', handleScroll)
        };
    },

    // Smooth counter animation
    animateCounter(element, options = {}) {
        const defaultOptions = {
            startValue: 0,
            endValue: 100,
            duration: 2000,
            formatter: (value) => value.toLocaleString()
        };

        const config = { ...defaultOptions, ...options };
        const step = (config.endValue - config.startValue) / (config.duration / 16);
        let current = config.startValue;

        const update = () => {
            current += step;
            if (current < config.endValue) {
                element.textContent = config.formatter(Math.floor(current));
                requestAnimationFrame(update);
            } else {
                element.textContent = config.formatter(config.endValue);
            }
        };

        requestAnimationFrame(update);
    },

    // Type writer effect
    typeWriter(element, text, options = {}) {
        const defaultOptions = {
            speed: 50,
            delay: 0,
            cursor: true
        };

        const config = { ...defaultOptions, ...options };
        let i = 0;

        if (config.cursor) {
            element.classList.add('typing');
            element.style.borderRight = '2px solid currentColor';
        }

        setTimeout(() => {
            const type = () => {
                if (i < text.length) {
                    element.textContent += text.charAt(i);
                    i++;
                    setTimeout(type, config.speed);
                } else if (config.cursor) {
                    element.classList.remove('typing');
                    element.style.borderRight = 'none';
                }
            };
            type();
        }, config.delay);
    }
};

export default animationUtils;