// models/documentResume.js
const db = require('../config/database');

function create(data) {
    return new Promise((resolve, reject) => {
        db.query('INSERT INTO document_resumes (user_id, original_filename, summary) VALUES (?, ?, ?)', 
            [data.userId, data.originalFileName, data.summary], 
            function(error, result) {
                if (error) {
                    return reject(error);
                }
                resolve(result);
            }
        );
    });
}

function getHistories(userId) {
    return new Promise((resolve, reject) => {
        db.query('SELECT * FROM document_resumes WHERE user_id = ? ORDER BY created_at DESC', 
            [userId], 
            function(error, results) {
                if (error) {
                    return reject(error);
                }
                resolve(results);
            }
        );
    });
}

function deleteHistory(id, userId) {
    return new Promise((resolve, reject) => {
        db.query('DELETE FROM document_resumes WHERE id = ? AND user_id = ?', 
            [id, userId], 
            function(error, result) {
                if (error) {
                    return reject(error);
                }
                resolve(result.affectedRows > 0);
            }
        );
    });
}

module.exports = {
    create,
    getHistories,
    deleteHistory
};