// public/js/utils.js

// Debounce utility function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle utility function
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

// Animation utilities
const animationUtils = {
    // Typewriter effect
    typeWriter: (element, text, speed = 50) => {
        let i = 0;
        element.textContent = '';
        
        function type() {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
                setTimeout(type, speed);
            }
        }
        type();
    },

    // Count up animation
    countUp: (element, target, duration = 2000, formatter = null) => {
        let start = 0;
        const increment = target / (duration / 16);
        const animate = () => {
            start += increment;
            const value = Math.floor(start);
            element.textContent = formatter ? formatter(value) : value;
            if (start < target) {
                requestAnimationFrame(animate);
            } else {
                element.textContent = formatter ? formatter(target) : target;
            }
        };
        animate();
    },

    // Scroll trigger animation
    scrollTrigger: (element, options = {}) => {
        const defaultOptions = {
            rootMargin: '0px',
            threshold: 0.1,
            animation: 'fade-up',
            once: true
        };
        const config = { ...defaultOptions, ...options };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add(config.animation);
                    if (config.once) observer.unobserve(entry.target);
                } else if (!config.once) {
                    entry.target.classList.remove(config.animation);
                }
            });
        }, {
            rootMargin: config.rootMargin,
            threshold: config.threshold
        });

        observer.observe(element);
        return observer;
    },

    // Parallax effect
    parallax: (element, speed = 0.5) => {
        const handleScroll = () => {
            const scrolled = window.pageYOffset;
            const position = scrolled * speed;
            element.style.transform = `translateY(${position}px)`;
        };
        window.addEventListener('scroll', throttle(handleScroll, 16));
    }
};

// Form validation utilities
const formUtils = {
    validateEmail: (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    validateRequired: (value) => {
        return value.trim().length > 0;
    },

    validatePhone: (phone) => {
        const re = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
        return re.test(phone);
    },

    validatePassword: (password) => {
        // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
        const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
        return re.test(password);
    },

    validateForm: (form) => {
        const inputs = form.querySelectorAll('[required], [data-validate]');
        let isValid = true;
        const errors = {};

        inputs.forEach(input => {
            const value = input.value;
            const type = input.type;
            const customValidation = input.dataset.validate;

            // Remove existing error messages
            const existingError = input.parentElement.querySelector('.error-message');
            if (existingError) existingError.remove();

            // Required field validation
            if (input.hasAttribute('required') && !formUtils.validateRequired(value)) {
                isValid = false;
                errors[input.name] = 'This field is required';
            }
            // Email validation
            else if (type === 'email' && !formUtils.validateEmail(value)) {
                isValid = false;
                errors[input.name] = 'Please enter a valid email address';
            }
            // Phone validation
            else if (customValidation === 'phone' && !formUtils.validatePhone(value)) {
                isValid = false;
                errors[input.name] = 'Please enter a valid phone number';
            }
            // Password validation
            else if (type === 'password' && !formUtils.validatePassword(value)) {
                isValid = false;
                errors[input.name] = 'Password must be at least 8 characters with 1 uppercase, 1 lowercase and 1 number';
            }

            // Display error message if any
            if (errors[input.name]) {
                const errorElement = document.createElement('div');
                errorElement.className = 'error-message text-red-500 text-sm mt-1';
                errorElement.textContent = errors[input.name];
                input.parentElement.appendChild(errorElement);
                input.classList.add('border-red-500');
            } else {
                input.classList.remove('border-red-500');
            }
        });

        return { isValid, errors };
    }
};

// Local storage utilities
const storageUtils = {
    set: (key, value, expiryHours = null) => {
        try {
            const item = {
                value: value,
                timestamp: new Date().getTime()
            };
            if (expiryHours) {
                item.expiry = expiryHours * 60 * 60 * 1000;
            }
            localStorage.setItem(key, JSON.stringify(item));
            return true;
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            return false;
        }
    },

    get: (key) => {
        try {
            const item = JSON.parse(localStorage.getItem(key));
            if (!item) return null;

            // Check if item has expired
            if (item.expiry) {
                const now = new Date().getTime();
                if (now - item.timestamp > item.expiry) {
                    localStorage.removeItem(key);
                    return null;
                }
            }

            return item.value;
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return null;
        }
    },

    remove: (key) => {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Error removing from localStorage:', error);
            return false;
        }
    },

    clear: () => {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('Error clearing localStorage:', error);
            return false;
        }
    }
};

// DOM manipulation utilities
const domUtils = {
    // Create element with attributes and children
    createElement: (tag, attributes = {}, children = []) => {
        const element = document.createElement(tag);
        
        // Set attributes
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'dataset') {
                Object.entries(value).forEach(([dataKey, dataValue]) => {
                    element.dataset[dataKey] = dataValue;
                });
            } else {
                element.setAttribute(key, value);
            }
        });

        // Append children
        children.forEach(child => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else {
                element.appendChild(child);
            }
        });

        return element;
    },

    // Insert element after reference node
    insertAfter: (newNode, referenceNode) => {
        referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
    },

    // Remove all children of an element
    removeAllChildren: (parent) => {
        while (parent.firstChild) {
            parent.removeChild(parent.firstChild);
        }
    },

    // Toggle class on multiple elements
    toggleClass: (elements, className) => {
        elements.forEach(element => element.classList.toggle(className));
    }
};

// URL utilities
const urlUtils = {
    // Get URL parameters as object
    getParams: (url = window.location.href) => {
        const params = {};
        const parser = document.createElement('a');
        parser.href = url;
        const query = parser.search.substring(1);
        const vars = query.split('&');
        
        for (let i = 0; i < vars.length; i++) {
            if (vars[i]) {
                const pair = vars[i].split('=');
                params[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
            }
        }
        return params;
    },

    // Update URL parameter without page reload
    updateParam: (key, value, url = window.location.href) => {
        const urlObj = new URL(url);
        urlObj.searchParams.set(key, value);
        window.history.pushState({}, '', urlObj);
    },

    // Remove URL parameter without page reload
    removeParam: (key, url = window.location.href) => {
        const urlObj = new URL(url);
        urlObj.searchParams.delete(key);
        window.history.pushState({}, '', urlObj);
    }
};

// Export utilities for module use
export {
    debounce,
    throttle,
    animationUtils,
    formUtils,
    storageUtils,
    domUtils,
    urlUtils
};