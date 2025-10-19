import os
import asyncio
import logging
import secrets
from datetime import datetime, timedelta
from typing import Optional
from pathlib import Path

from fastapi import FastAPI, Request, HTTPException
from telegram import Bot, Update, InlineKeyboardButton, InlineKeyboardMarkup, ForceReply
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes, CallbackQueryHandler
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import sessionmaker, declarative_base, relationship
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN", "")
ADMIN_IDS = set(int(x.strip()) for x in os.getenv("ADMIN_ID", "").split(",") if x.strip())
DB_URL = "sqlite:///./bot.db"
WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET", secrets.token_urlsafe(32))
WEBHOOK_URL = os.getenv("WEBHOOK_URL", "")
UPLOAD_PATH = os.getenv("UPLOAD_PATH", "./uploads")
PORT = int(os.getenv("PORT", "5000"))

Path(UPLOAD_PATH).mkdir(parents=True, exist_ok=True)

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    telegram_id = Column(Integer, unique=True, index=True, nullable=True)
    username = Column(String, index=True, nullable=True)
    first_seen = Column(DateTime, default=datetime.utcnow)
    last_seen = Column(DateTime, default=datetime.utcnow)

class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    from_admin = Column(Boolean, default=False)
    content_type = Column(String)
    text = Column(Text, nullable=True)
    file_id = Column(String, nullable=True)
    file_path = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    seen_by_admin = Column(Boolean, default=False)
    user = relationship("User")

class AdminSession(Base):
    __tablename__ = "admin_sessions"
    id = Column(Integer, primary_key=True)
    admin_id = Column(Integer)
    active_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    active_group_id = Column(Integer, ForeignKey("groups.id"), nullable=True)
    session_type = Column(String, default="user")
    is_active = Column(Boolean, default=False)
    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)

class UserQueue(Base):
    __tablename__ = "user_queue"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class AutoReply(Base):
    __tablename__ = "auto_replies"
    id = Column(Integer, primary_key=True)
    keyword = Column(String, unique=True, index=True)
    reply_text = Column(Text)
    reply_photo_file_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Group(Base):
    __tablename__ = "groups"
    id = Column(Integer, primary_key=True)
    telegram_id = Column(Integer, unique=True, index=True)
    title = Column(String)
    username = Column(String, nullable=True)
    bot_has_admin = Column(Boolean, default=False)
    first_seen = Column(DateTime, default=datetime.utcnow)
    last_seen = Column(DateTime, default=datetime.utcnow)

class GroupMessage(Base):
    __tablename__ = "group_messages"
    id = Column(Integer, primary_key=True)
    group_id = Column(Integer, ForeignKey("groups.id"))
    user_id = Column(Integer, nullable=True)
    username = Column(String, nullable=True)
    content_type = Column(String)
    text = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    group = relationship("Group")

class MutedUser(Base):
    __tablename__ = "muted_users"
    id = Column(Integer, primary_key=True)
    group_id = Column(Integer, ForeignKey("groups.id"))
    user_id = Column(Integer)
    username = Column(String, nullable=True)
    muted_until = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class BannedUser(Base):
    __tablename__ = "banned_users"
    id = Column(Integer, primary_key=True)
    group_id = Column(Integer, ForeignKey("groups.id"))
    user_id = Column(Integer)
    username = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

if "sqlite" in DB_URL:
    engine = create_engine(DB_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DB_URL)

SessionLocal = sessionmaker(bind=engine)

def init_db():
    Base.metadata.create_all(engine)

app = FastAPI()
bot_app: Optional[Application] = None
session_lock = asyncio.Lock()

admin_state = {}

def get_or_create_user(db, tg_user):
    user = db.query(User).filter_by(telegram_id=tg_user.id).first()
    
    if not user:
        username = getattr(tg_user, "username", None)
        if username:
            from sqlalchemy import func
            user = db.query(User).filter(
                func.lower(User.username) == username.lower(),
                User.telegram_id.is_(None)
            ).first()
            if user:
                user.telegram_id = tg_user.id
                user.username = username
                user.last_seen = datetime.utcnow()
                db.commit()
                db.refresh(user)
                return user
        
        user = User(telegram_id=tg_user.id, username=username)
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        user.last_seen = datetime.utcnow()
        user.username = getattr(tg_user, "username", user.username)
        db.commit()
    return user

def get_active_session(db, admin_id):
    return db.query(AdminSession).filter_by(admin_id=admin_id, is_active=True).first()

def get_or_create_group(db, tg_chat):
    group = db.query(Group).filter_by(telegram_id=tg_chat.id).first()
    
    if not group:
        group = Group(
            telegram_id=tg_chat.id,
            title=tg_chat.title,
            username=getattr(tg_chat, "username", None)
        )
        db.add(group)
        db.commit()
        db.refresh(group)
    else:
        group.last_seen = datetime.utcnow()
        group.title = tg_chat.title
        db.commit()
    return group

