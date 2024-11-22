const { WebSocketServer } = require("ws");
const dotenv = require("dotenv");

dotenv.config();

const wss = new WebSocketServer({ port: process.env.PORT || 8080 });

const users = new Map(); // Para armazenar usuários conectados

wss.on("connection", (ws) => {
  ws.on("error", console.error);

  // Evento de mensagem recebida
  ws.on("message", (data) => {
    const message = JSON.parse(data);

    // Se for uma nova conexão
    if (message.event === "user_connected") {
      const { userName, userId } = message;
      users.set(userId, userName); // Adiciona o usuário à lista

      // Enviar a notificação para todos os clientes
      const userConnectedMessage = JSON.stringify({
        event: "user_connected",
        userName: userName,
        userId: userId,
      });
      broadcast(userConnectedMessage);
    } else {
      // Caso contrário, é uma mensagem normal
      broadcast(data.toString());
    }
  });

  // Remover o usuário quando desconectar
  ws.on("close", () => {
    users.forEach((userName, userId) => {
      // Se o cliente desconectar, remova-o da lista
      if (ws === userId) {
        users.delete(userId);

        // Enviar a notificação de desconexão para todos os clientes
        const userDisconnectedMessage = JSON.stringify({
          event: "user_disconnected",
          userName: userName,
          userId: userId,
        });
        broadcast(userDisconnectedMessage);
      }
    });
  });

  console.log("client connected");
});

// Função para enviar mensagens para todos os clientes
function broadcast(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(data);
    }
  });
}
