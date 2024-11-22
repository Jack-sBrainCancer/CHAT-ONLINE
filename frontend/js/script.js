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

// Function to create a message element
const createMessageElement = (content, sender = null, senderColor = null, isSelf = false) => {
    const div = document.createElement("div");
    const timeSpan = document.createElement("span");

    div.classList.add(isSelf ? "message--self" : "message--other");

    if (!isSelf) {
        const span = document.createElement("span");
        span.classList.add("message--sender");
        span.style.color = senderColor;
        span.innerHTML = sender;
        div.appendChild(span);
    }

    div.innerHTML += content;

    // Get current time and format it
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    timeSpan.innerHTML = currentTime;
    timeSpan.classList.add("message-time");
    
    div.appendChild(timeSpan);
    return div;
}

// Function to store messages in localStorage
const storeMessage = (message) => {
    const messages = JSON.parse(localStorage.getItem("chatMessages")) || [];
    messages.push(message);
    localStorage.setItem("chatMessages", JSON.stringify(messages));
}

// Function to load messages from localStorage
const loadMessages = () => {
    const messages = JSON.parse(localStorage.getItem("chatMessages")) || [];
    messages.forEach(msg => {
        const messageElement = createMessageElement(msg.content, msg.userName, msg.userColor, msg.userId === user.id);
        chatMessages.appendChild(messageElement);
    });
    scrollScreen();
}

// Function to get a random color
const getRandomColor = () => colors[Math.floor(Math.random() * colors.length)];

// Function to scroll the chat window
const scrollScreen = () => {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Function to handle incoming messages
const processMessage = ({ data }) => {
    const { userId, userName, userColor, content } = JSON.parse(data);
    const message = { userId, userName, userColor, content };

    storeMessage(message);
    const messageElement = createMessageElement(content, userName, userColor, userId === user.id);
    chatMessages.appendChild(messageElement);
    scrollScreen();
}

// Function to handle user login
const handleLogin = (event) => {
    event.preventDefault();
    const username = loginInput.value.trim();

    if (!username) {
        alert("Please enter a username.");
        return;
    }

    user.id = crypto.randomUUID();
    user.name = username;
    user.color = getRandomColor();

    login.style.display = "none";
    chat.style.display = "flex";

    loadMessages();

    // Establish WebSocket connection
    websocket = new WebSocket("wss://chat-online-azd6.onrender.com/");
    websocket.onmessage = processMessage;
    websocket.onerror = (error) => console.error("WebSocket error:", error);
}

// Function to send messages
const sendMessage = (event) => {
    event.preventDefault();
    const messageContent = chatInput.value.trim();

    if (!messageContent) {
        alert("Please enter a message.");
        return;
    }

    const message = {
        userId: user.id,
        userName: user.name,
        userColor: user.color,
        content: messageContent
    };

    websocket.send(JSON.stringify(message));
    chatInput.value = "";
}

// Event listeners
loginForm.addEventListener("submit", handleLogin);
chatForm.addEventListener("submit", sendMessage);
