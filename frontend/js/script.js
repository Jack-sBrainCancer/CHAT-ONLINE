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

    div.appendChild(span);
    span.innerHTML = sender;
    div.innerHTML += content;

    // Obter a hora atual e formatá-la
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
    }

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
    scrollScreen();
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

    websocket = new WebSocket("wss://chat-online-azd6.onrender.com//");
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

loginForm.addEventListener("submit", handleLogin);
chatForm.addEventListener("submit", sendMessage);
