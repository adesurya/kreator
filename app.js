// app.js
const express = require('express');
const path = require('path');
const session = require('express-session');
const ejsLayouts = require('express-ejs-layouts');
const plannerRoutes = require('./routes/planner');
const fs = require('fs');
const transcribeRoutes = require('./routes/transcribe');
const multer = require('multer');
const dashboardRoutes = require('./routes/dashboard');
const adminPlanRoutes = require('./routes/admin/plans');
const adminTransactionRoutes = require('./routes/admin/transactions.js');
const adminDashboardRoutes = require('./routes/admin/dashboard');
const profileRoutes = require('./routes/profile');
const contactRoutes = require('./routes/contact');
const documentationRoutes = require('./routes/documentation');
const dashboardController = require('./controllers/dashboardController');


const { checkSubscription } = require('./middleware/subscriptionCheck');
const { isAuthenticated } = require('./middleware/auth');
const { isAdmin } = require('./middleware/auth');

require('dotenv').config();

const app = express();
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: process.env.JWT_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 jam
    }
}));

// View engine setup
app.use(ejsLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layouts/main');

app.use((req, res, next) => {
    // Set default template variables
    res.locals.style = '';
    res.locals.script = '';
    res.locals.user = req.session.user || null;
    res.locals.path = req.path;
    res.locals.error = null;

    res.locals.meta = {
        title: 'KreatorAI - AI-Powered Content & Business Tools',
        description: 'Transform your business with AI-powered content creation, social media management, and productivity tools.',
        keywords: 'AI, content creation, business tools, productivity, social media',
        ogImage: '/images/og-image.jpg'
    };

    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self' *; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' *; " +
        "style-src 'self' 'unsafe-inline' *; " +
        "img-src 'self' data: blob: *; " +
        "font-src 'self' data: *; " +
        "connect-src 'self' *;"
    );

    next();
});

// Import routes
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const adminRoutes = require('./routes/admin');
const idekreatorRoutes = require('./routes/idekreator');
const imageGeneratorRoutes = require('./routes/imageGenerator');
const documentResumeRoute = require('./routes/documentResume');
const gbpRoutes = require('./routes/gbp');
const imageCaptionRoutes = require('./routes/imageCaption');
const landingRoutes = require('./routes/landing');

const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)){
    fs.mkdirSync(tempDir);
}

// Root route
app.get('/', (req, res) => {
    if (req.session && req.session.userId) {
        if (req.session.user.role === 'admin') {
            return res.redirect('/admin/dashboard');
        }
        // Check subscription before redirecting to dashboard
        return res.redirect('/pricing');
    }
    res.render('landing/index', {
        layout: 'layouts/landing',
        user: null,
        testimonials: [],
        features: [],
        plans: []
    });
});

app.use('/auth', authRoutes);  // Auth routes 
app.use('/dashboard', isAuthenticated, checkSubscription, dashboardRoutes);
app.use('/chat', isAuthenticated, checkSubscription, chatRoutes);
app.use('/idekreator', isAuthenticated, checkSubscription, idekreatorRoutes);
app.use('/planner', isAuthenticated, checkSubscription, plannerRoutes);
app.use('/transcribe', isAuthenticated, checkSubscription, transcribeRoutes);
app.use('/image-generator', isAuthenticated, checkSubscription, imageGeneratorRoutes);
app.use('/document-resume', isAuthenticated, checkSubscription, documentResumeRoute);
app.use('/gbp', isAuthenticated, checkSubscription, gbpRoutes);
app.use('/image-caption', isAuthenticated, checkSubscription, imageCaptionRoutes);

app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use('/pricing', isAuthenticated, async (req, res) => {
    try {
        // Get all active plans
        const [plans] = await db.execute(
            'SELECT * FROM plans WHERE is_active = 1 ORDER BY price ASC'
        );

        res.render('pricing/index', {
            user: req.session.user,
            plans: plans,
            paymentMethods: PaymentService.PAYMENT_METHODS
        });
    } catch (error) {
        console.error('Error loading plans:', error);
        res.status(500).render('error', { 
            error: 'Failed to load plans',
            user: req.session.user
        });
    }
});

// Admin routes - pastikan ini ditaruh sebelum route lain yang menggunakan /admin
app.use('/admin/dashboard', isAdmin, adminDashboardRoutes);
app.use('/admin/plans', isAdmin, adminPlanRoutes);
app.use('/admin/transactions', isAdmin, adminTransactionRoutes);

app.use('/profile', profileRoutes);
app.use('/contact', contactRoutes);
app.use('/documentation', documentationRoutes);

// Handle 404
app.use((req, res) => {
    res.status(404).render('error/404', {
        layout: 'layouts/error',
        error: {
            status: 404,
            message: 'Page not found'
        }
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        body: req.body
    });

    // For XHR/API requests
    if (req.xhr || req.headers.accept?.includes('json')) {
        return res.status(500).json({ error: err.message || 'Internal server error' });
    }

    // For web pages
    res.status(500).render('error', {
        layout: 'layouts/error',
        error: {
            status: 500,
            message: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
            stack: process.env.NODE_ENV === 'production' ? null : err.stack
        }
    });
});

// Cleanup uploaded files periodically
setInterval(() => {
    fs.readdir(uploadsDir, (err, files) => {
        if (err) throw err;

        for (const file of files) {
            fs.unlink(path.join(uploadsDir, file), err => {
                if (err) console.error('Error deleting temporary file:', err);
            });
        }
    });
}, 3600000); 

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    
    // Debug: Log all registered routes
    console.log('\nRegistered Routes:');
    app._router.stack.forEach(r => {
        if (r.route && r.route.path) {
            console.log(`${Object.keys(r.route.methods).join(',')} ${r.route.path}`);
        }
    });
});