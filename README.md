# Real-Time Chat Application 🚀

A real-time chat application built with Node.js, Express, and Socket.io. Supports public/private rooms, file sharing, user lists, room lists and more!

## Features ✨
- **Real-time messaging** with Socket.io
- **Public & Private Chat Rooms**
- **File Sharing** (max 5MB per file)
- User list with color-coded identities
- Room list with participant counts
- Typing indicators 
- XSS protection with HTML sanitization
- Rate limiting (1000 requests/10min)
- Responsive UI with custom alerts

## Tech Stack 🔧
- **Backend**: Node.js, Express
- **Real-Time**: Socket.io
- **Security**: Helmet, rate limiting, CSP
- **Storage**: Multer for file uploads
- **Utilities**: Sanitize-html, compression

## Installation ⚙️
1. Clone the repo:
   ```bash
   git clone https://github.com/yourusername/chat-app.git
   ```
2. Install dependencies:
   ```bash
   npm install express socket.io multer helmet sanitize-html dotenv compression
   ```
3. Create .env file:
   ```bash
   PORT=3000
   ```
4. Start the server:
   ```bash
   node index.js
   ```

## Configuration 🔒
- **Security Headers**: Custom CSP in index.js
- **File Uploads**: Max size: 5MB, Allowed types: Any (configurable in routes.js)
- **Rate Limiting**:
```bash
windowMs: 10 * 60 * 1000, // 10 minutes
max: 1000 // 1000 requests
```

## Usage 💬
1. Access http://localhost:3000
2. Enter username when prompted
3. Choose to: Join public room, Start private chat by clicking users, Share files via upload button

## Security 🛡️
- Content Security Policy (CSP) configured
- HTML input sanitization
- Rate limiting
- File size restrictions
- Secure headers via Helmet
