# Architecture & Tech Stack

> **Status**: Approved | **Pemilik**: Tech Lead | **Terakhir Update**: 2026-06-12

## 1. Arsitektur Overview
`
┌────────────────────────────────────────────────────────────┐
│                     Browser (User)                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  COB HTML│  │ Class HTML│ │Quotation  │  │Dashboard  │   │
│  │ + cob.js │  │ + class.js│ │ + quot.js │  │ + dash.js │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           assets/css/*  (Tailwind + custom)           │   │
│  │           assets/js/api.js  (shared API client)       │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────────┬───────────────────────────────────┘
                         │  HTTP/REST
                         ▼
┌────────────────────────────────────────────────────────────┐
│                  Node.js + Express                         │
│  ┌────────────────────┐  ┌───────────────────────────┐     │
│  │   server.js         │  │   Class Construction API  │     │
│ │   (Port 3001)       │  │   GET/POST/PUT/DELETE     │     │
│  │                     │  │   + History + Soft Delete │     │
│  └────────────────────┘  └───────────────────────────┘     │
│  ┌───────────────────────────────────────────────────┐     │
│  │   Static File Server (*.html)                  │     │
│  └───────────────────────────────────────────────────┘     │
└────────────────────────┬───────────────────────────────────┘
                         │  mysql2/promise
                         ▼
┌────────────────────────────────────────────────────────────┐
│                    MySQL 8.x                               │
│  Database: gibsysnet                                       │
│  Tables: class_construction, class_construction_history     │
│  Tables: cob, sub_cob, currencies, ... (add as needed)     │
└────────────────────────────────────────────────────────────┘
`

## 2. Tech Stack
| Layer | Technology | Version | Catatan |
|---|---|---|---|
| Frontend | HTML5 | — | Halaman statis |
| CSS | Tailwind CSS (custom config) | — | Tailwind config inline di setiap HTML |
| CSS | Custom CSS (ssets/css/custom.css) | — | Scrollbar, badge, spinner, form validation |
| CSS | Font Awesome | 6.4.0 | CDN |
| JS | Vanilla JavaScript (ES6+) | — | Tanpa framework |
| JS | jQuery | — | *(belum terdeteksi, periksa cob.js) |
| Backend | Node.js | ≥ 18.x | Runtime |
| Backend | Express | ^4.18.3 | HTTP Server |
| Backend | mysql2 | ^3.9.2 | MySQL Driver (pool) |
| DB | MySQL | ≥ 8.0 | InnoDB, utf8mb4 |
| Auth | — | — | *(belum diimplementasi — **tech debt**)* |

## 3. Struktur File
`
gibsynet_FE/
├── server.js              # Express backend + API routes
├── package.json           # Dependencies
├──                   # HTML pages (frontend views)
│   ├── dashboard/         # Dashboard pages
│   ├── class.html         # Class Construction
│   ├── cob.html           # COB Management
│   ├── subcob.html        # Sub-COB
│   ├── quotation.html     # Quotation
│   ├── commission.html    # Commission
│   ├── payments.html      # Payments
│   ├── riskvehicle.html   # Vehicle Risk Model
│   ├── riskproperty.html  # Property Risk Model
│   ├── riskvessel.html    # Vessel Risk Model
│   ├── riskengineering.html # Engineering Risk Model
│   └── ...                # Other master pages
├── assets/
│   ├── css/               # All CSS (Tailwind + custom + per-module)
│   ├── js/                # All JS modules (per-module + shared)
│   └── images/            # Logo, favicon, assets
├── api/                   # *(kosong — direkomendasikan untuk memisahkan routes)*
└── SOT_driven/            # Source of Truth documentation
`

## 4. Data Flow (CRUD Example — COB)
1. User → cob.html → ssets/js/cob.js
2. cob.js → etch('http://localhost:3001/api/cob') (via ssets/js/api.js)
3. Express server.js → GET /api/cob → MySQL query → JSON response
4. cob.js → parse response → render HTML table
5. User input form → POST/PUT/DELETE /api/cob → backend → MySQL → response → update UI

## 5. Port Configuration
| Service | Port | Keterangan |
|---|---|---|
| Frontend (Apache/XAMPP) | 3000 | Static HTML served |
| Backend (Node.js/Express) | 3001 | API server — **permanent** |
| MySQL | 3306 | Database server |

> ⚠️ Backend port 3001 **tidak boleh diubah** tanpa perubahan di ssets/js/api.js (const aseUrl).
