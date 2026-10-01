# Spry

Spry is a monorepo containing a FastAPI backend, a React frontend, and a Docker Compose file that runs both with a PostgreSQL database. This document describes the **structure** of the repository: folders, what lives in each, and the contracts between the parts. It contains no implementation code.

**Single command to run everything:** `docker compose up` from the repository root. No other setup step (no `.env` file, no manual migration, no manual install) is required.

---

## 1. Scope of the First Slice

| Area | Deliverable |
|---|---|
| Backend | `GET /api/meetings` and `POST /api/meetings` |
| Database | One table, `meetings`, created by an Alembic migration |
| Frontend | One page showing meeting cards and a form to create a meeting |
| Infrastructure | Three Docker services: `postgres`, `backend`, `frontend` |

Anything not listed above is out of scope for this slice (no update/delete endpoints, no auth, no pagination, no routing on the frontend).

---

## 2. Pinned Versions

| Component | Version |
|---|---|
| Backend base image | `python:3.12-slim` |
| Database image | `postgres:16` |
| Frontend base image | `node:20-alpine` |

Python and Node package versions are pinned by `backend/requirements.txt` and `frontend/package.json` (with a committed lockfile), respectively.

---

## 3. Repository Layout

```
spry/
├── PROJECT.md
├── docker-compose.yml
├── .gitignore
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── alembic/
│   │   ├── env.py
│   │   ├── script.py.mako
│   │   └── versions/
│   │       └── 0001_create_meetings_table.py
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models/
│   │   │   └── meeting.py
│   │   ├── schemas/
│   │   │   └── meeting.py
│   │   └── routers/
│   │       └── meetings.py
│   └── tests/
│       └── test_meetings.py
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── package-lock.json
    ├── index.html
    ├── vite.config.ts
    ├── tsconfig.json
    ├── components.json
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── index.css
        ├── types/
        │   └── meeting.ts
        ├── api/
        │   └── meetings.ts
        ├── lib/
        │   └── utils.ts
        └── components/
            ├── MeetingList.tsx
            ├── MeetingCard.tsx
            ├── MeetingForm.tsx
            └── ui/
```

---

## 4. Folder and File Purposes

### 4.1 Root

| Path | Exact purpose |
|---|---|
| `PROJECT.md` | This document. The single source of truth for repository structure and inter-service contracts. |
| `docker-compose.yml` | Defines and wires the three services (`postgres`, `backend`, `frontend`), their ports, healthchecks, dependencies, environment variables, and the named database volume. |
| `.gitignore` | Excludes virtual environments, `node_modules`, build output, caches, and local editor files from version control. |

### 4.2 `backend/`

The FastAPI application. It owns all business logic, persistence, and database schema evolution. It is the only component that talks to PostgreSQL.

| Path | Exact purpose |
|---|---|
| `backend/Dockerfile` | Builds the backend image from `python:3.12-slim`. Installs dependencies from `requirements.txt` and defines the container start command (see §6.2 for startup behavior). |
| `backend/requirements.txt` | Pinned Python dependencies: FastAPI, an ASGI server, SQLAlchemy, Alembic, a PostgreSQL driver, and Pydantic. |
| `backend/alembic.ini` | Alembic configuration. Points to the `alembic/` directory. Does not contain the database URL. |
| `backend/alembic/` | Alembic migration environment. The only place where database schema changes are defined. |
| `backend/alembic/env.py` | Connects Alembic to the SQLAlchemy metadata in `app/models/` and reads the database URL from the `DATABASE_URL` environment variable. |
| `backend/alembic/script.py.mako` | Template Alembic uses to generate new migration files. |
| `backend/alembic/versions/` | Ordered migration scripts. Each file is one immutable schema revision. |
| `backend/alembic/versions/0001_create_meetings_table.py` | Initial revision. Creates the `meetings` table (see §5.1). |
| `backend/app/` | The Python application package. Contains everything that runs at request time. |
| `backend/app/main.py` | Application entry point. Creates the FastAPI app and registers routers. |
| `backend/app/config.py` | Reads configuration from environment variables (database URL). The only module that reads the environment. |
| `backend/app/database.py` | Owns the SQLAlchemy engine, session factory, declarative base, and the per-request session dependency. |
| `backend/app/models/` | SQLAlchemy ORM models. One file per table. These define the database shape; they are never returned directly from the API. |
| `backend/app/models/meeting.py` | The `Meeting` ORM model mapped to the `meetings` table. |
| `backend/app/schemas/` | Pydantic models that define the HTTP request and response contracts. One file per resource. |
| `backend/app/schemas/meeting.py` | Request schema for creating a meeting and response schema for a meeting (see §5.2). |
| `backend/app/routers/` | HTTP route definitions, one module per resource. Routers translate HTTP to ORM calls and back; they hold no schema definitions. |
| `backend/app/routers/meetings.py` | The `GET /api/meetings` and `POST /api/meetings` handlers. |
| `backend/tests/` | Automated backend tests. Does not ship in behavior; used for verification only. |
| `backend/tests/test_meetings.py` | Tests covering the two endpoints against the contract in §5.2. |

