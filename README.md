# AFP Hub (MVP)

Sim — é possível criar a app que descreveste.

Este repositório inclui um **MVP inicial** para centralizar informações das competições da AF Porto num só lugar, com:

- Proxy backend para os endpoints do `resultados.fpf.pt`;
- Interface web simples para listar competições por associação/época;
- Endpoints preparados para jogos, classificações e marcadores.

## Endpoints disponíveis no MVP

- `GET /api/competitions?associationId=232&seasonId=105`
- `GET /api/games?competitionId=...`
- `GET /api/standings?competitionId=...`
- `GET /api/scorers?competitionId=...`
- `GET /api/fpf?path=/Competition/...` (proxy genérico)

> Nota: alguns nomes de endpoints e campos no site da FPF podem variar ao longo do tempo.

## Como correr

```bash
python app.py
```

Depois abrir:

- `http://127.0.0.1:8000`

## Como ver em funcionamento (passo a passo)

### 1) Subir a app

```bash
python app.py
```

Deves ver no terminal:

```text
Servidor disponível em http://127.0.0.1:8000
```

### 2) Abrir no browser

Abre:

- `http://127.0.0.1:8000`

Carrega no botão **“Carregar Competições”**.

### 3) Confirmar por API (sem browser)

Noutro terminal:

```bash
curl http://127.0.0.1:8000/api/health
curl "http://127.0.0.1:8000/api/competitions?associationId=232&seasonId=105"
```

### 4) Modo DEMO (se a FPF estiver bloqueada na tua rede/ambiente)

Se não conseguires aceder ao endpoint externo da FPF, podes forçar dados de demonstração:

```bash
AFP_MOCK_MODE=1 python app.py
```

Depois testa:

```bash
curl http://127.0.0.1:8000/api/health
curl "http://127.0.0.1:8000/api/competitions?associationId=232&seasonId=105"
curl "http://127.0.0.1:8000/api/games?competitionId=1"
curl "http://127.0.0.1:8000/api/standings?competitionId=1"
curl "http://127.0.0.1:8000/api/scorers?competitionId=1"
```

No `health`, o campo `mockMode` deve aparecer como `true`.

## Próximos passos recomendados

1. Confirmar todos os endpoints oficiais usados por competição (jogos/classificação/marcadores/estatística).
2. Guardar dados em cache (Redis ou base de dados) para melhorar performance.
3. Criar autenticação e perfis (clubes, adeptos, treinadores, árbitros).
4. Criar notificações automáticas (ex.: alterações de calendário/resultados).
5. Deploy (Render/Fly.io/VPS) com monitorização.
