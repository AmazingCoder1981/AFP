#!/usr/bin/env python3
import json
import os
import urllib.parse
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WEB_DIR = os.path.join(BASE_DIR, "web")
FPF_BASE_URL = "https://resultados.fpf.pt/api"
ASSOCIATION_ID = "232"
SEASON_ID = "105"
MOCK_MODE = os.getenv("AFP_MOCK_MODE", "0") == "1"

MOCK_COMPETITIONS = {
    "items": [
        {"CompetitionId": 1, "Name": "HYUNDAI LIGA PRO", "AssociationId": 232, "SeasonId": 105},
        {"CompetitionId": 2, "Name": "Divisão de Elite", "AssociationId": 232, "SeasonId": 105},
        {"CompetitionId": 3, "Name": "Campeonato Distrital Sub-19", "AssociationId": 232, "SeasonId": 105},
    ]
}

MOCK_GAMES = {
    "1": {
        "items": [
            {"GameId": 1001, "Round": 29, "HomeTeam": "U.D. Sousense", "AwayTeam": "Aliados F.C. Lordelo", "Date": "2026-04-19 16:00", "Venue": "Estádio 1.º Dezembro"},
            {"GameId": 1002, "Round": 29, "HomeTeam": "FC Vilarinho", "AwayTeam": "FC Maia Lidador", "Date": "2026-04-19 16:00", "Venue": "Parque de Jogos de Vilarinho"},
        ]
    },
    "2": {
        "items": [
            {"GameId": 2001, "Round": 24, "HomeTeam": "SC Rio Tinto", "AwayTeam": "FC Pedras Rubras", "Date": "2026-04-20 15:00", "Venue": "Campo SC Rio Tinto"}
        ]
    },
    "3": {"items": []},
}

MOCK_STANDINGS = {
    "1": {
        "items": [
            {"Position": 1, "Team": "FC Maia Lidador", "Points": 61, "Played": 28},
            {"Position": 2, "Team": "U.D. Sousense", "Points": 59, "Played": 28},
            {"Position": 6, "Team": "Aliados F.C. Lordelo", "Points": 45, "Played": 28},
        ]
    },
    "2": {"items": []},
    "3": {"items": []},
}

MOCK_SCORERS = {
    "1": {
        "items": [
            {"Player": "João Silva", "Team": "FC Maia Lidador", "Goals": 18},
            {"Player": "Miguel Costa", "Team": "U.D. Sousense", "Goals": 16},
            {"Player": "André Lopes", "Team": "Aliados F.C. Lordelo", "Goals": 13},
        ]
    },
    "2": {"items": []},
    "3": {"items": []},
}


def _send_json(handler, payload, status=200):
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(data)))
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.end_headers()
    handler.wfile.write(data)


def _fetch_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": "AFP-Hub-MVP/1.0"})
    with urllib.request.urlopen(req, timeout=20) as response:
        return json.loads(response.read().decode("utf-8"))


def _proxy_fpf(path, query):
    path = path.lstrip("/")
    query_string = urllib.parse.urlencode(query, doseq=True)
    url = f"{FPF_BASE_URL}/{path}"
    if query_string:
        url = f"{url}?{query_string}"
    return _fetch_json(url)


class AFPHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=WEB_DIR, **kwargs)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        try:
            if path == "/api/health":
                return _send_json(self, {"ok": True, "mockMode": MOCK_MODE})

            if path == "/api/competitions":
                if MOCK_MODE:
                    return _send_json(self, MOCK_COMPETITIONS)
                association_id = query.get("associationId", [ASSOCIATION_ID])[0]
                season_id = query.get("seasonId", [SEASON_ID])[0]
                data = _proxy_fpf("Competition", {"associationId": association_id, "seasonId": season_id})
                return _send_json(self, data)

            if path == "/api/games":
                competition_id = query.get("competitionId", [""])[0]
                if not competition_id:
                    return _send_json(self, {"error": "competitionId é obrigatório"}, status=400)
                if MOCK_MODE:
                    return _send_json(self, MOCK_GAMES.get(competition_id, {"items": []}))
                data = _proxy_fpf("Game", {"competitionId": competition_id})
                return _send_json(self, data)

            if path == "/api/standings":
                competition_id = query.get("competitionId", [""])[0]
                if not competition_id:
                    return _send_json(self, {"error": "competitionId é obrigatório"}, status=400)
                if MOCK_MODE:
                    return _send_json(self, MOCK_STANDINGS.get(competition_id, {"items": []}))
                data = _proxy_fpf("Standing", {"competitionId": competition_id})
                return _send_json(self, data)

            if path == "/api/scorers":
                competition_id = query.get("competitionId", [""])[0]
                if not competition_id:
                    return _send_json(self, {"error": "competitionId é obrigatório"}, status=400)
                if MOCK_MODE:
                    return _send_json(self, MOCK_SCORERS.get(competition_id, {"items": []}))
                data = _proxy_fpf("Scorer", {"competitionId": competition_id})
                return _send_json(self, data)

            if path == "/api/fpf":
                proxy_path = query.get("path", [""])[0]
                if not proxy_path:
                    return _send_json(self, {"error": "path é obrigatório"}, status=400)
                if MOCK_MODE:
                    return _send_json(self, {"error": "Proxy indisponível em mock mode"}, status=400)
                passthrough = {k: v for k, v in query.items() if k != "path"}
                data = _proxy_fpf(proxy_path, passthrough)
                return _send_json(self, data)

            return super().do_GET()
        except Exception as exc:
            return _send_json(self, {"error": str(exc), "path": path}, status=500)


if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    server = ThreadingHTTPServer(("127.0.0.1", port), AFPHandler)
    print(f"Servidor disponível em http://127.0.0.1:{port}")
    server.serve_forever()
