const { sanitizeHtml, getRandomColor, getRoomUserCounts } = require("./utils");
const errorHandler = require("./errorHandler");

// Keep track of users and rooms
const users = {};
const rooms = new Set();

// Send the list of users to all clients
function updateUsers(io) {
  const userList = Object.values(users).map((user) => ({ username: user.username }));
  io.emit("user-list", userList);
}

// Send the list of rooms and user counts to the client
function updateRooms(io) {
  io.emit("room-list", getRoomUserCounts(io, rooms));
}

function getUsername(io, socket) {
  return errorHandler(({ username }) => {
    if (!username) {
      socket.emit("error-message", "Choose a username.");
      return;
    }

    const color = getRandomColor();
    users[socket.id] = { username, color };
    updateUsers(io);
  });
}

function roomJoin(io, socket) {
  // Get the username, room and private in case the chat is private
  return errorHandler(({ username, room, private = false }) => {
    if (!username || !room) {
      socket.emit("error-message", "Choose a username and room.");
      return;
    }

    // Clean the room name to block script injection
    const cleanRoom = sanitizeHtml(room);

    const color = getRandomColor();
    users[socket.id] = { username, room: cleanRoom, color, private };
    rooms.add(cleanRoom);
    socket.join(cleanRoom);

    socket.emit("message", { username: "System", message: `Joined room: ${cleanRoom}` });
    socket.to(cleanRoom).emit("message", { username: "System", message: `${username} joined.` });

    if (private) {
      // Get the targets name by splitting the name of the string
      const targetName = cleanRoom.split("-")[2];
      // Find the ID of the target
      const targetID = Object.keys(users).find((id) => users[id].username === targetName);
      // If found, send notification
      if (targetID) {
        io.to(targetID).emit("private-notification", username);
      }
    }

    // Update room list and user counts for all clients
    updateRooms(io);
    updateUsers(io);
  });
}

function roomLeave(io, socket) {
  return errorHandler(() => {
    const user = users[socket.id];
    if (user) {
      // Get the username and room from user
      const { username, room } = user;

      // Get message that user left and show other in that room as well
      socket.emit("message", { username: "System", message: `You left the chat room.` });
      socket.to(room).emit("message", { username: "System", message: `${username} left.` });

      // Disconnect the user from the room
      socket.leave(room);

      // Check if the room is empty and remove it from the set
      if (!io.sockets.adapter.rooms.get(room)) {
        rooms.delete(room);
      }

      updateRooms(io);
      updateUsers(io);
    }
  });
}

function disconnectSocket(io, socket) {
  return errorHandler(() => {
    const user = users[socket.id];
    if (user) {
      const { username, room } = user;
      socket.to(room).emit("message", { username: "System", message: `${username} left.` });
      // Ensure the user info is deleted after leaving the room so we don't keep the data
      delete users[socket.id];

      // Check if the room is empty and remove it from the set
      if (!io.sockets.adapter.rooms.get(room)) {
        rooms.delete(room);
      }

      // Update room list and user counts
      updateRooms(io);
      updateUsers(io);
    }
  });
}

function sendChat(io, socket) {
  // Data is the info about the message that user sends
  return errorHandler((data) => {
    const user = users[socket.id];
    if (!user) {
      socket.emit("error-message", "Choose a username first.");
      return;
    }
    // Clean the message to block script injection
    const message = sanitizeHtml(data.message);
    io.to(user.room).emit("message", { username: user.username, message, color: user.color });
  });
}

function sendFileMessage(io, socket) {
  // Data is the info about the file thats being sent
  return errorHandler((data) => {
    const user = users[socket.id];
    if (!user) {
      socket.emit("error-message", "Choose a username and room first.");
      return;
    }

    // Destructure the name and original name from data
    const { filename, originalname } = data;
    // Clean both
    const cleanFile = sanitizeHtml(filename);
    const cleanOriginal = sanitizeHtml(originalname);
    // Link the file so it can be downloaded
    const message = `<a href="/uploads/${cleanFile}" download="${cleanOriginal}">${cleanOriginal}</a>`;
    io.to(user.room).emit("message", { username: user.username, message, color: user.color });
  });
}

function startTyping(io, socket) {
  return errorHandler(({ room }) => {
    socket.to(room).emit("typing");
  });
}

function stopTyping(io, socket) {
  return errorHandler(({ room }) => {
    socket.to(room).emit("stop-typing");
  });
}

function declinePrivate(io, socket) {
  // Sender is the name of user who sent invitation
  return errorHandler(({ sender }) => {
    // Get the senders ID based on the name
    const senderID = Object.keys(users).find((id) => users[id].username === sender);
    // If we find matching ID, send declined invitation error
    if (senderID) {
      io.to(senderID).emit("error-message", `${users[socket.id].username} declined your invite.`);
    }
  });
}

module.exports = (io, socket) => {
  // Send the list of rooms and user counts to the client
  socket.emit("room-list", getRoomUserCounts(io, rooms));

  updateUsers(io);

  socket.on("set-name", getUsername(io, socket));

  socket.on("join-room", roomJoin(io, socket));

  socket.on("leave-room", roomLeave(io, socket));

  socket.on("disconnect", disconnectSocket(io, socket));

  socket.on("send-message", sendChat(io, socket));

  socket.on("send-file-message", sendFileMessage(io, socket));

  socket.on("typing", startTyping(io, socket));

  socket.on("stop-typing", stopTyping(io, socket));

  socket.on("decline-private-chat", declinePrivate(io, socket));
};
