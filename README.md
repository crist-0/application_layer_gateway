# SecureGate: Secure Reverse Proxy and Traffic Gateway

A standalone reverse proxy that sits between public traffic and a backend web application. It rate-limits clients, filters injection attacks, and cuts off traffic to a failing backend, so none of that logic has to live inside the backend itself.

Built with plain Node.js. The proxy core uses only the built-in `http` module, with no proxying library.

---

## Features

| Feature | What it does |
|---|---|
| **Reverse proxy** | Forwards method, path, headers, and request body to the backend and streams the response back |
| **Rate limiting** | Sliding-window limit per client IP, held in memory, returns `429` when exceeded |
| **Injection filtering** | Scans the decoded URL and the request body for SQL-injection and XSS signatures, returns `403` on a match |
| **Circuit breaker** | Closed / Open / Half-Open state machine; fast-fails with `503` while the backend is unhealthy |
| **Async logging** | Structured traffic and security events go to a bounded in-memory queue and are flushed to disk in the background |
| **Dynamic config reload** | Thresholds live in `config/config.yaml` and are hot-reloaded without a restart; invalid files are rejected |
| **Admin dashboard** | Separate Express app with login, live charts, and a filterable event table |
| **CI** | GitHub Actions runs the unit tests on every push and pull request |

---

## How a request flows

```
Client
  |
  v
index.js ── reads full request body once
  |
  v
Pipeline orchestrator
  1. Rate limiter      -> 429 if over the limit
  2. Circuit breaker   -> 503 if the backend circuit is open
  3. Injection filter  -> 403 if a signature matches
  |
  v (all checks passed)
Forwarder ── new request to backend ── response streamed to client
  |
  v
Async logger ── events.log ── Admin dashboard
```

The check order is deliberate. The two cheap in-memory checks run first, and the injection filter, which needs the whole body, runs last. The rate limiter runs before the circuit breaker so abusive traffic stays visible as its own event type even during a backend outage.

Every blocked request and every forwarded response produces a log event. Logging is done by the orchestrator and forwarder, not by the individual checks, so the checks stay pure functions that are easy to unit test.

---

## Project structure

```
.
├── index.js                    Entry point: HTTP server, body read, pipeline, forward
├── proxy/
│   ├── forwarder.js            Builds the outbound request and relays the response
│   └── bodyReader.js           Reads a request stream into a string
├── pipeline/
│   ├── orchestrator.js         Runs the checks in order and logs blocked requests
│   ├── rateLimiter.js          Sliding-window rate limiting
│   ├── circuitBreaker.js       Three-state circuit breaker
│   └── injectionFilter.js      Signature-based URL and body inspection
├── logger/
│   └── logger.js               Bounded queue and background flush to events.log
├── config/
│   ├── config.yaml             Hot-reloadable settings
│   └── configLoader.js         Validation, atomic reload, file watching
├── test/
│   └── rateLimiter.test.js     Unit tests (node:test)
├── dashboard/                  Separate Express app (see below)
└── .github/workflows/ci.yml    CI pipeline
```

---

## Getting started

### Prerequisites

- Node.js 22 or newer
- npm

### Install

```bash
npm install                      # gateway
cd dashboard && npm install      # dashboard
```

### Run

Use two terminals, started in this order.

```bash

# 1. Gateway (port 3000)
node index.js

# 2. Dashboard (port 3001)
cd dashboard
node index.js
```

Send traffic through the gateway, not directly to the backend:

```bash
eg : backend
curl -i http://localhost:3000/products
```

### Dashboard credentials

The dashboard reads its credentials from environment variables. Copy the example file and fill it in:

```bash
cd dashboard
cp .env.example .env
```

```
DASHBOARD_USER=your_username_here
DASHBOARD_PASS=your_password_here
SESSION_SECRET=your_random_secret_here
```

`.env` is gitignored. Only `.env.example` is committed.

Then open `http://localhost:3001/login`. The dashboard shows summary counts, three charts (requests over time, status codes, security events by source), and the raw event table. It refreshes every 5 seconds and can be filtered by IP, event type, and a `since` timestamp.

---

## Configuration

All tunable values live in `config/config.yaml`:

