const express = require('express');
const router = express.Router();
const multer = require('multer');
const db = require('../config/database');
const { isAuthenticated } = require('../middleware/auth');
const OpenAI = require('openai');
const fs = require('fs');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');

// Configure multer
const upload = multer({
    dest: 'uploads/',
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    }
});

// Function untuk membagi teks menjadi chunk-chunk kecil
function splitIntoChunks(text, size) {
    const chunks = [];
    const sentences = text.split(/[.!?]+/); // Split berdasarkan tanda baca
    let currentChunk = '';

    for (const sentence of sentences) {
        const trimmedSentence = sentence.trim();
        if (!trimmedSentence) continue;

        if ((currentChunk + trimmedSentence).length < size) {
            currentChunk += (currentChunk ? '. ' : '') + trimmedSentence;
        } else {
            if (currentChunk) chunks.push(currentChunk + '.');
            currentChunk = trimmedSentence;
        }
    }
    if (currentChunk) chunks.push(currentChunk + '.');
    return chunks;
}

// Tambahkan fungsi helper untuk menghitung perkiraan token
function estimateTokens(text) {
    // Rata-rata 1 token = 4 karakter dalam bahasa Indonesia
    return Math.ceil(text.length / 4);
}

const documentResumeController = {
    renderDocumentResume: (req, res) => {
        res.render('document-resume/index', { 
            user: req.session.user,
            style: '',
            script: ''
        });
    },

    

// Update function summarizeDocument
summarizeDocument: async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        let text = '';
        const filePath = req.file.path;
        
        // Extract text based on file type
        if (req.file.mimetype === 'application/pdf') {
            const dataBuffer = fs.readFileSync(filePath);
            const pdfData = await pdf(dataBuffer);
            text = pdfData.text;
        } else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const result = await mammoth.extractRawText({ path: filePath });
            text = result.value;
        }

        // Batasi ukuran chunk untuk menjaga token di bawah limit
        const maxTokensPerRequest = 4000; // Sekitar 1/4 dari limit token
        const chunkSize = maxTokensPerRequest * 4; // Perkiraan karakter
        const chunks = splitIntoChunks(text, chunkSize);
        let summaries = [];
        const totalChunks = chunks.length;

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });

        // Process chunks satu per satu untuk kontrol token yang lebih baik
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            
            // Periksa estimasi token
            if (estimateTokens(chunk) > maxTokensPerRequest) {
                // Split chunk jika terlalu besar
                const subChunks = splitIntoChunks(chunk, chunkSize / 2);
                for (const subChunk of subChunks) {
                    const completion = await openai.chat.completions.create({
                        model: "gpt-3.5-turbo",
                        messages: [
                            {
                                role: "system",
                                content: `Anda adalah asisten profesional yang menganalisis dan meringkas dokumen secara menyeluruh. Tugas anda:
                                1. Buat ringkasan yang sangat detail dan komprehensif
                                2. Pertahankan semua informasi penting, data, dan fakta
                                3. Jelaskan setiap konsep utama secara mendalam
                                4. Gunakan bahasa Indonesia yang formal dan jelas
                                5. Pisahkan setiap bagian dengan heading yang sesuai
                                6. Jangan melewatkan detail penting apapun`
                            },
                            {
                                role: "user",
                                content: `Analisis dan ringkas bagian berikut secara detail dan menyeluruh. Jangan lewatkan informasi penting apapun: ${chunk}`
                            }
                        ],
                        temperature: 0.7, // Meningkatkan kreativitas untuk detail
                        max_tokens: 2000 // Meningkatkan panjang output
                    });
                    summaries.push(completion.choices[0].message.content);
                }
            } else {
                const completion = await openai.chat.completions.create({
                    model: "gpt-3.5-turbo",
                    messages: [
                        {
                            role: "system",
                            content: "Ringkas dalam bahasa Indonesia dengan detail penting."
                        },
                        {
                            role: "user",
                            content: `Bagian ${i + 1}/${totalChunks}: ${chunk}`
                        }
                    ],
                });
                summaries.push(completion.choices[0].message.content);
            }

            // Update progress
            const progress = Math.round(((i + 1) / totalChunks) * 80);
            res.write(JSON.stringify({ 
                progress: progress,
                status: 'processing',
                message: `Menganalisis bagian ${i + 1} dari ${totalChunks}`
            }) + '\n');

            // Gabungkan summaries setiap 3 ringkasan untuk menjaga konteks
            if (summaries.length >= 3) {
                const batchSummaries = summaries.splice(0, 3);
                const intermediateSummary = await openai.chat.completions.create({
                    model: "gpt-3.5-turbo",
                    messages: [
                        {
                            role: "system",
                            content: "Gabungkan ringkasan dengan singkat dan jelas."
                        },
                        {
                            role: "user",
                            content: batchSummaries.join("\n\n")
                        }
                    ],
                });
                summaries = [intermediateSummary.choices[0].message.content];
            }
        }

        // Final summary dengan konteks terbatas
        res.write(JSON.stringify({ 
            progress: 90,
            status: 'processing',
            message: 'Membuat ringkasan akhir'
        }) + '\n');

        const finalCompletion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: `Anda adalah ahli analisis dokumen yang akan menggabungkan semua ringkasan menjadi satu dokumen komprehensif. Tugas anda:
                    1. Gabungkan semua ringkasan dengan detail dan terstruktur
                    2. Buat pembagian bab dan sub-bab yang jelas
                    3. Sertakan semua informasi penting, data, dan contoh
                    4. Tambahkan penjelasan mendalam untuk setiap bagian
                    5. Buat koneksi logis antar bagian
                    6. Gunakan format yang memudahkan pembacaan
                    7. Berikan konteks yang lengkap
                    8. Fokus pada kelengkapan informasi`
                },
                {
                    role: "user",
                    content: `Gabungkan semua ringkasan berikut menjadi satu dokumen yang sangat komprehensif dan detail: ${summaries[0]}`
                }
            ],
            temperature: 0.7,
            max_tokens: 4000 // Maksimalkan panjang ringkasan akhir
        });

        const finalSummary = finalCompletion.choices[0].message.content;

        // Save to database
        await db.execute(
            'INSERT INTO document_resumes (user_id, original_filename, summary) VALUES (?, ?, ?)',
            [req.session.userId, req.file.originalname, finalSummary]
        );

        // Clean up uploaded file
        fs.unlinkSync(filePath);

        // Send final result
        res.write(JSON.stringify({ 
            progress: 100,
            status: 'completed',
            summary: finalSummary 
        }));
        res.end();

    } catch (error) {
        console.error('Summarize document error:', error);
        res.write(JSON.stringify({ 
            status: 'error',
            error: error.message || 'Failed to summarize document'
        }));
        res.end();
    }
},

    getHistories: async (req, res) => {
        try {
            const [histories] = await db.execute(
                'SELECT * FROM document_resumes WHERE user_id = ? ORDER BY created_at DESC',
                [req.session.userId]
            );
            res.json({ 
                statusCode: 200,
                result: histories
            });
        } catch (error) {
            console.error('Get histories error:', error);
            res.status(500).json({ error: 'Failed to get histories' });
        }
    },

    deleteHistory: async (req, res) => {
        try {
            await db.execute(
                'DELETE FROM document_resumes WHERE id = ? AND user_id = ?',
                [req.params.id, req.session.userId]
            );
            res.json({ 
                statusCode: 200,
                message: 'History deleted successfully'
            });
        } catch (error) {
            console.error('Delete history error:', error);
            res.status(500).json({ error: 'Failed to delete history' });
        }
    }
};

// Define routes
router.get('/document-resume', isAuthenticated, documentResumeController.renderDocumentResume);
router.post('/api/document-resume/summarize', isAuthenticated, upload.single('document'), documentResumeController.summarizeDocument);
router.get('/api/document-resume/histories', isAuthenticated, documentResumeController.getHistories);
router.delete('/api/document-resume/history/:id', isAuthenticated, documentResumeController.deleteHistory);

module.exports = router;