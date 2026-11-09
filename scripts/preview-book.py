"""Local review only. Open directly on the book; production root is never changed."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
import argparse

class BookPreview(SimpleHTTPRequestHandler):
    def do_GET(self):
        if urlsplit(self.path).path == '/':
            self.send_response(302)
            self.send_header('Location', '/sony/three-daily-wins/')
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            return
        super().do_GET()

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8099)
    args = parser.parse_args()
    public = Path(__file__).resolve().parent.parent/'public'
    server = ThreadingHTTPServer(('0.0.0.0', args.port), partial(BookPreview, directory=str(public)))
    print(f'Book review on port {args.port}; corporate root unchanged on the standard preview.', flush=True)
    server.serve_forever()
