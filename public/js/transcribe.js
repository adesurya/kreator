// public/js/transcribe.js
function validateFile(file) {
    // Check file type
    if (file.type !== 'audio/mpeg') {
        showNotification('Only MP3 files are allowed', 'error');
        return false;
    }

    // Check file size (30MB)
    if (file.size > 30 * 1024 * 1024) {
        showNotification('File size exceeds 30MB limit', 'error');
        return false;
    }

    return true;
}

// Update form submission
uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const file = audioFile.files[0];
    
    if (!file) {
        showNotification('Please select an audio file', 'error');
        return;
    }

    if (!validateFile(file)) {
        return;
    }

    // ... rest of the code
});