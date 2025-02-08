// config/seo.js

const seoConfig = {
    default: {
        title: 'KreatorAI - AI-Powered Content & Business Tools',
        description: 'Transform your business with AI-powered content creation, social media management, and productivity tools.',
        keywords: 'AI, content creation, business tools, productivity, social media',
        ogImage: '/images/og-image.jpg',
        ogType: 'website',
        twitterCard: 'summary_large_image',
    },

    pages: {
        home: {
            title: 'KreatorAI - Transform Your Business with AI',
            description: 'Generate content, optimize your business profile, and boost productivity with our suite of AI tools.',
            keywords: 'AI platform, business automation, content generation, productivity tools',
        },
        
        pricing: {
            title: 'KreatorAI Pricing - Plans for Every Business',
            description: 'Flexible pricing plans designed to help your business grow. Start free and scale as you need.',
            keywords: 'pricing plans, business plans, subscription, AI tools pricing',
        },

        features: {
            title: 'KreatorAI Features - Complete Business Solution',
            description: 'Explore our comprehensive suite of AI-powered tools for content creation, business management, and productivity.',
            keywords: 'AI features, business tools, automation features, productivity suite',
        },

        contact: {
            title: 'Contact KreatorAI - Get Support & Sales',
            description: 'Get in touch with our team for support, sales inquiries, or partnership opportunities.',
            keywords: 'contact, support, sales, customer service',
        }
    },

    generateMetaTags(page = 'default') {
        const config = page === 'default' ? this.default : { ...this.default, ...this.pages[page] };
        
        return `
            <title>${config.title}</title>
            <meta name="description" content="${config.description}">
            <meta name="keywords" content="${config.keywords}">
            
            <!-- Open Graph -->
            <meta property="og:title" content="${config.title}">
            <meta property="og:description" content="${config.description}">
            <meta property="og:image" content="${config.ogImage}">
            <meta property="og:type" content="${config.ogType}">
            
            <!-- Twitter -->
            <meta name="twitter:card" content="${config.twitterCard}">
            <meta name="twitter:title" content="${config.title}">
            <meta name="twitter:description" content="${config.description}">
            <meta name="twitter:image" content="${config.ogImage}">
            
            <!-- Additional SEO tags -->
            <link rel="canonical" href="${process.env.BASE_URL}${page === 'home' ? '' : '/' + page}">
            <meta name="robots" content="index, follow">
        `;
    }
};

module.exports = seoConfig;