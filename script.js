// Elementos da Interface
const configScreen = document.getElementById('config-screen');
const chatScreen = document.getElementById('chat-screen');
const apiKeyInput = document.getElementById('api-key-input');
const saveKeyBtn = document.getElementById('save-key-btn');
const logoutBtn = document.getElementById('logout-btn');
const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

let apiKey = '';
let chatHistory = [];

// ==========================================
// TREINAMENTO / MODELO PERSONALIZADO
// Edite esta string para mudar o comportamento do bot
// ==========================================
const systemInstruction = "Você é um assistente virtual prestativo de uma loja online de eletrônicos. Você ajuda a tirar dúvidas sobre produtos, agendar suportes técnicos e dar informações sobre frete. Seja sempre educado, conciso e profissional.";

// Tenta modelos alternativos quando o principal estiver indisponível ou sem cota.
const geminiModels = [
    'gemini-3.6-flash',
    'gemini-3.6-flash-lite',
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite'
];

// Verifica se já existe uma chave salva ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
        apiKey = savedKey;
        showChatScreen();
    }
});

// Salvar chave de API
saveKeyBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    if (key) {
        apiKey = key;
        localStorage.setItem('gemini_api_key', apiKey);
        showChatScreen();
    } else {
        alert("Por favor, insira uma chave válida.");
    }
});

// Remover chave (Logout)
logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('gemini_api_key');
    apiKey = '';
    chatHistory = []; // limpa histórico
    chatBox.innerHTML = '<div class="message bot"><div class="text">Olá! Sou o assistente virtual. Como posso ajudar você hoje?</div></div>';
    showConfigScreen();
});

// Enviar mensagem
sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

function showChatScreen() {
    configScreen.classList.remove('active');
    chatScreen.classList.active = true;
    chatScreen.classList.add('active');
}

function showConfigScreen() {
    chatScreen.classList.remove('active');
    configScreen.classList.add('active');
    apiKeyInput.value = '';
}

function escapeHtml(text) {
    const htmlEntities = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };

    return text.replace(/[&<>"']/g, (character) => htmlEntities[character]);
}

function formatBotMessage(text) {
    const codeBlocks = [];
    let html = escapeHtml(text).replace(/```([\s\S]*?)```/g, (_, code) => {
        const placeholder = `@@CODE_BLOCK_${codeBlocks.length}@@`;
        codeBlocks.push(`<pre><code>${code.trim()}</code></pre>`);
        return placeholder;
    });

    html = html
        .replace(/^### (.+)$/gm, '<strong class="message-heading">$1</strong>')
        .replace(/^## (.+)$/gm, '<strong class="message-heading">$1</strong>')
        .replace(/^# (.+)$/gm, '<strong class="message-heading">$1</strong>')
        .replace(/(^|\n)\s*[-*]\s+(.+)/g, '$1<span class="message-list-item">• $2</span>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/__(.+?)__/g, '<strong>$1</strong>')
        .replace(/`([^`\n]+)`/g, '<code>$1</code>')
        .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
        .replace(/(^|[^_])_([^_\n]+)_(?!_)/g, '$1<em>$2</em>')
        .replace(/\n/g, '<br>');

    codeBlocks.forEach((codeBlock, index) => {
        html = html.replace(`@@CODE_BLOCK_${index}@@`, codeBlock);
    });

    return html;
}

function addMessageToUI(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender);
    
    const textDiv = document.createElement('div');
    textDiv.classList.add('text');
    if (sender === 'bot') {
        textDiv.innerHTML = formatBotMessage(text);
    } else {
        textDiv.textContent = text;
    }
    
    messageDiv.appendChild(textDiv);
    chatBox.appendChild(messageDiv);
    
    // Rola para o final
    chatBox.scrollTop = chatBox.scrollHeight;
}

async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    // Adiciona na UI e no histórico
    addMessageToUI(text, 'user');
    chatHistory.push({ role: "user", parts: [{ text: text }] });
    
    userInput.value = '';
    sendBtn.disabled = true;
    userInput.disabled = true;

    let typingId = null;

    try {
        // Mostra digitando
        typingId = "typing-" + Date.now();
        const typingDiv = document.createElement('div');
        typingDiv.classList.add('message', 'bot');
        typingDiv.id = typingId;
        typingDiv.innerHTML = '<div class="text">Digitando...</div>';
        chatBox.appendChild(typingDiv);
        chatBox.scrollTop = chatBox.scrollHeight;

        const requestBody = {
            system_instruction: {
                parts: [{ text: systemInstruction }]
            },
            contents: chatHistory
        };
        let lastErrorMessage = 'Erro desconhecido.';
        let botResponseText = '';

        for (const model of geminiModels) {
            const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
            const data = await response.json();

            if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
                botResponseText = data.candidates[0].content.parts[0].text;
                break;
            }

            lastErrorMessage = data.error?.message || `O modelo ${model} não respondeu.`;
        }

        // Remove "Digitando..."
        document.getElementById(typingId)?.remove();

        if (botResponseText) {
            // Adiciona resposta na UI e no Histórico
            addMessageToUI(botResponseText, 'bot');
            chatHistory.push({ role: "model", parts: [{ text: botResponseText }] });
        } else {
            addMessageToUI(`Não foi possível responder agora. Tentamos os modelos alternativos. Detalhes: ${lastErrorMessage}`, 'bot');
            chatHistory.pop(); // Remove a pergunta do histórico já que falhou
        }

    } catch (error) {
        document.getElementById(typingId)?.remove();
        addMessageToUI("Erro de conexão. Verifique sua internet.", 'bot');
        chatHistory.pop();
    } finally {
        sendBtn.disabled = false;
        userInput.disabled = false;
        userInput.focus();
    }
}

// ==========================================
// CONTROLE DO MODO CLARO / ESCURO (COM DETECÇÃO DO SISTEMA)
// ==========================================
const themeToggleBtn = document.getElementById('theme-toggle');
const body = document.body;

// 1. Verifica se há algo salvo. Se não houver, verifica o sistema operacional
const savedTheme = localStorage.getItem('site_theme');
const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

// Aplica o modo escuro se: o usuário salvou como 'dark' OU (não tem nada salvo E o sistema é dark)
if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
    body.classList.add('dark-mode');
    themeToggleBtn.textContent = '☀️';
} else {
    themeToggleBtn.textContent = '🌙';
}

// 2. Ação do botão (salva a escolha do usuário, sobrescrevendo o sistema)
themeToggleBtn.addEventListener('click', () => {
    body.classList.toggle('dark-mode'); 
    
    if (body.classList.contains('dark-mode')) {
        localStorage.setItem('site_theme', 'dark'); 
        themeToggleBtn.textContent = '☀️'; 
    } else {
        localStorage.setItem('site_theme', 'light'); 
        themeToggleBtn.textContent = '🌙'; 
    }
});