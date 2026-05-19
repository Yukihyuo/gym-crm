import Client from '../models/Client.js';
import { findClientByIdentifier, registerVisit } from '../services/Access.services.js';

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




      socket.removeAllListeners('register_new_client');
      socket.on('register_new_client', (idClient) => {
        socket.to(terminalId).emit('register_new_client', idClient);
      });

      socket.removeAllListeners('enrollment_status');
      socket.on('enrollment_status', (status) => {
        socket.to(terminalId).emit('enrollment_status', status);
      });

      socket.removeAllListeners('cancel_registration');
      socket.on('cancel_registration', () => {
        console.log("Si se cancelóouoouououoooouuuuuuuuuuu")
        socket.to(terminalId).emit('cancel_registration');
      });

      socket.removeAllListeners('enrollment_error');
      socket.on('enrollment_error', (data) => {
        console.log("Si hubo error",data)
        socket.to(terminalId).emit('enrollment_error', data);
      });

      socket.removeAllListeners('enrollment_status');
      socket.on('enrollment_status', (status) => {
        socket.to(terminalId).emit('enrollment_status', status);
      });

      socket.removeAllListeners('save_finger_print');
      socket.on('save_finger_print', async (data) => {
        await Client.findByIdAndUpdate(data.user_id, { fingerprint: data.fmd });
        io.to(terminalId).emit('save_finger_print_response', "success");
      });

      socket.removeAllListeners('finger_print_match');
      socket.on('finger_print_match', async (idClient) => {
        const client = await findClientByIdentifier(idClient)

        if (!client) {
          return io.to(terminalId).emit('finger_print_matched', { success: false, message: 'Cliente no encontrado' });
        }

        const result = await registerVisit(client, 'fingerprint');
        io.to(terminalId).emit('finger_print_matched', result.payload);
      });

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