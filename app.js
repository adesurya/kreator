// app.js
const express = require('express');
const path = require('path');
const session = require('express-session');
const ejsLayouts = require('express-ejs-layouts');
const plannerRoutes = require('./routes/planner');
const fs = require('fs');
const transcribeRoutes = require('./routes/transcribe');
const multer = require('multer');

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


const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)){
    fs.mkdirSync(tempDir);
}
// Use routes
app.use('/', authRoutes);
app.use('/chat', chatRoutes);
app.use('/admin', adminRoutes);
app.use('/idekreator', idekreatorRoutes);  // Tambahkan ini
app.use('/planner', plannerRoutes);
app.use('/transcribe', transcribeRoutes);
app.use('/image-generator', imageGeneratorRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use('/gbp', gbpRoutes);  // Use GBP routes
app.use('/image-caption', imageCaptionRoutes);


app.use(documentResumeRoute);




// Root route
app.get('/', (req, res) => {
    res.redirect('/login');
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('auth/login', { 
        error: 'Something went wrong. Please try again.'
    });

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
    next(err);
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