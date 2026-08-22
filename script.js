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

function addMessageToUI(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender);
    
    const textDiv = document.createElement('div');
    textDiv.classList.add('text');
    textDiv.textContent = text;
    
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

    try {
        // Mostra digitando
        const typingId = "typing-" + Date.now();
        const typingDiv = document.createElement('div');
        typingDiv.classList.add('message', 'bot');
        typingDiv.id = typingId;
        typingDiv.innerHTML = '<div class="text">Digitando...</div>';
        chatBox.appendChild(typingDiv);
        chatBox.scrollTop = chatBox.scrollHeight;

        // Requisição para a API REST do Gemini (Modelo Flash 1.5 - rápido e barato/gratuito)
        const url = `https://generativelanguage.googleapis.com/v1/models/gemini-3.6-flash:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                system_instruction: {
                    parts: [{ text: systemInstruction }]
                },
                contents: chatHistory
            })
        });

        const data = await response.json();
        
        // Remove "Digitando..."
        document.getElementById(typingId).remove();

        if (response.ok && data.candidates && data.candidates.length > 0) {
            const botResponseText = data.candidates[0].content.parts[0].text;
            
            // Adiciona resposta na UI e no Histórico
            addMessageToUI(botResponseText, 'bot');
            chatHistory.push({ role: "model", parts: [{ text: botResponseText }] });
        } else {
            // Tratamento de Erro (Ex: Chave inválida)
            const errorMsg = data.error ? data.error.message : "Erro desconhecido.";
            addMessageToUI(`Erro na API: ${errorMsg}`, 'bot');
            chatHistory.pop(); // Remove a pergunta do histórico já que falhou
        }

    } catch (error) {
        addMessageToUI("Erro de conexão. Verifique sua internet.", 'bot');
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