### 4.3 `frontend/`

The React single-page application. It owns presentation and user interaction only. It never talks to PostgreSQL and never holds business rules beyond basic form input handling.

| Path | Exact purpose |
|---|---|
| `frontend/Dockerfile` | Builds the frontend image from `node:20-alpine`. Installs dependencies from the lockfile and defines the container start command (Vite dev server bound to all interfaces). |
| `frontend/package.json` | Declares dependencies (React, Vite, Tailwind CSS, shadcn/ui's supporting libraries) and scripts. |
| `frontend/package-lock.json` | Locks exact dependency versions for reproducible installs. |
| `frontend/index.html` | Vite HTML entry point containing the root mount element. |
| `frontend/vite.config.ts` | Vite configuration: React plugin, Tailwind integration, import alias, dev server host/port, and the `/api` proxy to the backend (see §5.3). |
| `frontend/tsconfig.json` | TypeScript configuration, including the import alias used by shadcn/ui. |
| `frontend/components.json` | shadcn/ui configuration: style, Tailwind settings, and the paths where generated components and utilities are placed. |
| `frontend/src/main.tsx` | Mounts the React app into the DOM. |
| `frontend/src/App.tsx` | The single page. Composes `MeetingForm` and `MeetingList` and owns the meeting state for the page. |
| `frontend/src/index.css` | Tailwind entry stylesheet and theme tokens used by shadcn/ui. |
| `frontend/src/types/meeting.ts` | TypeScript types mirroring the API contract in §5.2. The only place these shapes are declared on the frontend. |
| `frontend/src/api/meetings.ts` | The only module that performs HTTP calls. Exposes functions for listing and creating meetings against `/api/meetings`. |
| `frontend/src/lib/utils.ts` | Shared helper utilities required by shadcn/ui. |
| `frontend/src/components/MeetingList.tsx` | Renders the collection of meetings as a set of cards, plus empty, loading, and error states. |
| `frontend/src/components/MeetingCard.tsx` | Renders one meeting: title, start/end times, and attendee count. |
| `frontend/src/components/MeetingForm.tsx` | Form with fields for title, start, end, and attendee count. Submits a new meeting and reports success or error. |
| `frontend/src/components/ui/` | shadcn/ui generated primitives (for example card, button, input, label). Managed by the shadcn CLI; not hand-edited for feature logic. |

---

## 5. Contracts

### 5.1 Database contract (`meetings` table)

| Column | Type | Constraints |
|---|---|---|
| `id` | integer | Primary key, auto-increment |
| `title` | string | Not null |
| `starts_at` | timestamp with time zone | Not null |
| `ends_at` | timestamp with time zone | Not null |
| `attendee_count` | integer | Not null |

The table is created only by migration `0001_create_meetings_table`. The application never creates or alters tables itself.

### 5.2 HTTP API contract

Base path: `/api`. All request and response bodies are `application/json`.

#### `GET /api/meetings`

- **Request body:** none
- **Success:** `200 OK`, JSON array (empty array when there are no meetings), ordered by `starts_at` ascending, then `id` ascending.

```json
[
  {
    "id": 1,
    "title": "Sprint planning",
    "starts_at": "2026-10-01T09:00:00Z",
    "ends_at": "2026-10-01T10:00:00Z",
    "attendee_count": 8
  }
]
```

| Field | Type | Notes |
|---|---|---|
| `id` | int | Server-assigned |
| `title` | str | |
| `starts_at` | str | ISO 8601 |
| `ends_at` | str | ISO 8601 |
| `attendee_count` | int | |

#### `POST /api/meetings`

- **Request body:**

```json
{
  "title": "Sprint planning",
  "starts_at": "2026-10-01T09:00:00Z",
  "ends_at": "2026-10-01T10:00:00Z",
  "attendee_count": 8
}
```

- **Success:** `201 Created`, body is the created meeting including the server-assigned `id`, with the same shape as one element of the `GET` array.
- **Client sends no `id`.** The server assigns it.
- **Validation failure:** `422 Unprocessable Entity` with FastAPI's standard error body. A request is invalid when:
  - `title` is missing or empty,
  - `starts_at` or `ends_at` is missing or not a valid ISO 8601 datetime,
  - `ends_at` is not strictly after `starts_at`,
  - `attendee_count` is missing, not an integer, or negative.

#### Datetime convention

All datetimes are exchanged as ISO 8601 strings and stored and returned in UTC. The frontend is responsible for converting to and from the user's local time for display and input.

### 5.3 Frontend ↔ backend contract

- The browser only ever calls **relative** URLs beginning with `/api`. It never hard-codes a backend host or port.
- The Vite dev server proxies every request starting with `/api` to the backend service at `http://backend:8000` over the Compose network. This is how the frontend reaches the API without adding a reverse proxy service, and it is why no CORS configuration is required.
- The TypeScript types in `frontend/src/types/meeting.ts` must match §5.2 exactly. A change to the API contract requires updating `backend/app/schemas/meeting.py`, `frontend/src/types/meeting.ts`, and this document together.

### 5.4 Backend ↔ database contract

- The backend connects to PostgreSQL using a single `DATABASE_URL` environment variable supplied by Compose. The host in that URL is the Compose service name `postgres`.
- Only the backend holds database credentials. The frontend has no database configuration.

---

## 6. Docker Compose Services

`docker-compose.yml` defines exactly three services and one named volume. No other services (no Redis, Celery, Nginx, or Kubernetes) are part of this project.

### 6.1 `postgres`

| Property | Value |
|---|---|
| Image | `postgres:16` |
| Purpose | Persistent relational storage for the backend |
| Port mapping | `5432:5432` (host:container) |
| Depends on | Nothing |
| Volume | Named volume `pgdata` mounted at PostgreSQL's data directory, so data survives container restarts |
| Environment | Database name, user, and password set inline in the Compose file (development defaults) |

**Healthcheck logic:**
- Runs PostgreSQL's built-in readiness utility (`pg_isready`) inside the container against the configured database and user.
- Healthy when the utility reports the server is accepting connections.
- Interval 5s, timeout 3s, retries 10, start period 10s.

### 6.2 `backend`

| Property | Value |
|---|---|
| Build | `./backend` (Dockerfile based on `python:3.12-slim`) |
| Purpose | Serves the REST API |
| Port mapping | `8000:8000` (host:container) |
| Depends on | `postgres`, condition `service_healthy` |
| Environment | `DATABASE_URL` pointing at the `postgres` service |
| Source mount | `./backend` is bind-mounted for live reload during development |

**Startup behavior:** on container start the backend first applies all pending Alembic migrations to `head`, then starts the API server listening on `0.0.0.0:8000`. If migrations fail, the container exits and the dependent frontend never starts.

**Healthcheck logic:**
- Issues an HTTP `GET` to `http://localhost:8000/api/meetings` from inside the container and expects a `200` status. This reuses an existing endpoint, so no extra health route is added to the API.
- Because that endpoint queries the database, a healthy result proves the server is up, migrations have been applied, and the database connection works.
- The request is made with the Python standard library, because `python:3.12-slim` does not ship `curl`.
- Interval 5s, timeout 3s, retries 10, start period 15s.

### 6.3 `frontend`

| Property | Value |
|---|---|
| Build | `./frontend` (Dockerfile based on `node:20-alpine`) |
| Purpose | Serves the React application through the Vite dev server |
| Port mapping | `5173:5173` (host:container) |
| Depends on | `backend`, condition `service_healthy` |
| Environment | Proxy target for `/api` set to `http://backend:8000` |
| Source mount | `./frontend` is bind-mounted for hot module reload; `node_modules` is kept in a container-side anonymous volume so host files do not overwrite installed dependencies |

**Healthcheck logic:**
- Issues an HTTP `GET` to `http://localhost:5173/` from inside the container using `wget` (present in `node:20-alpine`) and expects a successful response.
- Healthy when the dev server is serving the application shell.
- Interval 5s, timeout 3s, retries 10, start period 10s.

### 6.4 Startup order

Startup order is enforced by `depends_on` with `condition: service_healthy`, not by timing.

```
postgres (healthy)  →  backend (migrates, then healthy)  →  frontend (healthy)
```

1. `postgres` starts first and becomes healthy once it accepts connections.
2. `backend` starts only after `postgres` is healthy, runs migrations, and becomes healthy once `GET /api/meetings` returns `200`.
3. `frontend` starts only after `backend` is healthy, so the first page load can always reach a working API.

### 6.5 Host access summary

| URL | Served by |
|---|---|
| `http://localhost:5173` | Frontend (the application) |
| `http://localhost:8000/api/meetings` | Backend API (direct access) |
| `http://localhost:8000/docs` | FastAPI's automatic interactive API docs |
| `localhost:5432` | PostgreSQL |

---

## 7. Frontend Page Structure

The application has one page and no client-side routing.

| Region | Component | Behavior |
|---|---|---|
| Form | `MeetingForm` | Collects title, start, end, and attendee count. On submit, calls the create function in `api/meetings.ts`. On success the new meeting appears in the list without a full page reload. On a `422`, shows the validation problem to the user. |
| Meeting cards | `MeetingList` containing `MeetingCard` | Loads meetings on page load via the list function in `api/meetings.ts` and renders one card per meeting. Shows an empty state when there are none and an error state when the request fails. |

`App.tsx` owns the meeting list state and passes it to `MeetingList`; `MeetingForm` notifies `App.tsx` when a meeting has been created.

---

## 8. Dependency Rules Between Parts

- `frontend` depends on the **HTTP contract** in §5.2, never on backend source files.
- `backend/app/routers` depends on `schemas` and `models`; `models` depend on `database`; nothing in `app/` depends on `tests/`.
- Schema changes flow in one direction: edit the ORM model, add a new Alembic revision, then update Pydantic schemas, frontend types, and this document.
- Existing Alembic revisions are never edited after being committed; changes are made with a new revision.