def admin_keyboard():
    keyboard = [
        [InlineKeyboardButton("👥 Users", callback_data="users_page_1"),
         InlineKeyboardButton("👁 View @username", callback_data="view_user")],
        [InlineKeyboardButton("👪 Groups", callback_data="groups_page_1"),
         InlineKeyboardButton("💬 Start live @username", callback_data="start_live")],
        [InlineKeyboardButton("🗑 Delete all chats", callback_data="delete_all"),
         InlineKeyboardButton("🗑 Delete @username", callback_data="delete_user")],
        [InlineKeyboardButton("🛑 End live session", callback_data="end_live"),
         InlineKeyboardButton("📊 Leaderboard", callback_data="leaderboard_menu")],
        [InlineKeyboardButton("📢 Broadcast", callback_data="broadcast"),
         InlineKeyboardButton("🤖 Auto replies", callback_data="auto_replies")]
    ]
    return InlineKeyboardMarkup(keyboard)

async def download_file(file_id: str, file_type: str):
    try:
        file = await bot_app.bot.get_file(file_id)
        file_extension = file.file_path.split('.')[-1] if '.' in file.file_path else file_type
        local_filename = f"{file_id}.{file_extension}"
        local_path = os.path.join(UPLOAD_PATH, local_filename)
        await file.download_to_drive(local_path)
        return local_path
    except Exception as e:
        logger.error(f"Error downloading file: {e}")
        return None

async def enqueue_user(db, user_id: int):
    existing = db.query(UserQueue).filter_by(user_id=user_id).first()
    if not existing:
        queue_entry = UserQueue(user_id=user_id)
        db.add(queue_entry)
        db.commit()

async def dequeue_next_user(db):
    next_in_queue = db.query(UserQueue).order_by(UserQueue.created_at).first()
    if next_in_queue:
        user_id = next_in_queue.user_id
        db.delete(next_in_queue)
        db.commit()
        return user_id
    return None

async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    if user.id in ADMIN_IDS:
        await update.message.reply_text(
            "Admin Control Panel",
            reply_markup=admin_keyboard()
        )
    else:
        db = SessionLocal()
        try:
            get_or_create_user(db, user)
            await update.message.reply_text("Hello! Send me a message and our support team will get back to you.")
        finally:
            db.close()

async def handle_user_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    message = update.message
    chat = update.effective_chat
    
    if chat.type in ['group', 'supergroup']:
        await handle_group_message(update, context)
        return
    
    if user.id in ADMIN_IDS:
        await handle_admin_message(update, context)
        return
    
    db = SessionLocal()
    try:
        db_user = get_or_create_user(db, user)
        
        content_type = "text"
        text_content = message.text
        file_id = None
        file_path = None
        
        if message.photo:
            content_type = "photo"
            file_id = message.photo[-1].file_id
            file_path = await download_file(file_id, "photo")
        elif message.video:
            content_type = "video"
            file_id = message.video.file_id
            file_path = await download_file(file_id, "video")
        elif message.voice:
            content_type = "voice"
            file_id = message.voice.file_id
            file_path = await download_file(file_id, "voice")
        elif message.document:
            content_type = "document"
            file_id = message.document.file_id
            file_path = await download_file(file_id, "document")
        
        if message.caption:
            text_content = message.caption
        
        msg_record = Message(
            user_id=db_user.id,
            from_admin=False,
            content_type=content_type,
            text=text_content,
            file_id=file_id,
            file_path=file_path
        )
        db.add(msg_record)
        db.commit()
        
        for admin_id in ADMIN_IDS:
            session = get_active_session(db, admin_id)
            if session and session.active_user_id == db_user.id:
                msg_record.seen_by_admin = True
                db.commit()
                
                await forward_message_to_admin(admin_id, db_user, message)
                return
        
        await enqueue_user(db, db_user.id)
        
        auto_reply = await check_auto_reply(db, text_content)
        if auto_reply:
            reply_text, reply_photo = auto_reply
            if reply_photo:
                await message.reply_photo(photo=reply_photo, caption=reply_text)
            else:
                await message.reply_text(reply_text)
        
    finally:
        db.close()

async def check_auto_reply(db, text: Optional[str]):
    if not text:
        return None
    
    text_lower = text.lower()
    auto_replies = db.query(AutoReply).all()
    
    for ar in auto_replies:
        if ar.keyword.lower() in text_lower:
            return (ar.reply_text, ar.reply_photo_file_id)
    
    return None

