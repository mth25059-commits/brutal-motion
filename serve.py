#!/usr/bin/env python3
"""Static file server WITH HTTP Range support.

Python's stdlib http.server does not serve 206 partial responses, which means
browsers cannot seek inside <video> elements — fatal for a scroll-scrubbed
hero. This adds Range handling so video seeking works.

Usage: python serve.py [port] [directory]
"""
import functools
import os
import re
import sys
import http.server


class RangeHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # never cache during dev
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def send_head(self):
        path = self.translate_path(self.path)
        if os.path.isdir(path):
            return super().send_head()
        try:
            f = open(path, "rb")
        except OSError:
            self.send_error(404, "File not found")
            return None

        ctype = self.guess_type(path)
        fs = os.fstat(f.fileno())
        size = fs.st_size
        rng = self.headers.get("Range")

        if not rng:
            self.send_response(200)
            self.send_header("Content-Type", ctype)
            self.send_header("Accept-Ranges", "bytes")
            self.send_header("Content-Length", str(size))
            self.end_headers()
            return f  # base do_GET streams it

        m = re.match(r"bytes=(\d*)-(\d*)", rng)
        if not m:
            f.close()
            self.send_error(400, "Invalid Range")
            return None
        s, e = m.group(1), m.group(2)
        start = int(s) if s else 0
        end = int(e) if e else size - 1
        end = min(end, size - 1)
        if start > end:
            f.close()
            self.send_response(416)
            self.send_header("Content-Range", "bytes */%d" % size)
            self.end_headers()
            return None

        length = end - start + 1
        self.send_response(206)
        self.send_header("Content-Type", ctype)
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Range", "bytes %d-%d/%d" % (start, end, size))
        self.send_header("Content-Length", str(length))
        self.end_headers()
        f.seek(start)
        remaining = length
        buf = 64 * 1024
        while remaining > 0:
            chunk = f.read(min(buf, remaining))
            if not chunk:
                break
            try:
                self.wfile.write(chunk)
            except (BrokenPipeError, ConnectionResetError):
                break
            remaining -= len(chunk)
        f.close()
        return None


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5178
    directory = sys.argv[2] if len(sys.argv) > 2 else "forge"
    directory = os.path.abspath(directory)
    handler = functools.partial(RangeHandler, directory=directory)
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", port), handler)
    print("FORGE serving %s at http://127.0.0.1:%d (Range enabled)" % (directory, port))
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        httpd.shutdown()


if __name__ == "__main__":
    main()
