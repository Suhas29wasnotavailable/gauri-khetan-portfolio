#!/usr/bin/env python3
"""Tiny static server for local preview.  python3 site/tools/serve.py [port]"""
import functools, http.server, os, socketserver, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

class H(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, '.webp': 'image/webp'}
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        super().end_headers()
    def log_message(self, *a):
        pass

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8848
socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(('', port), functools.partial(H, directory=ROOT)) as s:
    print(f'Serving {ROOT} at http://localhost:{port}')
    s.serve_forever()
