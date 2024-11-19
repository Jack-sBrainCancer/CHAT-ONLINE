// Seleciona elementos de login
const login = document.querySelector(".login");
const loginForm = login.querySelector(".login__form");
const loginInput = login.querySelector(".login__input");

// Seleciona elementos do chat
const chat = document.querySelector(".chat");
const chatForm = chat.querySelector(".chat__form");
const chatInput = chat.querySelector(".chat__input");
const chatMessages = chat.querySelector(".chat__messages");

// Cores disponíveis para os usuários
const colors = [
    "cadetblue",
    "darkgoldenrod",
    "cornflowerblue",
    "darkkhaki",
    "hotpink",
    "gold"
];

// Informações do usuário
const user = { id: "", name: "", color: "" };

let websocket;
let mediaRecorder;
let audioChunks = [];

// Função para criar um elemento de mensagem do próprio usuário
const createMessageSelfElement = (content) => {
    const div = document.createElement("div");
    div.classList.add("message--self");
    div.innerHTML = content;

    const timeSpan = document.createElement("span");
    timeSpan.innerHTML = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    timeSpan.classList.add("message-time");

    div.appendChild(timeSpan);
    return div;
};

// Função para criar um elemento de mensagem de outro usuário
const createMessageOtherElement = (content, sender, senderColor) => {
    const div = document.createElement("div");
    div.classList.add("message--other");

    const span = document.createElement("span");
    span.classList.add("message--sender");
    span.style.color = senderColor;
    span.innerHTML = sender;

    div.appendChild(span);
    div.innerHTML += content; // Adiciona o conteúdo da mensagem

    const timeSpan = document.createElement("span");
    timeSpan.innerHTML = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    timeSpan.classList.add("message-time");

    div.appendChild(timeSpan);
    return div;
};

// Função para armazenar mensagens no localStorage
const storeMessage = (message) => {
    const messages = JSON.parse(localStorage.getItem("chatMessages")) || [];
    messages.push(message);
    localStorage.setItem("chatMessages", JSON.stringify(messages));
};

// Função para carregar mensagens do localStorage
const loadMessages = () => {
    const messages = JSON.parse(localStorage.getItem("chatMessages")) || [];
    messages.forEach(msg => {
        const messageElement =
            msg.userId === user.id
                ? createMessageSelfElement(msg.content)
                : createMessageOtherElement(msg.content, msg.userName, msg.userColor);
        chatMessages.appendChild(messageElement);
    });
    scrollScreen();
};

// Função para gerar uma cor aleatória
const getRandomColor = () => {
    return colors[Math.floor(Math.random() * colors.length)];
};

// Função para rolar a tela até a parte inferior
const scrollScreen = () => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
};

// Função para processar mensagens recebidas
const processMessage = ({ data }) => {
    const { userId, userName, userColor, content } = JSON.parse(data);
    const message = { userId, userName, userColor, content };

    storeMessage(message);

    const messageElement = document.createElement("div");

    if (userId === user.id) {
        messageElement.classList.add("message--self");
    } else {
        messageElement.classList.add("message--other");
        const senderSpan = document.createElement("span");
        senderSpan.classList.add("message--sender");
        senderSpan.style.color = userColor;
        senderSpan.innerHTML = userName;
        messageElement.appendChild(senderSpan);
    }

    // Verifica se o conteúdo é um blob de áudio
    if (content.startsWith('blob:')) {
        const audioElement = document.createElement("audio");
        audioElement.src = content;
        audioElement.controls = true; // Adiciona controles ao player de áudio
        messageElement.appendChild(audioElement);
    } else {
        messageElement.innerHTML += content; // Para mensagens de texto
    }

    const timeSpan = document.createElement("span");
    timeSpan.innerHTML = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    timeSpan.classList.add("message-time");
    messageElement.appendChild(timeSpan);

    chatMessages.appendChild(messageElement);
    scrollScreen();
};

// Função para lidar com a gravação de áudio
const handleAudioRecording = () => {
    const recordButton = document.getElementById("recordButton");

    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        mediaRecorder = new MediaRecorder(stream);

        recordButton.onmousedown = () => {
            audioChunks = []; // Limpa os chunks de áudio
            mediaRecorder.start();
            recordButton.innerHTML = '<span class="material-symbols-outlined">stop</span>'; // Muda o ícone para "parar"
            console.log("Gravação iniciada");
        };

        recordButton.onmouseup = () => {
            mediaRecorder.stop();
            recordButton.innerHTML = '<span class="material-symbols-outlined">mic</span>'; // Muda o ícone de volta para "microfone"
            console.log("Gravação parada");
        };

        recordButton.ontouchstart = () => {
            audioChunks = []; // Limpa os chunks de áudio
            mediaRecorder.start();
            recordButton.innerHTML = '<span class="material-symbols-outlined">stop</span>'; // Muda o ícone para "parar"
            console.log("Gravação iniciada (tocar)");
        };

        recordButton.ontouchend = () => {
            mediaRecorder.stop();
            recordButton.innerHTML = '<span class="material-symbols-outlined">mic</span>'; // Muda o ícone de volta para "microfone"
            console.log("Gravação parada (tocar)");
        };

        mediaRecorder.ondataavailable = event => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            const audioUrl = URL.createObjectURL(audioBlob);
            
            // Cria uma mensagem com a URL do áudio
            const message = {
                userId: user.id,
                userName: user.name,
                userColor: user.color,
                content: audioUrl // Envie a URL do áudio
            };

            websocket.send(JSON.stringify(message));
            console.log("Áudio enviado:", audioUrl);
        };
    }).catch(err => {
        console.error("Erro ao acessar o microfone:", err);
    });
};

// Função para lidar com o login do usuário
const handleLogin = (event) => {
    event.preventDefault();

    user.id = crypto.randomUUID();
    user.name = loginInput.value;
    user.color = getRandomColor();

    login.style.display = "none";
    chat.style.display = "flex";

    loadMessages();

    websocket = new WebSocket("wss://chat-online-azd6.onrender.com/");
    websocket.onmessage = processMessage;

    handleAudioRecording(); // Chama a função de gravação
};

// Função para enviar mensagens
const sendMessage = (event) => {
    event.preventDefault();

    const message = {
        userId: user.id,
        userName: user.name,
        userColor: user.color,
        content: chatInput.value
    };

    websocket.send(JSON.stringify(message));
    chatInput.value = ""; // Limpa o campo de entrada
};

// Adiciona eventos de submit
loginForm.addEventListener("submit", handleLogin);
chatForm.addEventListener("submit", sendMessage);
