export function initializeSocketListeners(io) {
  const userSessions = {};
  global.socketUsers = userSessions;

  io.on('connect', (socket) => {
    let currentUserId = null;
    let currentTerminalUuid = null; // <-- Nueva referencia

    // --- Tu lógica actual (Para notificaciones de usuario) ---
    socket.on('setSessionId', (userId) => {
      currentUserId = userId;
      if (!userSessions[userId]) userSessions[userId] = [];
      if (!userSessions[userId].includes(socket.id)) {
        userSessions[userId].push(socket.id);
      }
      socket.emit('setSessionId', socket.id);
    });

    // --- Lógica para el Sistema de Huellas ---
    // React llamará a esto después de elegir su terminal en el selector
    socket.on('joinTerminalRoom', (terminalId) => {
      currentTerminalUuid = terminalId;
      socket.join(terminalId);
      console.log(`Socket ${socket.id} escuchando a terminal: ${terminalId}`);
      socket.emit('joinedTerminal', terminalId);
    });

    socket.on('leaveTerminalRoom', (terminalId) => {
      if (!terminalId) {
        return;
      }

      socket.leave(terminalId);
      if (currentTerminalUuid === terminalId) {
        currentTerminalUuid = null;
      }
      console.log(`Socket ${socket.id} dejó de escuchar terminal: ${terminalId}`);
    });

    socket.on('disconnect', () => {
      // Tu limpieza actual de sesiones de usuario
      if (currentUserId && userSessions[currentUserId]) {
        userSessions[currentUserId] = userSessions[currentUserId].filter(
          (id) => id !== socket.id
        );
        if (userSessions[currentUserId].length === 0) {
          delete userSessions[currentUserId];
        }
      }
      // Socket.io limpia automáticamente las salas (Rooms) al desconectar, 
      // así que no hace falta limpiar manual el currentTerminalUuid.
    });
  });
}