require("dotenv").config({ path: "config.env" });
const express = require("express");
const rateLimit = require("express-rate-limit");

const http = require("http");
const { Server } = require("socket.io");

const compression = require("compression");
const helmet = require("helmet");
const path = require("path");

const socketHandlers = require("./socketHandlers");
const routes = require("./routes");

// Initialize app and server
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Use Helmet for security
app.use(helmet());

// Custom CSP settings
//app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      scriptSrc: ["'self'", "https://cdn.socket.io", "'unsafe-inline'"], // Allow scripts
      scriptSrcAttr: ["'self'", "'unsafe-inline'"], // Onclick and event handlers are not working without this
      connectSrc: ["'self'", "https://cdn.socket.io"], // Websocket connections
      styleSrc: ["'self'", "'unsafe-inline'"], // Loading and applying styles
    },
  })
);

// Serve static files and uploaded files
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Rate limiting
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 1000, // 1000 requests
  message: "Too many requests, try again later.",
});
app.use(limiter);

// Use compression middleware to compress responses
app.use(compression());

// Error middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("ERROR!");
});

// Handle sockets
io.on("connection", (socket) => {
  socketHandlers(io, socket);
});

// Routes
app.use("/", routes);

// Specify port and run server
const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
