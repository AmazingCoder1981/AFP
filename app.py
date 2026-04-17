from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import parse_qs, urlencode, urlparse
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
import json
import os
from pathlib import Path

HOST = "127.0.0.1"
PORT = 8000
FPF_BASE = "https://resultados.fpf.pt"
MOCK_MODE = os.getenv("AFP_MOCK_MODE", "0") == "1"

STATIC_DIR = Path(__file__).parent / "web"


class AppHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)

        if parsed.path == "/":
            return self._serve_file("index.html", "text/html; charset=utf-8")
        if parsed.path == "/styles.css":
            return self._serve_file("styles.css", "text/css; charset=utf-8")
        if parsed.path == "/app.js":
            return self._serve_file("app.js", "application/javascript; charset=utf-8")
        if parsed.path.startswith("/api/"):
            return self._handle_api(parsed)

        self.send_error(404, "Not Found")

    def _serve_file(self, filename: str, content_type: str):
        target = STATIC_DIR / filename
        if not target.exists():
            self.send_error(404, "Not Found")
            return

        data = target.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _handle_api(self, parsed):
        query = parse_qs(parsed.query)

        if parsed.path == "/api/health":
            return self._json_response(200, {"status": "ok", "mockMode": MOCK_MODE})

        if parsed.path == "/api/competitions":
            association_id = query.get("associationId", ["232"])[0]
            season_id = query.get("seasonId", ["105"])[0]
            endpoint = "/Competition/GetCompetitionsByAssociation"
            params = {"associationId": association_id, "seasonId": season_id}
            if MOCK_MODE:
                return self._json_response(
                    200,
                    [
                        {
                            "id": 1,
                            "name": "AF Porto - Divisão de Honra",
                            "associationId": association_id,
                            "seasonId": season_id,
                        },
                        {
                            "id": 2,
                            "name": "AF Porto - 1ª Divisão",
                            "associationId": association_id,
                            "seasonId": season_id,
                        },
                    ],
                )
            return self._proxy_fpf(endpoint, params)

        if parsed.path == "/api/games":
            endpoint = "/Competition/GetMatches"
            if MOCK_MODE:
                return self._json_response(
                    200,
                    [
                        {
                            "matchId": 101,
                            "homeTeam": "Clube A",
                            "awayTeam": "Clube B",
                            "score": "2-1",
                            "date": "2026-04-10",
                        }
                    ],
                )
            return self._proxy_fpf(endpoint, {k: v[0] for k, v in query.items()})

        if parsed.path == "/api/standings":
            endpoint = "/Competition/GetStanding"
            if MOCK_MODE:
                return self._json_response(
                    200,
                    [
                        {"position": 1, "team": "Clube A", "points": 58},
                        {"position": 2, "team": "Clube B", "points": 55},
                    ],
                )
            return self._proxy_fpf(endpoint, {k: v[0] for k, v in query.items()})

        if parsed.path == "/api/scorers":
            endpoint = "/Competition/GetScorers"
            if MOCK_MODE:
                return self._json_response(
                    200,
                    [
                        {"player": "Jogador X", "team": "Clube A", "goals": 18},
                        {"player": "Jogador Y", "team": "Clube B", "goals": 15},
                    ],
                )
            return self._proxy_fpf(endpoint, {k: v[0] for k, v in query.items()})

        if parsed.path == "/api/fpf":
            endpoint = query.get("path", [""])[0]
            if not endpoint.startswith("/"):
                endpoint = f"/{endpoint}"
            query_params = {k: v[0] for k, v in query.items() if k != "path"}
            return self._proxy_fpf(endpoint, query_params)

        return self._json_response(404, {"error": "Endpoint não suportado."})

    def _proxy_fpf(self, endpoint: str, params: dict):
        query_string = urlencode(params)
        url = f"{FPF_BASE}{endpoint}"
        if query_string:
            url = f"{url}?{query_string}"

        req = Request(
            url,
            headers={
                "Accept": "application/json, text/plain, */*",
                "User-Agent": "AFP-Stats-App/0.1",
            },
        )

        try:
            with urlopen(req, timeout=20) as response:
                body = response.read()
                content_type = response.headers.get("Content-Type", "application/json")
                self.send_response(response.status)
                self.send_header("Content-Type", content_type)
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(body)
        except HTTPError as err:
            message = err.read().decode("utf-8", errors="ignore")
            self._json_response(
                err.code,
                {
                    "error": "Erro do serviço FPF.",
                    "status": err.code,
                    "details": message[:500],
                },
            )
        except URLError as err:
            self._json_response(
                502,
                {
                    "error": "Falha de ligação ao serviço FPF.",
                    "details": str(err.reason),
                },
            )

    def _json_response(self, status: int, payload: dict):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)


def run():
    server = HTTPServer((HOST, PORT), AppHandler)
    print(f"Servidor disponível em http://{HOST}:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    run()
