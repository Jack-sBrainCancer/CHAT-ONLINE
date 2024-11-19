// login elements
const login = document.querySelector(".login");
const loginForm = login.querySelector(".login__form");
const loginInput = login.querySelector(".login__input");

// chat elements
const chat = document.querySelector(".chat");
const chatForm = chat.querySelector(".chat__form");
const chatInput = chat.querySelector(".chat__input");
const chatMessages = chat.querySelector(".chat__messages");

const colors = [
    "cadetblue",
    "darkgoldenrod",
    "cornflowerblue",
    "darkkhaki",
    "hotpink",
    "gold"
];

const user = { id: "", name: "", color: "" };

let websocket;
let mediaRecorder;
let audioChunks = [];

// Função para criar um elemento de mensagem do próprio usuário
const createMessageSelfElement = (content) => {
    const div = document.createElement("div");
    const timeSpan = document.createElement("span");

    div.classList.add("message--self");
    div.innerHTML = content;

    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    timeSpan.innerHTML = currentTime;
    timeSpan.classList.add("message-time");

    div.appendChild(timeSpan);
    return div;
}

// Função para criar um elemento de mensagem de outro usuário
const createMessageOtherElement = (content, sender, senderColor) => {
    const div = document.createElement("div");
    const span = document.createElement("span");
    const timeSpan = document.createElement("span");

    div.classList.add("message--other");

    span.classList.add("message--sender");
    span.style.color = senderColor;

    div.appendChild(span);
    span.innerHTML = sender;
    div.innerHTML += content;

    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    timeSpan.innerHTML = currentTime;
    timeSpan.classList.add("message-time");

    div.appendChild(timeSpan);
    return div;
}

// Função para armazenar mensagens no localStorage
const storeMessage = (message) => {
    const messages = JSON.parse(localStorage.getItem("chatMessages")) || [];
    messages.push(message);
    localStorage.setItem("chatMessages", JSON.stringify(messages));
}

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
}

const getRandomColor = () => {
    const randomIndex = Math.floor(Math.random() * colors.length);
    return colors[randomIndex];
}

const scrollScreen = () => {
    window.scrollTo({
        top: document.body.scrollHeight,
        behavior: "smooth"
    });
}

const processMessage = ({ data }) => {
    const { userId, userName, userColor, content } = JSON.parse(data);

    const message = {
        userId,
        userName,
        userColor,
        content
    };

    storeMessage(message);

    const messageElement =
        userId === user.id
            ? createMessageSelfElement(content)
            : createMessageOtherElement(content, userName, userColor);

    // Se o conteúdo for uma URL de áudio, adicione um elemento de áudio
    if (content.endsWith('.wav')) {
        const audioElement = document.createElement("audio");
        audioElement.src = content;
        audioElement.controls = true; // Adiciona controles ao player de áudio
        messageElement.appendChild(audioElement);
    }

    chatMessages.appendChild(messageElement);
    scrollScreen();
}

const handleAudioRecording = () => {
    const recordButton = document.getElementById("recordButton");

    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        mediaRecorder = new MediaRecorder(stream);
        
        recordButton.onmousedown = () => {
            audioChunks = []; // Limpa os chunks de áudio
            mediaRecorder.start();
            recordButton.innerHTML = '<span class="material-symbols-outlined">stop</span>'; // Muda o ícone para "parar"
        };

        recordButton.onmouseup = () => {
            mediaRecorder.stop();
            recordButton.innerHTML = '<span class="material-symbols-outlined">mic</span>'; // Muda o ícone de volta para "microfone"
        };

        mediaRecorder.ondataavailable = event => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            const audioUrl = URL.createObjectURL(audioBlob);

            const message = {
                userId: user.id,
                userName: user.name,
                userColor: user.color,
                content: audioUrl // Envie a URL do áudio
            };

            websocket.send(JSON.stringify(message));
        };
    }).catch(err => {
        console.error("Erro ao acessar o microfone:", err);
    });
};

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
}

const sendMessage = (event) => {
    event.preventDefault();

    const message = {
        userId: user.id,
        userName: user.name,
        userColor: user.color,
        content: chatInput.value
    };

    websocket.send(JSON.stringify(message));
    chatInput.value = "";
}

loginForm.addEventListener("submit", handleLogin);
chatForm.addEventListener("submit", sendMessage);