async def forward_message_to_admin(admin_id: int, user, message):
    try:
        prefix = f"💬 Message from @{user.username or user.telegram_id}:\n\n"
        
        if message.photo:
            await bot_app.bot.send_photo(
                chat_id=admin_id,
                photo=message.photo[-1].file_id,
                caption=prefix + (message.caption or "")
            )
        elif message.video:
            await bot_app.bot.send_video(
                chat_id=admin_id,
                video=message.video.file_id,
                caption=prefix + (message.caption or "")
            )
        elif message.voice:
            await bot_app.bot.send_voice(
                chat_id=admin_id,
                voice=message.voice.file_id,
                caption=prefix
            )
        elif message.document:
            await bot_app.bot.send_document(
                chat_id=admin_id,
                document=message.document.file_id,
                caption=prefix + (message.caption or "")
            )
        else:
            await bot_app.bot.send_message(
                chat_id=admin_id,
                text=prefix + message.text
            )
    except Exception as e:
        logger.error(f"Error forwarding message to admin: {e}")

async def handle_group_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    message = update.message
    chat = update.effective_chat
    
    if not message or not message.text:
        return
    
    db = SessionLocal()
    try:
        group = get_or_create_group(db, chat)
        
        group_msg = GroupMessage(
            group_id=group.id,
            user_id=user.id,
            username=user.username,
            content_type="text",
            text=message.text
        )
        db.add(group_msg)
        db.commit()
        
        for admin_id in ADMIN_IDS:
            session = get_active_session(db, admin_id)
            if session and session.session_type == "group" and session.active_group_id == group.id:
                prefix = f"👪 {group.title}\n@{user.username or user.id}: "
                await bot_app.bot.send_message(
                    chat_id=admin_id,
                    text=prefix + message.text
                )
                return
        
        if message.text.startswith('/leaderboard'):
            await show_leaderboard(update, group.id)
            
    finally:
        db.close()

async def show_leaderboard(update: Update, group_id: int):
    db = SessionLocal()
    try:
        from sqlalchemy import func
        period = "week"
        
        if update.message.text:
            if "day" in update.message.text:
                period = "day"
            elif "month" in update.message.text:
                period = "month"
        
        if period == "day":
            time_ago = datetime.utcnow() - timedelta(days=1)
        elif period == "week":
            time_ago = datetime.utcnow() - timedelta(days=7)
        else:
            time_ago = datetime.utcnow() - timedelta(days=30)
        
        results = db.query(
            GroupMessage.username,
            func.count(GroupMessage.id).label('msg_count')
        ).filter(
            GroupMessage.group_id == group_id,
            GroupMessage.timestamp >= time_ago
        ).group_by(GroupMessage.username).order_by(func.count(GroupMessage.id).desc()).limit(10).all()
        
        if not results:
            await update.message.reply_text("No messages in this period!")
            return
        
        text = f"📊 Leaderboard ({period.capitalize()}):\n\n"
        for idx, (username, count) in enumerate(results, 1):
            medal = "🥇" if idx == 1 else "🥈" if idx == 2 else "🥉" if idx == 3 else f"{idx}."
            text += f"{medal} @{username or 'Unknown'}: {count} messages\n"
        
        await update.message.reply_text(text)
    finally:
        db.close()