```yaml
rateLimiter:
  window: 10000          # sliding window length in ms
  limit: 3               # max requests per IP per window

circuitBreaker:
  failureThreshold: 5    # consecutive failures before the circuit opens
  cooldownMs: 10000      # time in Open before a trial request is allowed

logger:
  maxQueueSize: 300      # max events held in memory before the oldest is dropped
  flushIntervalMs: 15000 # how often the queue is written to disk
```

The gateway watches this file. Edit and save it while the gateway is running, and the new values apply to the next request. If the file has a syntax error or a wrong type, the reload is rejected and the previous values stay in effect. The failure is printed to the console.

`logger.flushIntervalMs` is the one exception: it is read once at startup, because it sets a running timer. Changing it requires a restart.

The values above are small on purpose so behaviour is easy to observe while testing. Raise `limit` and `window` for real use.

---

## Responses produced by the gateway

| Status | Source | Meaning |
|---|---|---|
| `429` | Rate limiter | The client IP exceeded the configured limit |
| `503` | Circuit breaker | The backend circuit is open; the request was not forwarded |
| `403` | Injection filter | A signature matched, or the URL could not be decoded |
| `500` | Gateway | The request body could not be read |
| anything else | Backend | Relayed unchanged |

A backend response of `500` or above counts as a backend failure for the circuit breaker, as does a connection error. `4xx` responses do not.

---

## Testing

### Unit tests

```bash
npm test
```

This runs `node --test` against the `test/` folder. The same command runs in GitHub Actions on every push and pull request to `main`.

### Scripted tests

Timing-sensitive behaviour was verified with scripts rather than hand-typed `curl` commands, because manual timing was too imprecise to tell a sliding window from a fixed one.

| Script | What it proves |
|---|---|
| `test-rate-limit.js` | Requests at fixed offsets show the window expiring one timestamp at a time |
| `test-circuit-breaker.js` | Five failures open the circuit, the next request is fast-failed without reaching the backend, a trial request goes through after the cooldown, and a failed trial reopens the circuit |
| `test-config-reload.js` | The rate limit changes from 3 to 1 mid-run with no restart |

The circuit breaker script needs a route on the backend that always returns `500`. Add one to the sample backend:

```js
else if (pathname == '/break') {
  res.writeHead(500, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ error: 'Simulated backend failure' }));
}
```

Run the scripts with the gateway and backend already up:

```bash
node test-circuit-breaker.js
```

### Quick manual checks

```bash
# Injection filter, URL-encoded SQLi payload: expect 403
curl -i "http://localhost:3000/products?id=1%27%20OR%20%271%27%3D%271"

# Injection filter, XSS in body: expect 403
curl -i -X POST -d "comment=<script>alert(1)</script>" http://localhost:3000/products
```

---

## Design decisions

- **Sliding-window log over a fixed-window counter.** A fixed window lets a client send twice the limit by straddling the boundary.
- **Consecutive-failure counting in the circuit breaker.** It is simpler than a time-windowed failure rate and resets on any success.
- **Fail closed on a malformed URL.** A request too broken for `decodeURIComponent` is treated as suspicious and rejected.
- **Request body read once.** Streams can only be consumed once, so `index.js` reads the body and passes it to both the injection filter and the forwarder.
- **Flat NDJSON log, not a database.** One JSON object per line. At this project's scale the dashboard can read and filter the file in memory.
- **Log and drop on write failure.** A failed flush drops that batch instead of retrying, which avoids a retry loop fighting the bounded queue.
- **Config values read fresh on every call.** Modules read `config.rateLimiter.limit` inside the function body, never destructured at load time, so reloads take effect immediately.

---

## Known limitations

- **One backend.** All traffic goes to a single configured backend address.
- **State is in memory.** Rate-limit counters and circuit state reset on restart and are not shared between multiple gateway instances.
- **Flat-file log.** The dashboard reads the whole file on each refresh, which will not scale to high traffic.
- **Signature-based filtering.** The injection filter is a regex list, not a full WAF, and heavily obfuscated payloads can evade it.
- **IP keys are not normalised.** `127.0.0.1` and `::ffff:127.0.0.1` count as different clients.
- **Dashboard auth is basic.** One shared account from environment variables, in-memory sessions.

---

## Future work

Multi-backend path routing and Docker Compose packaging were explored on the `docker-experiment` branch and are not part of `main`. Other candidates: an indexed store such as SQLite for the event log, shared rate-limit state across instances, and a stronger normalisation-aware injection filter.
