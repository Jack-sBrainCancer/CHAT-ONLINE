// login elements
const login = document.querySelector(".login");
const loginForm = login.querySelector(".login__form");
const loginInput = login.querySelector(".login__input");

// chat elements
const chat = document.querySelector(".chat");
const chatForm = chat.querySelector(".chat__form");
const chatInput = chat.querySelector(".chat__input");
const chatMessages = chat.querySelector(".chat__messages");
const usersList = chat.querySelector(".users-list");

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
let onlineUsers = new Set();
let mediaRecorder;
let audioChunks = [];

// Função para criar um elemento de mensagem do próprio usuário
const createMessageSelfElement = (content) => {
    const div = document.createElement("div");
    const timeSpan = document.createElement("span");

    div.classList.add("message--self");
    div.innerHTML = content;

    // Obter a hora atual e formatá-la
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

    span.innerHTML = sender;
    div.appendChild(span);
    div.innerHTML += content; // Adiciona conteúdo HTML diretamente

    // Obter a hora atual e formatá-la
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    timeSpan.innerHTML = currentTime;
    timeSpan.classList.add("message-time");

    div.appendChild(timeSpan);
    return div;
}

// Função para armazenar mensagens (texto e áudio) no localStorage
const storeMessage = (message) => {
    const messages = JSON.parse(localStorage.getItem("chatMessages")) || [];
    messages.push(message);
    localStorage.setItem("chatMessages", JSON.stringify(messages));
}

// Função para carregar mensagens do localStorage
const loadMessages = () => {
    const messages = JSON.parse(localStorage.getItem("chatMessages")) || [];
    messages.forEach(msg => {
        if (msg.event === "audio_message") {
            // Se for uma mensagem de áudio, cria o player de áudio
            const audioElement = document.createElement('audio');
            audioElement.controls = true; // Mantém os controles padrão
            audioElement.src = `data:audio/wav;base64,${msg.content}`; // Define a fonte do áudio

            const messageElement = createMessageOtherElement(audioElement.outerHTML, msg.userName, msg.userColor);
            chatMessages.appendChild(messageElement);
        } else {
            // Para mensagens de texto
            const messageElement =
                msg.userId === user.id
                    ? createMessageSelfElement(msg.content)
                    : createMessageOtherElement(msg.content, msg.userName, msg.userColor);
            chatMessages.appendChild(messageElement);
        }
    });
    scrollScreen();
}

const getRandomColor = () => {
    const randomIndex = Math.floor(Math.random() * colors.length);
    return colors[randomIndex];
}

// Função para rolar a tela automaticamente para a última mensagem
const scrollScreen = () => {
    chatMessages.scrollTop = chatMessages.scrollHeight; // Rolagem para a parte inferior das mensagens
}

const updateOnlineUsers = () => {
    usersList.innerHTML = ""; // Limpa a lista atual
    onlineUsers.forEach(userName => {
        const userDiv = document.createElement("div");
        userDiv.textContent = userName;
        usersList.appendChild(userDiv);
    });
}

const processMessage = ({ data }) => {
    const { userId, userName, userColor, content, event } = JSON.parse(data);

    if (event === "user_connected") {
        onlineUsers.add(userName);
        updateOnlineUsers();
    } else if (event === "user_disconnected") {
        onlineUsers.delete(userName);
        updateOnlineUsers();
    } else if (event === "audio_message") {
        // Criação de um elemento de áudio
        const audioElement = document.createElement('audio');
        audioElement.controls = true; // Mantém os controles padrão
        audioElement.src = `data:audio/wav;base64,${content}`; // Define a fonte do áudio

        // Cria uma mensagem para adicionar ao chat
        const messageElement = createMessageOtherElement(audioElement.outerHTML, userName, userColor);
        chatMessages.appendChild(messageElement);

        // Armazenar a mensagem no localStorage
        storeMessage({
            userId,
            userName,
            userColor,
            content: content,
            event: "audio_message"
        });

        scrollScreen(); // Rolagem para a parte inferior após adicionar nova mensagem
    } else {
        const message = {
            userId,
            userName,
            userColor,
            content
        };

        // Armazenar a mensagem no localStorage
        storeMessage(message);

        const messageElement =
            userId === user.id
                ? createMessageSelfElement(content)
                : createMessageOtherElement(content, userName, userColor);

        chatMessages.appendChild(messageElement);
        scrollScreen(); // Rolagem para a parte inferior após adicionar nova mensagem
    }
}

const handleLogin = (event) => {
    event.preventDefault();

    user.id = crypto.randomUUID();
    user.name = loginInput.value;
    user.color = getRandomColor();

    login.style.display = "none";
    chat.style.display = "flex";

    // Carregar mensagens do localStorage
    loadMessages();

    websocket = new WebSocket("wss://chat-online-azd6.onrender.com/");
    websocket.onmessage = processMessage;

    // Envia uma mensagem para informar que o usuário se conectou
    websocket.send(JSON.stringify({ event: "user_connected", userName: user.name, userId: user.id }));
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

// Função para iniciar a gravação
const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.start();
    mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
    };

    mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        sendAudio(audioBlob); // Envia o áudio para o servidor
        audioChunks = []; // Limpa os chunks para a próxima gravação
    };
};

// Função para parar a gravação
const stopRecording = () => {
    mediaRecorder.stop();
};

// Função para enviar o áudio para todos os usuários
const sendAudio = (audioBlob) => {
    const reader = new FileReader();
    reader.onloadend = () => {
        const audioData = reader.result.split(',')[1]; // Converte para base64
        const audioMessage = {
            userId: user.id,
            userName: user.name,
            userColor: user.color,
            content: audioData, // O conteúdo do áudio em base64
            event: "audio_message" // Tipo de evento
        };
        websocket.send(JSON.stringify(audioMessage));
    };
    reader.readAsDataURL(audioBlob); // Lê o blob como URL
};

// Adiciona eventos ao botão de gravação
document.getElementById('recordButton').addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        stopRecording();
    } else {
        startRecording();
    }
});

loginForm.addEventListener("submit", handleLogin);
chatForm.addEventListener("submit", sendMessage);
