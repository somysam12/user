# Telegram Support Bot

A full-featured Telegram support bot with admin controls, live sessions, message queuing, and auto-replies.

## Features

- **Message Storage**: All user messages (text, photos, videos, voice, documents) are stored in SQLite database
- **Admin Control Panel**: Inline keyboard with all admin functions
- **Live Sessions**: Admin can chat with one user at a time in real-time
- **User Queue**: When admin is busy, other users are automatically queued
- **Paginated Views**: User list and chat history with pagination (10 items per page)
- **Media Handling**: Download and store media files locally
- **Delete Chats**: Delete all chats or specific user's chat history
- **Broadcast**: Send messages with media to all users
- **Auto-Replies**: Configure keyword-based automatic responses (only when admin not in live session)

## Setup

### 1. Get Telegram Bot Token

1. Talk to [@BotFather](https://t.me/BotFather) on Telegram
2. Create a new bot with `/newbot`
3. Copy the bot token

### 2. Get Your Admin ID

1. Talk to [@userinfobot](https://t.me/userinfobot) on Telegram
2. Copy your user ID

### 3. Configure Environment Variables

Create a `.env` file (copy from `.env.example`):

```bash
TELEGRAM_TOKEN=your_bot_token_here
ADMIN_ID=your_user_id_here
DATABASE_URL=sqlite:///./bot.db
WEBHOOK_URL=https://your-app.onrender.com/webhook/your_bot_token_here
UPLOAD_PATH=./uploads
PORT=5000
```

### 4. Install Dependencies

```bash
pip install -r requirements.txt
```

### 5. Run Locally (Polling Mode)

For local testing, you can run without webhooks:

```bash
python main.py
```

Note: For production, use webhook mode (see Deployment section).

## Deployment on Render.com

### 1. Create a Web Service

1. Go to [Render.com](https://render.com)
2. Create a new Web Service
3. Connect your GitHub repository
4. Set the following:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### 2. Set Environment Variables

In Render dashboard, add:

- `TELEGRAM_TOKEN` - Your bot token
- `ADMIN_ID` - Your Telegram user ID
- `DATABASE_URL` - `sqlite:///./bot.db` (or use PostgreSQL for production)
- `WEBHOOK_URL` - `https://your-app.onrender.com/webhook/YOUR_BOT_TOKEN`
- `UPLOAD_PATH` - `/tmp/uploads`

### 3. Deploy

After deployment, your bot will automatically set the webhook and start receiving messages.

## Admin Commands

Access the admin panel by sending `/start` to your bot (when logged in as admin).

### Admin Panel Buttons

1. **👥 Users** - View paginated list of all users with unread message counts
2. **👁 View @username** - View complete chat history with a specific user
3. **🗑 Delete all chats** - Delete all chat history (with confirmation)
4. **🗑 Delete @username** - Delete chat history for a specific user
5. **💬 Start live @username** - Start a live chat session with a user
6. **🛑 End live session** - End current live session and move to next user in queue
7. **📢 Broadcast** - Send a message (with optional media) to all users
8. **🤖 Auto replies** - Configure keyword-based automatic responses

## How It Works

### For Users

1. Users send messages to the bot
2. Messages are stored in the database
3. If admin is available and in a live session with them, messages are forwarded in real-time
4. If admin is busy, users are queued and may receive auto-replies (if configured)

### For Admin

1. Admin sees all incoming messages
2. Can start a live session with any user
3. During live session, messages are forwarded in real-time both ways
4. When ending a session, the next user in queue automatically becomes active
5. Can view chat history, delete chats, and broadcast messages

## Database Schema

The SQLite database (`bot.db`) contains:

- **users** - User information and activity tracking
- **messages** - All messages with content type, text, and file information
- **admin_sessions** - Active and historical admin sessions
- **user_queue** - FIFO queue of users waiting for admin
- **auto_replies** - Keyword-based automatic response rules

## File Storage

Media files are downloaded and stored in the `UPLOAD_PATH` directory (default: `./uploads`).

For production on Render, use `/tmp/uploads` or migrate to cloud storage (S3).

## Production Considerations

1. **Database**: For production, migrate from SQLite to PostgreSQL
2. **File Storage**: Use S3 or similar for persistent media storage
3. **Rate Limiting**: Implement rate limiting for broadcast to respect Telegram API limits
4. **Monitoring**: Add logging and error tracking
5. **Backup**: Regular database backups

## License

MIT License
