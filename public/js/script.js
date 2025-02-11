const socket = io();
let username = "";
let activeRoom = null;
let typingTimer;
let privateChatSession = null;

window.onload = showPrompt;

// Ask user for their name on page load
function showPrompt() {
  document.getElementById("customPrompt").classList.add("active");
}

// Handle the name input and acvivate joining
function sendPrompt() {
  const input = document.getElementById("customPromptInput").value.trim();
  if (input === "") {
    showAlert("You must enter your name first.");
    return;
  }
  username = input;
  document.getElementById("customPrompt").classList.remove("active");
  document.getElementById("joinBtn").disabled = false;

  showUsername();

  socket.emit("set-name", { username });
}

// Collapse/expand users and rooms
function toggleNav(sectionId) {
  const section = document.getElementById(sectionId);
  const button = section.previousElementSibling.querySelector(".toggle-btn");
  if (section.style.display === "none") {
    section.style.display = "block";
    button.innerHTML = "&#9660;"; // Down arrow
  } else {
    section.style.display = "none";
    button.innerHTML = "&#9654;"; // Right arrow
  }
}

// Custom alerts with optional buttons
function showAlert(msg, displayButton = false, acceptInv = null, declineInv = null) {
  const alertBox = document.getElementById("customAlert");
  alertBox.textContent = msg;
  alertBox.classList.add("show");

  // Private invitation doesnt disappear
  if (displayButton) {
    const acceptButton = createButton("Accept", acceptInv);
    const declineButton = createButton("Decline", declineInv);
    alertBox.appendChild(acceptButton);
    alertBox.appendChild(declineButton);
  } else {
    setTimeout(() => {
      alertBox.classList.remove("show");
    }, 5000);
  }
}

// Dynamically create a button
function createButton(text, cb) {
  const button = document.createElement("button");
  button.textContent = text;
  button.onclick = () => {
    if (cb) cb();
    const alertBox = document.getElementById("customAlert");
    alertBox.classList.remove("show");
    alertBox.innerHTML = "";
  };
  return button;
}

// Show the username in UI
function showUsername() {
  const usernameDisplay = document.getElementById("usernameDisplay");
  usernameDisplay.textContent = `Your name: ${username}`;
  usernameDisplay.style.display = "block";
}

function joinRoom(roomName) {
  const room = roomName || document.getElementById("room").value;

  if (!username || !room) {
    showAlert("Enter both username and room name.");
    showPrompt();
    return;
  }

  if (activeRoom) {
    showAlert("You are already in a room.");
    return;
  }

  socket.emit("join-room", { username, room });
  activeRoom = room;

  clearMsg();

  toggleMsg(true);

  document.getElementById("message").addEventListener("keydown", allowEnter);
}

// Enable the enter key for sending messages
function allowEnter(event) {
  if (event.key === "Enter") {
    sendChat();
  } else {
    socket.emit("typing", { room: activeRoom });
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      socket.emit("stop-typing", { room: activeRoom });
    }, 3000);
  }
}

function joinPrivate(targetUsername) {
  // Create private rooms with this format: private-user-targetUser
  const privateRoom = `private-${username}-${targetUsername}`;
  socket.emit("join-room", { username, room: privateRoom, private: true });
  activeRoom = privateRoom;
  showAlert(`Private chat with ${targetUsername}`);

  clearMsg();

  toggleMsg(true);

  document.getElementById("message").addEventListener("keydown", allowEnter);
}

function acceptPrivate() {
  if (privateChatSession) {
    socket.emit("join-room", { username, room: privateChatSession, private: true });
    activeRoom = privateChatSession;
    privateChatSession = null;

    clearMsg();

    toggleMsg(true);

    const alertBox = document.getElementById("customAlert");
    alertBox.classList.remove("show");
    alertBox.innerHTML = "";
  }
}

function declinePrivate(inviter) {
  socket.emit("decline-private-chat", { inviter });
  privateChatSession = null;
}

function sendChat() {
  const msg = document.getElementById("message").value;
  if (msg.trim() === "") return;

  socket.emit("send-message", { message: msg });
  document.getElementById("message").value = "";
  socket.emit("stop-typing", { room: activeRoom });
}

