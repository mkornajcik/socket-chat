const sanitizeHtml = require("sanitize-html");

// Create random color for every user
function getRandomColor() {
  const letters = "89ABCDEF"; // Use only high values to get light colors
  let color = "#";
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * letters.length)];
  }
  return color;
}

// Get user count for each room
function getRoomUserCounts(io, rooms) {
  const roomUserCounts = {};
  for (const room of rooms) {
    roomUserCounts[room] = io.sockets.adapter.rooms.get(room)?.size || 0;
  }
  return roomUserCounts;
}

module.exports = {
  sanitizeHtml,
  getRandomColor,
  getRoomUserCounts,
};
