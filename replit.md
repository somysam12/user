# Overview

A full-featured Telegram support bot built with Python, FastAPI, and SQLAlchemy. The bot provides an admin control panel for managing user conversations, message queuing, live chat sessions, and automated responses. Users can send messages (text and media) to the bot, which are stored in a database. Admins can view messages, start live chat sessions with ANY username (even if user hasn't contacted bot yet), broadcast to all users, and configure auto-replies based on keywords.

# Recent Changes

**October 19, 2025 (Security & UX Updates)**
- **SECURITY FIX**: Removed bot token from webhook URL path to prevent token exposure in logs and URLs
- **SECURITY FIX**: Stopped logging sensitive webhook data 
- Added WEBHOOK_SECRET environment variable for secure webhook authentication
- Improved UX: Admins can now message ANY username (even if user hasn't contacted bot yet)
- Messages to users who haven't contacted the bot are saved in database and will be visible when they do contact
- Updated .env.example and SETUP_GUIDE.md with new webhook security instructions

**October 19, 2025 (Earlier)**
- Removed START button from user interface to make bot look more natural (like chatting with a real person)
- Fixed live chat to allow admins to start sessions with any username, not just users who've already contacted the bot
- Added Render.com deployment support with render.yaml blueprint
- Generated requirements.txt for easy deployment
- Updated deployment documentation

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Backend Architecture

**Framework**: FastAPI is used to create a lightweight, async web server that handles Telegram webhooks. The application runs in webhook mode for production deployment rather than polling mode, which is more efficient and reliable for cloud hosting.

**Asynchronous Design**: The entire application uses async/await patterns with python-telegram-bot v20+ library, enabling non-blocking operations for handling multiple user messages and admin actions concurrently.

**Single File Structure**: All core logic resides in `main.py`, including database models, bot handlers, admin controls, and webhook endpoints. This design simplifies deployment and maintenance while keeping related functionality grouped together.

**Session Management**: The bot implements a live session system where an admin can chat in real-time with one user at a time. Other users are automatically queued when the admin is busy. This prevents message conflicts and provides organized support workflows.

## Database Layer

**ORM**: SQLAlchemy is used for database abstraction, providing type safety and easy query construction. The declarative base pattern defines models as Python classes.

**Storage Solution**: SQLite database hardcoded in main.py (`sqlite:///./bot.db`) as per user preference. All database logic is contained within main.py.

**Core Models**:
- `User`: Stores Telegram user information (telegram_id, username, first_seen, last_seen)
- `Message`: Stores all message content including text, media file IDs, file paths, and whether it's from admin or user
- `AdminSession`: Tracks active and historical admin chat sessions
- `UserQueue`: FIFO queue for users waiting to chat with admin
- `AutoReply`: Keyword-based automatic response configuration

**Rationale**: SQLite requires zero setup and is perfect for the user's requirements. All database models and configuration are included in main.py as requested.

## Message Processing

**Media Handling**: When users send photos, videos, voice notes, or documents, the bot downloads them to a local `uploads/` directory and stores both the Telegram file_id and local file_path in the database. This dual storage allows re-sending media without re-downloading.

**Content Types**: The system tracks different message types (text, photo, video, voice, document) via a `content_type` field, enabling appropriate rendering in chat histories.

**Pagination**: User lists and chat histories are paginated (10 items per page) using inline keyboard buttons for navigation, preventing overwhelming displays for admins with many users.

## Admin Interface

**Inline Keyboards**: All admin controls are presented through Telegram inline keyboards, providing a native app-like experience within the Telegram chat interface.

**Callback Query Handlers**: Button presses trigger callback queries that are processed to perform actions like viewing users, starting live sessions, deleting chats, or configuring auto-replies.

**Control Panel Features**:
- View all users with unread message counts
- View chat history with specific users
- Start/end live chat sessions
- Delete chat histories (all or per-user)
- Broadcast messages to all users
- Configure keyword-based auto-replies

## Auto-Reply System

**Conditional Responses**: Auto-replies only trigger when the admin is NOT in an active live session with a user. This prevents automated responses from interrupting real conversations.

**Keyword Matching**: Configured keywords trigger specific automated responses, reducing admin workload for common questions.

# External Dependencies

## Telegram Bot API

**python-telegram-bot v20+**: Async-based library for interacting with Telegram's Bot API. Handles all bot operations including sending/receiving messages, managing keyboards, downloading media, and processing callbacks.

**Webhook Integration**: FastAPI receives POST requests from Telegram servers at `/webhook/{bot_token}` endpoint. The webhook URL must be registered with Telegram's setWebhook API method.

## Web Framework

**FastAPI**: Serves as the HTTP server for receiving webhooks. Chosen for its async support, automatic OpenAPI documentation, and minimal overhead.

**Uvicorn**: ASGI server that runs the FastAPI application in production.

## Database

**SQLAlchemy**: ORM layer that abstracts database operations. Supports multiple database backends through connection strings.

**SQLite/PostgreSQL**: SQLite for local development, PostgreSQL recommended for production (particularly on Render.com). The `DATABASE_URL` environment variable controls which database is used.

## Environment Configuration

**python-dotenv**: Loads environment variables from `.env` file during development.

**Required Variables**:
- `TELEGRAM_TOKEN`: Bot token from BotFather
- `ADMIN_ID`: Telegram user ID(s) of authorized admins (comma-separated for multiple)
- `DATABASE_URL`: Database connection string
- `WEBHOOK_URL`: Public URL where Telegram sends updates
- `UPLOAD_PATH`: Directory for storing downloaded media files
- `PORT`: HTTP server port (default 5000)

## Deployment Platform

**Render.com**: Primary deployment target. The bot is designed to run as a Web Service on Render, which provides:
- Automatic HTTPS endpoints for webhooks
- PostgreSQL database hosting
- Persistent disk storage for media files
- Environment variable management