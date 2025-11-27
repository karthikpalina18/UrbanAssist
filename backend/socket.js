const { Server } = require('socket.io');

module.exports = function initializeSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:3000",
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    console.log("Admin connected:", socket.id);

    socket.on("disconnect", () => {
      console.log("Admin disconnected:", socket.id);
    });
  });

  return io;
};
