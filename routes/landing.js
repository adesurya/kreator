// routes/landing.js
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    // If user is already logged in, redirect to dashboard
    if (req.session && req.session.userId) {
        return res.redirect('/dashboard');
    }
    
    res.render('landing/index', {
        layout: 'layouts/landing',
        features: [
            {
                title: 'Business Growth Tools',
                description: 'Optimize your Google Business Profile and create engaging content with AI-powered suggestions.',
                icon: 'chart-up'
            },
            {
                title: 'Social Media Management',
                description: 'Generate creative content ideas and plan your social media calendar effortlessly.',
                icon: 'share'
            },
            {
                title: 'Productivity Suite',
                description: 'Transcribe audio, generate images, and summarize documents in seconds.',
                icon: 'lightning'
            }
        ],
        testimonials: [
            {
                name: 'Sarah Johnson',
                role: 'Marketing Manager',
                company: 'TechStart Inc.',
                content: 'This platform has revolutionized our content creation process. We\'ve seen a 300% increase in engagement!',
                avatar: '/images/testimonials/avatar1.jpg'
            },
            {
                name: 'Michael Chen',
                role: 'Small Business Owner',
                company: 'Artisan Cafe',
                content: 'The Google Business Profile tools helped me improve my local SEO significantly. More customers are finding us online!',
                avatar: '/images/testimonials/avatar2.jpg'
            }
        ],
        plans: [
            {
                name: 'Starter',
                price: '29',
                period: 'month',
                features: [
                    'Basic content generation',
                    '10 audio transcriptions',
                    '50 image generations',
                    'Basic analytics'
                ],
                cta: 'Start Free Trial',
                popular: false
            },
            {
                name: 'Professional',
                price: '79',
                period: 'month',
                features: [
                    'Advanced content generation',
                    'Unlimited transcriptions',
                    '200 image generations',
                    'Advanced analytics',
                    'Priority support'
                ],
                cta: 'Start Free Trial',
                popular: true
            }
        ]
    });
});

module.exports = router;