async def handle_admin_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    admin_id = update.effective_user.id
    message = update.message
    
    if admin_id in admin_state:
        state = admin_state[admin_id]
        
        if state.get("awaiting") == "username_view":
            await handle_view_username(update, context, message.text)
            del admin_state[admin_id]
            return
        elif state.get("awaiting") == "username_delete":
            await handle_delete_username(update, context, message.text)
            del admin_state[admin_id]
            return
        elif state.get("awaiting") == "username_live":
            await handle_start_live_username(update, context, message.text)
            del admin_state[admin_id]
            return
        elif state.get("awaiting") == "broadcast":
            await handle_broadcast_message(update, context)
            del admin_state[admin_id]
            return
        elif state.get("awaiting") == "auto_reply_keyword":
            admin_state[admin_id]["keyword"] = message.text
            admin_state[admin_id]["awaiting"] = "auto_reply_text"
            await message.reply_text("Now send the reply text for this keyword:")
            return
        elif state.get("awaiting") == "auto_reply_text":
            photo_id = message.photo[-1].file_id if message.photo else None
            text = message.caption if message.photo else message.text
            await handle_add_auto_reply(update, context, state["keyword"], text, photo_id)
            del admin_state[admin_id]
            return
        elif state.get("awaiting") == "auto_reply_delete_keyword":
            await handle_delete_auto_reply(update, context, message.text)
            del admin_state[admin_id]
            return
    
    db = SessionLocal()
    try:
        session = get_active_session(db, admin_id)
        
        if session and session.session_type == "group" and session.active_group_id:
            group = db.query(Group).filter_by(id=session.active_group_id).first()
            if group:
                try:
                    if message.photo:
                        await bot_app.bot.send_photo(
                            chat_id=group.telegram_id,
                            photo=message.photo[-1].file_id,
                            caption=message.caption
                        )
                    elif message.video:
                        await bot_app.bot.send_video(
                            chat_id=group.telegram_id,
                            video=message.video.file_id,
                            caption=message.caption
                        )
                    elif message.document:
                        await bot_app.bot.send_document(
                            chat_id=group.telegram_id,
                            document=message.document.file_id,
                            caption=message.caption
                        )
                    else:
                        await bot_app.bot.send_message(
                            chat_id=group.telegram_id,
                            text=message.text
                        )
                    await message.reply_text(f"✅ Message sent to group: {group.title}")
                except Exception as e:
                    logger.error(f"Error sending message to group: {e}")
                    await message.reply_text(f"❌ Error: {str(e)}")
                return
        
        if session and session.active_user_id:
            user = db.query(User).filter_by(id=session.active_user_id).first()
            if user:
                content_type = "text"
                text_content = message.text
                file_id = None
                
                if message.photo:
                    content_type = "photo"
                    file_id = message.photo[-1].file_id
                elif message.video:
                    content_type = "video"
                    file_id = message.video.file_id
                elif message.voice:
                    content_type = "voice"
                    file_id = message.voice.file_id
                elif message.document:
                    content_type = "document"
                    file_id = message.document.file_id
                
                if message.caption:
                    text_content = message.caption
                
                msg_record = Message(
                    user_id=user.id,
                    from_admin=True,
                    content_type=content_type,
                    text=text_content,
                    file_id=file_id,
                    seen_by_admin=True
                )
                db.add(msg_record)
                db.commit()
                
                if user.telegram_id is None:
                    await message.reply_text(
                        f"✅ Message saved for @{user.username}.\n"
                        f"⚠️ Note: This user hasn't messaged the bot yet, so we can't send it to them directly.\n"
                        f"The message will be in the chat history when they contact the bot."
                    )
                    return
                
                try:
                    if message.photo:
                        await bot_app.bot.send_photo(
                            chat_id=user.telegram_id,
                            photo=message.photo[-1].file_id,
                            caption=message.caption
                        )
                    elif message.video:
                        await bot_app.bot.send_video(
                            chat_id=user.telegram_id,
                            video=message.video.file_id,
                            caption=message.caption
                        )
                    elif message.voice:
                        await bot_app.bot.send_voice(
                            chat_id=user.telegram_id,
                            voice=message.voice.file_id
                        )
                    elif message.document:
                        await bot_app.bot.send_document(
                            chat_id=user.telegram_id,
                            document=message.document.file_id,
                            caption=message.caption
                        )
                    else:
                        await bot_app.bot.send_message(
                            chat_id=user.telegram_id,
                            text=message.text
                        )
                    await message.reply_text("✅ Message sent to user")
                except Exception as e:
                    logger.error(f"Error sending message to user: {e}")
                    await message.reply_text(f"❌ Error sending message: {str(e)}")
        else:
            await message.reply_text("No active session. Use the control panel to start a session.", reply_markup=admin_keyboard())
    finally:
        db.close()

async def callback_query_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    user_id = query.from_user.id
    if user_id not in ADMIN_IDS:
        await query.message.reply_text("Unauthorized")
        return
    
    data = query.data
    
    if data.startswith("users_page_"):
        page = int(data.split("_")[-1])
        await show_users_page(query, page)
    elif data.startswith("groups_page_"):
        page = int(data.split("_")[-1])
        await show_groups_page(query, page)
    elif data.startswith("select_group_"):
        group_id = int(data.split("_")[-1])
        await start_group_session(query, group_id)
    elif data == "leaderboard_menu":
        await show_leaderboard_menu(query)
    elif data == "view_user":
        admin_state[user_id] = {"awaiting": "username_view"}
        await query.message.reply_text("Send the username (with or without @):")
    elif data == "delete_all":
        keyboard = [
            [InlineKeyboardButton("✅ Yes, delete all", callback_data="confirm_delete_all"),
             InlineKeyboardButton("❌ Cancel", callback_data="cancel")]
        ]
        await query.message.reply_text(
            "⚠️ Are you sure you want to delete ALL chat history?",
            reply_markup=InlineKeyboardMarkup(keyboard)
        )
    elif data == "confirm_delete_all":
        await delete_all_chats(query)
    elif data == "delete_user":
        admin_state[user_id] = {"awaiting": "username_delete"}
        await query.message.reply_text("Send the username to delete (with or without @):")
    elif data == "start_live":
        admin_state[user_id] = {"awaiting": "username_live"}
        await query.message.reply_text("Send the username to start live session (with or without @):")
    elif data == "end_live":
        await end_live_session(query)
    elif data == "broadcast":
        admin_state[user_id] = {"awaiting": "broadcast"}
        await query.message.reply_text("Send the message to broadcast (text or media with caption):")
    elif data == "auto_replies":
        await show_auto_replies_menu(query)
    elif data == "add_auto_reply":
        admin_state[user_id] = {"awaiting": "auto_reply_keyword"}
        await query.message.reply_text("Send the keyword for auto-reply:")
    elif data == "delete_auto_reply":
        admin_state[user_id] = {"awaiting": "auto_reply_delete_keyword"}
        await query.message.reply_text("Send the keyword to delete:")
    elif data == "list_auto_replies":
        await list_auto_replies(query)
    elif data.startswith("view_history_"):
        user_id_to_view = int(data.split("_")[-2])
        page = int(data.split("_")[-1])
        await show_user_history(query, user_id_to_view, page)
    elif data == "cancel":
        await query.message.reply_text("Cancelled", reply_markup=admin_keyboard())

