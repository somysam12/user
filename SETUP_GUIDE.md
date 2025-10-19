# Quick Setup Guide

## Your Bot is Running! 🎉

The Telegram support bot is now active and ready to receive messages.

## Next Steps

### 1. Set Webhook URL (Important for Production)

For the bot to receive messages on Replit, you need to set the webhook URL:

1. Get your Replit app URL (should be something like: `https://your-repl-name.repl.co`)
2. Update the `WEBHOOK_URL` secret in Replit Secrets:
   - Format: `https://your-repl-name.repl.co/webhook/YOUR_BOT_TOKEN`
   - Replace `YOUR_BOT_TOKEN` with your actual Telegram bot token
3. The bot will automatically set the webhook on next restart

**OR** you can manually set the webhook by visiting this URL in your browser:
```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://your-repl-name.repl.co/webhook/<YOUR_BOT_TOKEN>
```

### 2. Test Your Bot

1. Open Telegram and search for your bot by its username
2. Send `/start` to your bot as the admin
3. You should see the Admin Control Panel with all the buttons

### 3. Have Users Test It

1. Share your bot with test users
2. They can send messages (text, photos, videos, voice notes, documents)
3. All messages will be stored in the SQLite database
4. You'll see them in your admin panel

## Admin Features

### Control Panel Buttons:

- **👥 Users** - View all users with unread message counts (paginated)
- **👁 View @username** - View chat history with a specific user
- **🗑 Delete all chats** - Delete all stored messages
- **🗑 Delete @username** - Delete messages from a specific user
- **💬 Start live @username** - Start real-time chat with a user
- **🛑 End live session** - End current session and move to next in queue
- **📢 Broadcast** - Send message to all users
- **🤖 Auto replies** - Configure automatic keyword responses

## How It Works

### For Regular Users:
1. Users send messages to your bot
2. Messages are stored in the database
3. If you're in a live session with them, messages are forwarded instantly
4. If you're busy, they're queued and may get auto-replies

### For Admin (You):
1. Send `/start` to see the control panel
2. Click any button to perform actions
3. Start a live session to chat with users in real-time
4. When you end a session, the next user in queue automatically becomes active

## Database

All data is stored in `bot.db` (SQLite database) in the same directory as `main.py`.

The database includes:
- **users** - User information
- **messages** - All messages (text and media)
- **admin_sessions** - Session tracking
- **user_queue** - Waiting users
- **auto_replies** - Keyword-based responses

## File Storage

Media files (photos, videos, documents) are downloaded to the `./uploads` directory.

## Troubleshooting

### Bot not receiving messages?
- Make sure WEBHOOK_URL is set correctly in Replit Secrets
- Check that the webhook is set: visit `https://api.telegram.org/bot<TOKEN>/getWebhookInfo`

### Can't see admin panel?
- Make sure your ADMIN_ID is correct
- Send `/start` to the bot

### Messages not forwarding?
- Check if you have an active live session
- Users might be queued if you're in a session with someone else

## Production Deployment

To deploy on Render.com:

1. Push your code to GitHub
2. Create a Web Service on Render
3. Set environment variables:
   - `TELEGRAM_TOKEN`
   - `ADMIN_ID`
   - `WEBHOOK_URL` (your Render app URL + `/webhook/` + your token)
4. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

For production, consider:
- Migrating to PostgreSQL instead of SQLite
- Using cloud storage (S3) for media files
- Adding rate limiting for broadcasts
