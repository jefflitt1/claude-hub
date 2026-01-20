#!/usr/bin/env python3
"""
Telegram Mark-as-Read HTTP Server

A simple HTTP server that exposes an endpoint to mark Telegram chats as read.
This is used by n8n workflows that need to mark approval messages as read
after terminal approvals.

Usage:
    python3 telegram-mark-read-server.py

Endpoints:
    POST /mark-read
    Body: {"chat_id": "123456789"}

The server runs on port 8765 by default (configurable via PORT env var).
"""

import os
import sys
import json
import asyncio
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

# Try to import Telethon
try:
    from telethon import TelegramClient
    from telethon.sessions import StringSession
    TELETHON_AVAILABLE = True
except ImportError:
    print("Error: Telethon not installed. Run: pip3 install telethon")
    sys.exit(1)

# Configuration
PORT = int(os.environ.get('PORT', '8765'))
TELEGRAM_API_ID = os.environ.get('TELEGRAM_API_ID', '34282665')
TELEGRAM_API_HASH = os.environ.get('TELEGRAM_API_HASH', 'ba7794bc1fe83ab88ac5bdcd2e9362a7')
TELEGRAM_SESSION_STRING = os.environ.get('TELEGRAM_SESSION_STRING', '1AZWarzgBu2msmaJSJovy_1UHE8AzitJ_EfdJBAMGYiES24c6QOPnk7zpKhgWI12aLmsvjrksipXDebrO_McNvlE2RheXUN65jv0V0BJaZt_EQkDWXVMz7sn0IW21s2BLtIdfgk_rXvNNdFhD-kUwZFDAmbsPAu0vZErV7wVXmrM1lVG31TBB0YkaiFNJBSAJD6ZmO7KTJV3ESOTTBIJUFVo2xUBleuEa0hHYrGmxVW7SZp6BjZdjALgSxIoEnSmz-wZunbqSV3O-AOqkrpnvbQQeWgvdiNsRNxccVz-mv6WWsFUY4JWWFscnQbmsFUkuqOmw41IBodOD_PLb5JNxHTsQy2_05-w=')
DEFAULT_CHAT_ID = os.environ.get('TELEGRAM_CHAT_ID', '7938188628')


async def mark_as_read(chat_id: str) -> dict:
    """Mark a Telegram chat as read using Telethon."""
    try:
        client = TelegramClient(
            StringSession(TELEGRAM_SESSION_STRING),
            int(TELEGRAM_API_ID),
            TELEGRAM_API_HASH
        )
        await client.connect()

        if not await client.is_user_authorized():
            await client.disconnect()
            return {"success": False, "error": "Telegram client not authorized"}

        await client.send_read_acknowledge(int(chat_id))
        await client.disconnect()

        return {"success": True, "chat_id": chat_id, "message": "Chat marked as read"}
    except Exception as e:
        return {"success": False, "error": str(e)}


class MarkReadHandler(BaseHTTPRequestHandler):
    """HTTP request handler for mark-as-read requests."""

    def log_message(self, format, *args):
        """Custom logging."""
        print(f"[telegram-mark-read] {args[0]}")

    def send_json_response(self, status_code: int, data: dict):
        """Send a JSON response."""
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def do_OPTIONS(self):
        """Handle CORS preflight requests."""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        """Handle GET requests (health check)."""
        path = urlparse(self.path).path

        if path == '/health':
            self.send_json_response(200, {"status": "ok", "service": "telegram-mark-read"})
        else:
            self.send_json_response(404, {"error": "Not found"})

    def do_POST(self):
        """Handle POST requests."""
        path = urlparse(self.path).path

        if path == '/mark-read':
            self.handle_mark_read()
        else:
            self.send_json_response(404, {"error": "Not found"})

    def handle_mark_read(self):
        """Handle mark-as-read requests."""
        try:
            # Parse request body
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length > 0:
                body = json.loads(self.rfile.read(content_length).decode('utf-8'))
                chat_id = body.get('chat_id', DEFAULT_CHAT_ID)
            else:
                chat_id = DEFAULT_CHAT_ID

            # Run the async mark_as_read function
            result = asyncio.run(mark_as_read(chat_id))

            if result['success']:
                self.send_json_response(200, result)
            else:
                self.send_json_response(500, result)

        except json.JSONDecodeError:
            self.send_json_response(400, {"error": "Invalid JSON"})
        except Exception as e:
            self.send_json_response(500, {"error": str(e)})


def main():
    """Start the HTTP server."""
    server = HTTPServer(('127.0.0.1', PORT), MarkReadHandler)
    print(f"[telegram-mark-read] Server starting on http://127.0.0.1:{PORT}")
    print(f"[telegram-mark-read] Endpoints:")
    print(f"  GET  /health     - Health check")
    print(f"  POST /mark-read  - Mark chat as read (body: {{\"chat_id\": \"123\"}})")
    print()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[telegram-mark-read] Shutting down...")
        server.shutdown()


if __name__ == "__main__":
    main()