async def show_users_page(query, page: int):
    db = SessionLocal()
    try:
        per_page = 10
        offset = (page - 1) * per_page
        
        users = db.query(User).order_by(User.last_seen.desc()).limit(per_page).offset(offset).all()
        total_users = db.query(User).count()
        total_pages = (total_users + per_page - 1) // per_page
        
        if not users:
            await query.message.reply_text("No users found")
            return
        
        text = f"👥 Users (Page {page}/{total_pages}):\n\n"
        
        for user in users:
            unread_count = db.query(Message).filter_by(user_id=user.id, from_admin=False, seen_by_admin=False).count()
            text += f"@{user.username or user.telegram_id} - {unread_count} unread\n"
        
        keyboard = []
        nav_buttons = []
        if page > 1:
            nav_buttons.append(InlineKeyboardButton("⬅️ Prev", callback_data=f"users_page_{page-1}"))
        if page < total_pages:
            nav_buttons.append(InlineKeyboardButton("➡️ Next", callback_data=f"users_page_{page+1}"))
        
        if nav_buttons:
            keyboard.append(nav_buttons)
        
        keyboard.append([InlineKeyboardButton("🔙 Back to menu", callback_data="cancel")])
        
        await query.message.reply_text(text, reply_markup=InlineKeyboardMarkup(keyboard))
    finally:
        db.close()

async def show_groups_page(query, page: int):
    db = SessionLocal()
    try:
        per_page = 10
        offset = (page - 1) * per_page
        
        groups = db.query(Group).order_by(Group.last_seen.desc()).limit(per_page).offset(offset).all()
        total_groups = db.query(Group).count()
        total_pages = (total_groups + per_page - 1) // per_page
        
        if not groups:
            await query.message.reply_text("No groups found. Add the bot to groups first!")
            return
        
        text = f"👪 Groups (Page {page}/{total_pages}):\n\n"
        
        for idx, group in enumerate(groups, start=offset+1):
            text += f"{idx}. {group.title}\n"
        
        keyboard = []
        group_buttons = []
        for idx, group in enumerate(groups, start=offset+1):
            group_buttons.append(InlineKeyboardButton(f"#{idx}", callback_data=f"select_group_{group.id}"))
            if len(group_buttons) == 3:
                keyboard.append(group_buttons)
                group_buttons = []
        if group_buttons:
            keyboard.append(group_buttons)
        
        nav_buttons = []
        if page > 1:
            nav_buttons.append(InlineKeyboardButton("⬅️ Prev", callback_data=f"groups_page_{page-1}"))
        if page < total_pages:
            nav_buttons.append(InlineKeyboardButton("➡️ Next", callback_data=f"groups_page_{page+1}"))
        
        if nav_buttons:
            keyboard.append(nav_buttons)
        
        keyboard.append([InlineKeyboardButton("🔙 Back to menu", callback_data="cancel")])
        
        await query.message.reply_text(text, reply_markup=InlineKeyboardMarkup(keyboard))
    finally:
        db.close()

async def start_group_session(query, group_id: int):
    db = SessionLocal()
    try:
        group = db.query(Group).filter_by(id=group_id).first()
        if not group:
            await query.message.reply_text("Group not found!")
            return
        
        admin_id = query.from_user.id
        existing_session = get_active_session(db, admin_id)
        if existing_session:
            existing_session.is_active = False
            existing_session.ended_at = datetime.utcnow()
        
        new_session = AdminSession(
            admin_id=admin_id,
            active_group_id=group_id,
            session_type="group",
            is_active=True,
            started_at=datetime.utcnow()
        )
        db.add(new_session)
        db.commit()
        
        await query.message.reply_text(
            f"✅ Live session started with group: {group.title}\n"
            f"All messages from this group will be forwarded to you.\n"
            f"Your messages will be sent to the group.\n\n"
            f"Use 'End live session' button to stop."
        )
    finally:
        db.close()

