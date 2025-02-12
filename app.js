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
app.use('/admin', adminPlanRoutes);


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
const idekreatorRoutes = require('./routes/idekreator');  // Tambahkan ini
const imageGeneratorRoutes = require('./routes/imageGenerator');
const documentResumeRoute = require('./routes/documentResume');
const gbpRoutes = require('./routes/gbp');  // Import GBP routes
const imageCaptionRoutes = require('./routes/imageCaption');
const landingRoutes = require('./routes/landing');

const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)){
    fs.mkdirSync(tempDir);
}
// Use routes

//app.use('/', landingRoutes); // Set landing page as root




// Root route
app.get('/', (req, res) => {
    if (req.session && req.session.userId) {
        if (req.session.user.role === 'admin') {
            return res.redirect('/admin/dashboard');
        }
        return res.redirect('/dashboard');
    }
    res.render('landing/index', {
        layout: 'layouts/landing',
        user: null,
        testimonials: [],
        features: [],
        plans: []
    });
});

app.use('/auth', authRoutes);  // Auth routes harus di atas
app.use('/dashboard', dashboardRoutes);
app.use('/chat', chatRoutes);
app.use('/admin', adminRoutes);
app.use('/idekreator', idekreatorRoutes);
app.use('/planner', plannerRoutes);
app.use('/transcribe', transcribeRoutes);
app.use('/image-generator', imageGeneratorRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use('/gbp', gbpRoutes);
app.use('/image-caption', imageCaptionRoutes);
app.use(documentResumeRoute);

//admin route
app.use('/admin/dashboard', isAdmin, adminDashboardRoutes);
app.use('/admin/plans', isAdmin, adminPlanRoutes);
app.use('/admin/transactions', isAdmin, adminTransactionRoutes);


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
        res.status(500).render('auth/login', { 
        error: 'Something went wrong. Please try again.'
    });

    if (req.xhr || req.headers.accept.includes('json')) {
        return res.status(500).json({ error: err.message || 'Internal server error' });
    }

    res.status(500).render('error', { error: err.message || 'Internal server error' });


    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                error: 'File size too large. Maximum size is 30MB'
            });
        }
        return res.status(400).json({
            error: 'File upload error: ' + err.message
        });
    }

    const statusCode = err.statusCode || 500;
    const message = process.env.NODE_ENV === 'production' 
        ? 'Internal Server Error' 
        : err.message;

    res.status(statusCode).render('error', {
        layout: 'layouts/error',
        error: {
            status: statusCode,
            message: message,
            stack: process.env.NODE_ENV === 'production' ? null : err.stack
        }
    });
    next(err);
});

app._router.stack.forEach(function(r){
    if (r.route && r.route.path){
        console.log('Route:', r.route.path)
    }
});

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

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});