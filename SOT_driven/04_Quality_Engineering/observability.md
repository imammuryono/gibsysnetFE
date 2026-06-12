# Observability

> **Status**: `Draft` | **Pemilik**: SRE / System Analyst | **Terakhir Update**: 2026-06-12

## 1. Logging (Target)

### Struktur Log (JSON)
    {
      "timestamp": "2026-06-12T10:00:00.000Z",
      "level": "INFO",
      "module": "class-construction",
      "action": "CREATE",
      "userId": 1,
      "requestId": "abc-123",
      "duration": 45,
      "data": { "class_code": "CLS001" }
    }

### Log Levels
| Level | Kapan | Contoh |
|---|---|---|
| ERROR | Exception / 500 | DB connection failed |
| WARN | Approaching limits | Connection pool 90% full |
| INFO | Normal operations | POST /api/class-construction |
| DEBUG | Developer troubleshooting | Query detail, payload dump |

### Library Target: **Winston** atau **Pino**
- Write ke file (`/var/log/gibsysnet/*.log`).
- Structured JSON.
- Redact sensitive data (password, token, NPWP).

## 2. Monitoring (Target)

### Health Check
Endpoint: `GET /health`
    {
      "status": "ok",
      "database": "connected",
      "uptime": 3600,
      "timestamp": "2026-06-12T10:00:00.000Z"
    }

### Metrics
- Request rate (req/s per endpoint).
- Response time (p50, p95, p99).
- Error rate (% 5xx, % 4xx).
- DB connection pool usage.

### Library Target: **Prometheus** + **Grafana** atau **OpenTelemetry**.

## 3. Error Tracking (Target)
- **Sentry** atau **Rollbar** untuk frontend + backend.
- Track: error message, stack trace, browser/OS, user session.

## 4. Alerting (Target)
| Metric | Threshold | Alert |
|---|---|---|
| Error Rate | > 1% dari 5 menit | Critical |
| Response Time | p95 > 2s | Warning |
| Health Check | 500 > 3x | Critical |
| DB Connection | Pool 95% | Warning |

## 5. Distributed Tracing (Future)
- Trace ID di setiap request.
- Correlate: API call -> DB query -> Response time.
- Library: **OpenTelemetry**.