async def show_leaderboard_menu(query):
    keyboard = [
        [InlineKeyboardButton("📊 Day Leaders", callback_data="lb_day"),
         InlineKeyboardButton("📊 Week Leaders", callback_data="lb_week")],
        [InlineKeyboardButton("📊 Month Leaders", callback_data="lb_month")],
        [InlineKeyboardButton("🔙 Back to menu", callback_data="cancel")]
    ]
    await query.message.reply_text(
        "Select leaderboard period:",
        reply_markup=InlineKeyboardMarkup(keyboard)
    )

async def handle_view_username(update: Update, context: ContextTypes.DEFAULT_TYPE, username: str):
    username = username.lstrip("@")
    db = SessionLocal()
    try:
        user = db.query(User).filter_by(username=username).first()
        if not user:
            await update.message.reply_text(f"User @{username} not found")
            return
        
        await show_user_history_direct(update.message, user.id, 1)
    finally:
        db.close()

async def show_user_history(query, user_id: int, page: int):
    db = SessionLocal()
    try:
        user = db.query(User).filter_by(id=user_id).first()
        if not user:
            await query.message.reply_text("User not found")
            return
        
        per_page = 10
        offset = (page - 1) * per_page
        
        messages = db.query(Message).filter_by(user_id=user_id).order_by(Message.timestamp.desc()).limit(per_page).offset(offset).all()
        total_messages = db.query(Message).filter_by(user_id=user_id).count()
        total_pages = (total_messages + per_page - 1) // per_page
        
        if not messages:
            await query.message.reply_text("No messages found")
            return
        
        text = f"💬 Chat history with @{user.username or user.telegram_id} (Page {page}/{total_pages}):\n\n"
        
        for msg in reversed(messages):
            sender = "Admin" if msg.from_admin else "User"
            timestamp = msg.timestamp.strftime("%Y-%m-%d %H:%M")
            text += f"[{timestamp}] {sender}: "
            if msg.content_type == "text":
                text += f"{msg.text[:50]}...\n" if msg.text and len(msg.text) > 50 else f"{msg.text}\n"
            else:
                text += f"[{msg.content_type}]\n"
        
        keyboard = []
        nav_buttons = []
        if page > 1:
            nav_buttons.append(InlineKeyboardButton("⬅️ Prev", callback_data=f"view_history_{user_id}_{page-1}"))
        if page < total_pages:
            nav_buttons.append(InlineKeyboardButton("➡️ Next", callback_data=f"view_history_{user_id}_{page+1}"))
        
        if nav_buttons:
            keyboard.append(nav_buttons)
        
        keyboard.append([InlineKeyboardButton("🔙 Back to menu", callback_data="cancel")])
        
        await query.message.reply_text(text, reply_markup=InlineKeyboardMarkup(keyboard))
    finally:
        db.close()

async def show_user_history_direct(message, user_id: int, page: int):
    db = SessionLocal()
    try:
        user = db.query(User).filter_by(id=user_id).first()
        if not user:
            await message.reply_text("User not found")
            return
        
        per_page = 10
        offset = (page - 1) * per_page
        
        messages = db.query(Message).filter_by(user_id=user_id).order_by(Message.timestamp.desc()).limit(per_page).offset(offset).all()
        total_messages = db.query(Message).filter_by(user_id=user_id).count()
        total_pages = (total_messages + per_page - 1) // per_page
        
        if not messages:
            await message.reply_text("No messages found")
            return
        
        text = f"💬 Chat history with @{user.username or user.telegram_id} (Page {page}/{total_pages}):\n\n"
        
        for msg in reversed(messages):
            sender = "Admin" if msg.from_admin else "User"
            timestamp = msg.timestamp.strftime("%Y-%m-%d %H:%M")
            text += f"[{timestamp}] {sender}: "
            if msg.content_type == "text":
                text += f"{msg.text[:50]}...\n" if msg.text and len(msg.text) > 50 else f"{msg.text}\n"
            else:
                text += f"[{msg.content_type}]\n"
        
        keyboard = []
        nav_buttons = []
        if page > 1:
            nav_buttons.append(InlineKeyboardButton("⬅️ Prev", callback_data=f"view_history_{user_id}_{page-1}"))
        if page < total_pages:
            nav_buttons.append(InlineKeyboardButton("➡️ Next", callback_data=f"view_history_{user_id}_{page+1}"))
        
        if nav_buttons:
            keyboard.append(nav_buttons)
        
        keyboard.append([InlineKeyboardButton("🔙 Back to menu", callback_data="cancel")])
        
        await message.reply_text(text, reply_markup=InlineKeyboardMarkup(keyboard))
    finally:
        db.close()

