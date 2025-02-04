let currentConversationId = null;

async function startNewConversation() {
    try {
        const response = await fetch('/chat/conversation/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ summary: 'New conversation' })
        });
        const data = await response.json();
        currentConversationId = data.result.conversationId;
        loadConversationHistory();
    } catch (error) {
        console.error('Error starting conversation:', error);
    }
}

async function loadConversationHistory() {
    if (!currentConversationId) return;

    try {
        const response = await fetch(`/chat/history/${currentConversationId}/50`);
        const data = await response.json();
        const messagesDiv = document.getElementById('chat-messages');
        messagesDiv.innerHTML = '';
        
        data.result.history.forEach(message => {
            addMessageToChat(
                message.Role.toLowerCase() === 'user' ? 'user' : 'ai',
                message.Content
            );
        });
    } catch (error) {
        console.error('Error loading history:', error);
    }
}

// Initialize chat when page loads
document.addEventListener('DOMContentLoaded', () => {
    startNewConversation();
});