// Get file from the input, use FormData to append the file and send it to server using fetch with POST to /upload
function sendFile() {
  const fileInput = document.getElementById("fileInput");
  const file = fileInput.files[0];
  if (!file) {
    showAlert("Select a file.");
    return;
  }

  const formData = new FormData();
  formData.append("file", file);

  fetch("/upload", {
    method: "POST",
    body: formData,
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }
      return response.json();
    })
    .then((data) => {
      socket.emit("send-file-message", { filename: data.filename, originalname: data.originalname });
      fileInput.value = "";
    })
    .catch((error) => {
      if (error.message.includes("NetworkError")) {
        showAlert("NETWORK ERROR💥! Check your connection.");
      } else if (error.message.includes("Server error")) {
        showAlert("SERVER ERROR💥! Try again later.");
      } else {
        showAlert("ERROR💥!");
      }
      console.error("UPLOAD ERROR💥!:", error.message, error.stack, error.name);
    });
}

function leaveRoom() {
  socket.emit("leave-room");
  activeRoom = null;
  toggleMsg(false);
}

// Toggle message input and buttons
function toggleMsg(enable) {
  ["message", "sendBtn", "leaveBtn"].forEach((id) => {
    const el = document.getElementById(id);
    el.disabled = !enable;
    el.style.opacity = enable ? "1" : "0.5";
  });

  document.getElementById("joinBtn").disabled = enable;
}

function scrollDown() {
  const msg = document.getElementById("messages");
  msg.scrollTop = msg.scrollHeight;
}

// Clear all the messages from chatbox
function clearMsg() {
  const msg = document.getElementById("messages");
  while (msg.firstChild) {
    msg.removeChild(msg.firstChild);
  }
}

function updateRooms(userAmount) {
  const roomList = document.getElementById("roomList");
  roomList.innerHTML = "";
  for (const [room, count] of Object.entries(userAmount)) {
    const li = document.createElement("li");
    li.textContent = `${room} (${count})`;
    // Allow click to join a room
    li.addEventListener("click", () => {
      if (!activeRoom) {
        joinRoom(room);
      } else {
        showAlert("You are already in a room.");
      }
    });
    roomList.appendChild(li);
  }
}

function updateUsers(users) {
  const userList = document.getElementById("userList");
  userList.innerHTML = "";
  for (const user of users) {
    const li = document.createElement("li");
    li.textContent = user.username;
    // Prevent self-invites
    if (user.username !== username) {
      li.addEventListener("click", () => {
        if (!activeRoom) {
          joinPrivate(user.username);
        } else {
          showAlert("You are already in a room.");
        }
      });
    } else {
      li.style.cursor = "default";
    }
    userList.appendChild(li);
  }
}

// Private chat notification
function privateAlert(targetUsername) {
  privateChatSession = `private-${targetUsername}-${username}`;
  showAlert(`${targetUsername} invited you to a private chat.`, true, acceptPrivate, () =>
    declinePrivate(targetUsername)
  );
}

// Event listeners
socket.on("message", incomingMsg);
socket.on("error-message", showAlert);
socket.on("room-list", roomListUpdate);
socket.on("private-notification", privateNotification);
socket.on("user-list", updateUsers);
socket.on("typing", typingOn);
socket.on("stop-typing", typingOff);

function incomingMsg(data) {
  const li = document.createElement("li");
  li.id = `message-${Date.now()}`;
  li.innerHTML = `<strong>${data.username}:</strong> ${data.message}`;
  li.style.backgroundColor = data.color || "#FFFFFF";
  document.getElementById("messages").appendChild(li);
  scrollDown();

  setTimeout(() => {
    li.classList.add("show");
  }, 10);

  // Move typing indicator to the end of the list
  const typingIndicator = document.getElementById("typingIndicator");
  document.getElementById("messages").appendChild(typingIndicator);
}

function roomListUpdate(userAmount) {
  const userCount = Object.fromEntries(Object.entries(userAmount).filter(([room]) => !room.startsWith("private-")));
  updateRooms(userCount);
}

function privateNotification(targetUsername) {
  if (targetUsername !== username) {
    privateAlert(targetUsername);
  }
}

function typingOn() {
  const typingIndicator = document.getElementById("typingIndicator");
  typingIndicator.style.display = "block";
}

function typingOff() {
  const typingIndicator = document.getElementById("typingIndicator");
  typingIndicator.style.display = "none";
}