async def delete_all_chats(query):
    db = SessionLocal()
    try:
        db.query(Message).delete()
        db.query(UserQueue).delete()
        db.query(AdminSession).update({"is_active": False, "ended_at": datetime.utcnow()})
        db.commit()
        await query.message.reply_text("✅ All chat history deleted", reply_markup=admin_keyboard())
    except Exception as e:
        logger.error(f"Error deleting all chats: {e}")
        await query.message.reply_text(f"❌ Error: {str(e)}")
    finally:
        db.close()

async def handle_delete_username(update: Update, context: ContextTypes.DEFAULT_TYPE, username: str):
    username = username.lstrip("@")
    db = SessionLocal()
    try:
        user = db.query(User).filter_by(username=username).first()
        if not user:
            await update.message.reply_text(f"User @{username} not found")
            return
        
        db.query(Message).filter_by(user_id=user.id).delete()
        db.query(UserQueue).filter_by(user_id=user.id).delete()
        db.commit()
        
        await update.message.reply_text(f"✅ Chat history for @{username} deleted", reply_markup=admin_keyboard())
    except Exception as e:
        logger.error(f"Error deleting user chats: {e}")
        await update.message.reply_text(f"❌ Error: {str(e)}")
    finally:
        db.close()

async def handle_start_live_username(update: Update, context: ContextTypes.DEFAULT_TYPE, username: str):
    username = username.lstrip("@")
    admin_id = update.effective_user.id
    
    db = SessionLocal()
    try:
        async with session_lock:
            existing_session = get_active_session(db, admin_id)
            if existing_session:
                await update.message.reply_text("You already have an active session. End it first.")
                return
            
            from sqlalchemy import func
            user = db.query(User).filter(func.lower(User.username) == username.lower()).first()
            user_is_new = False
            user_not_contacted = False
            
            if not user:
                user = User(telegram_id=None, username=username)
                db.add(user)
                db.commit()
                db.refresh(user)
                user_is_new = True
                user_not_contacted = True
            elif user.telegram_id is None:
                user_not_contacted = True
            
            session = AdminSession(
                admin_id=admin_id,
                active_user_id=user.id,
                is_active=True,
                started_at=datetime.utcnow()
            )
            db.add(session)
            
            db.query(UserQueue).filter_by(user_id=user.id).delete()
            
            db.query(Message).filter_by(user_id=user.id, from_admin=False).update({"seen_by_admin": True})
            
            db.commit()
            
            if user_not_contacted:
                await update.message.reply_text(
                    f"✅ Live session started with @{username}\n\n"
                    f"⚠️ Note: This user hasn't messaged the bot yet, so you cannot send messages to them until they contact the bot first.",
                    reply_markup=admin_keyboard()
                )
            else:
                await update.message.reply_text(
                    f"✅ Live session started with @{username}\nYou can now chat directly. Messages will be forwarded in real-time.",
                    reply_markup=admin_keyboard()
                )
    finally:
        db.close()

async def end_live_session(query):
    admin_id = query.from_user.id
    db = SessionLocal()
    try:
        async with session_lock:
            session = get_active_session(db, admin_id)
            if not session:
                await query.message.reply_text("No active session to end")
                return
            
            session.is_active = False
            session.ended_at = datetime.utcnow()
            db.commit()
            
            next_user_id = await dequeue_next_user(db)
            
            if next_user_id:
                user = db.query(User).filter_by(id=next_user_id).first()
                if user:
                    new_session = AdminSession(
                        admin_id=admin_id,
                        active_user_id=user.id,
                        is_active=True,
                        started_at=datetime.utcnow()
                    )
                    db.add(new_session)
                    db.commit()
                    
                    unread_messages = db.query(Message).filter_by(
                        user_id=user.id,
                        from_admin=False,
                        seen_by_admin=False
                    ).order_by(Message.timestamp).all()
                    
                    for msg in unread_messages:
                        msg.seen_by_admin = True
                    db.commit()
                    
                    await query.message.reply_text(
                        f"✅ Session ended. Starting new session with @{user.username or user.telegram_id} (next in queue)",
                        reply_markup=admin_keyboard()
                    )
                    return
            
            await query.message.reply_text("✅ Session ended. No users in queue.", reply_markup=admin_keyboard())
    finally:
        db.close()

async def handle_broadcast_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    message = update.message
    db = SessionLocal()
    try:
        users = db.query(User).all()
        
        success_count = 0
        fail_count = 0
        
        for user in users:
            try:
                if message.photo:
                    await bot_app.bot.send_photo(
                        chat_id=user.telegram_id,
                        photo=message.photo[-1].file_id,
                        caption=message.caption
                    )
                elif message.video:
                    await bot_app.bot.send_video(
                        chat_id=user.telegram_id,
                        video=message.video.file_id,
                        caption=message.caption
                    )
                elif message.voice:
                    await bot_app.bot.send_voice(
                        chat_id=user.telegram_id,
                        voice=message.voice.file_id
                    )
                elif message.document:
                    await bot_app.bot.send_document(
                        chat_id=user.telegram_id,
                        document=message.document.file_id,
                        caption=message.caption
                    )
                else:
                    await bot_app.bot.send_message(
                        chat_id=user.telegram_id,
                        text=message.text
                    )
                success_count += 1
                await asyncio.sleep(0.05)
            except Exception as e:
                logger.error(f"Error broadcasting to {user.telegram_id}: {e}")
                fail_count += 1
        
        await message.reply_text(
            f"📢 Broadcast complete!\n✅ Sent: {success_count}\n❌ Failed: {fail_count}",
            reply_markup=admin_keyboard()
        )
    finally:
        db.close()

