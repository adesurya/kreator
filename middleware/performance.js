// middleware/performance.js

const compression = require('compression');
const express = require('express');

const performanceMiddleware = {
    // Compression middleware
    compress: compression({
        filter: (req, res) => {
            if (req.headers['x-no-compression']) {
                return false;
            }
            return compression.filter(req, res);
        },
        level: 6 // Compression level (0-9)
    }),

    // Cache Control
    cacheControl: (req, res, next) => {
        // Static assets
        if (req.url.match(/\.(css|js|jpg|png|svg|ico)$/)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
        } 
        // API responses
        else if (req.url.startsWith('/api')) {
            res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
        }
        // HTML pages
        else {
            res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
        }
        next();
    },

    // Security Headers
    securityHeaders: (req, res, next) => {
        // HSTS
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
        
        // XSS Protection
        res.setHeader('X-XSS-Protection', '1; mode=block');
        
        // Content Security Policy
        res.setHeader('Content-Security-Policy', `
            default-src 'self';
            script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net;
            style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
            img-src 'self' data: blob: https:;
            font-src 'self' data: https://cdn.jsdelivr.net;
            connect-src 'self' https://api.openai.com https://rag.epsilla.com;
        `.replace(/\s+/g, ' ').trim());
        
        next();
    },

    // Performance Monitoring
    performanceMetrics: (req, res, next) => {
        const start = process.hrtime();

        res.on('finish', () => {
            const [seconds, nanoseconds] = process.hrtime(start);
            const duration = seconds * 1000 + nanoseconds / 1000000;
            
            console.log({
                path: req.path,
                method: req.method,
                status: res.statusCode,
                duration: `${duration.toFixed(2)}ms`,
                timestamp: new Date().toISOString()
            });
        });

        next();
    }
};

module.exports = performanceMiddleware;