async def show_auto_replies_menu(query):
    keyboard = [
        [InlineKeyboardButton("➕ Add Auto Reply", callback_data="add_auto_reply")],
        [InlineKeyboardButton("➖ Delete Auto Reply", callback_data="delete_auto_reply")],
        [InlineKeyboardButton("📋 List Auto Replies", callback_data="list_auto_replies")],
        [InlineKeyboardButton("🔙 Back to menu", callback_data="cancel")]
    ]
    await query.message.reply_text("🤖 Auto Replies Menu:", reply_markup=InlineKeyboardMarkup(keyboard))

async def handle_add_auto_reply(update: Update, context: ContextTypes.DEFAULT_TYPE, keyword: str, reply_text: str, photo_file_id: str = None):
    db = SessionLocal()
    try:
        existing = db.query(AutoReply).filter_by(keyword=keyword).first()
        if existing:
            existing.reply_text = reply_text
            if photo_file_id:
                existing.reply_photo_file_id = photo_file_id
        else:
            auto_reply = AutoReply(keyword=keyword, reply_text=reply_text, reply_photo_file_id=photo_file_id)
            db.add(auto_reply)
        db.commit()
        
        await update.message.reply_text(
            f"✅ Auto-reply added!\nKeyword: {keyword}\nReply: {reply_text}",
            reply_markup=admin_keyboard()
        )
    finally:
        db.close()

async def handle_delete_auto_reply(update: Update, context: ContextTypes.DEFAULT_TYPE, keyword: str):
    db = SessionLocal()
    try:
        auto_reply = db.query(AutoReply).filter_by(keyword=keyword).first()
        if auto_reply:
            db.delete(auto_reply)
            db.commit()
            await update.message.reply_text(f"✅ Auto-reply for '{keyword}' deleted", reply_markup=admin_keyboard())
        else:
            await update.message.reply_text(f"❌ No auto-reply found for '{keyword}'")
    finally:
        db.close()

async def list_auto_replies(query):
    db = SessionLocal()
    try:
        auto_replies = db.query(AutoReply).all()
        
        if not auto_replies:
            await query.message.reply_text("No auto-replies configured")
            return
        
        text = "🤖 Configured Auto Replies:\n\n"
        for ar in auto_replies:
            text += f"Keyword: {ar.keyword}\nReply: {ar.reply_text}\n\n"
        
        await query.message.reply_text(text, reply_markup=admin_keyboard())
    finally:
        db.close()

async def setup_telegram_app():
    global bot_app
    bot_app = Application.builder().token(TELEGRAM_TOKEN).build()
    
    bot_app.add_handler(CommandHandler("start", start_command))
    bot_app.add_handler(CallbackQueryHandler(callback_query_handler))
    bot_app.add_handler(MessageHandler(filters.ALL & ~filters.COMMAND, handle_user_message))
    
    await bot_app.initialize()
    await bot_app.start()
    
    await bot_app.bot.set_chat_menu_button(menu_button={"type": "commands"})
    await bot_app.bot.set_my_commands([])
    logger.info("Bot menu button hidden for users")
    
    if WEBHOOK_URL:
        full_webhook_url = f"{WEBHOOK_URL}/webhook/{WEBHOOK_SECRET}"
        await bot_app.bot.set_webhook(url=full_webhook_url)
        logger.info("Webhook configured successfully")

@app.on_event("startup")
async def startup_event():
    init_db()
    await setup_telegram_app()
    logger.info("Bot started successfully")

@app.on_event("shutdown")
async def shutdown_event():
    if bot_app:
        await bot_app.stop()
        await bot_app.shutdown()

@app.get("/")
async def root():
    return {"status": "Bot is running"}

@app.post("/webhook/{secret}")
async def telegram_webhook(secret: str, request: Request):
    if secret != WEBHOOK_SECRET:
        logger.warning("Webhook called with invalid secret")
        raise HTTPException(status_code=403, detail="Invalid secret")
    
    try:
        data = await request.json()
        update = Update.de_json(data, bot_app.bot)
        await bot_app.process_update(update)
        return {"ok": True}
    except Exception as e:
        logger.error(f"Error processing webhook: {e}", exc_info=True)
        return {"ok": False, "error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
