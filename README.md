# WhatsApp Service - Multi-Device Architecture

Backend service untuk WhatsApp Business dengan dukungan multi-device menggunakan [Baileys](https://github.com/WhiskeySockets/Baileys).

## 📋 Daftar Isi

- [Overview](#overview)
- [Update Terbaru](#-update-terbaru)
- [Arsitektur Sistem](#arsitektur-sistem)
- [Flow Diagram](#flow-diagram)
- [Fitur](#fitur)
- [Teknologi](#teknologi)
- [Struktur Proyek](#struktur-proyek)
- [Komponen Sistem](#komponen-sistem)
- [Database Schema](#database-schema)
- [Instalasi](#instalasi)
- [Konfigurasi](#konfigurasi)
- [Database Migration](#database-migration)
- [Menjalankan Server](#menjalankan-server)

- [Database Migration](#database-migration)
- [Menjalankan Server](#menjalankan-server)
- [API Documentation](#api-documentation)
- [Role-Based Access Control](#role-based-access-control)
  - [Role & Permission Matrix](#role--permission-matrix)
  - [User Flow Based on Role](#user-flow-based-on-role)
  - [Feature Access by Role](#feature-access-by-role)
  - [Authentication & Authorization Flow](#authentication--authorization-flow)
- [Development](#development)
- [Deployment](#deployment)
- [Dokumentasi Tambahan](#dokumentasi-tambahan)

---

## ✨ Update Terbaru

### Versi 1.3.0 (Januari 2026 - Current)

#### Fitur Baru & Improvement

1.  **Bot & Auto Reply System 🤖**

    -   **Bot Configuration**: Konfigurasi bot per device (timezone, business hours, welcome message).
    -   **Auto Reply Rules**: Sistem rule fleksibel (Trigger keywords, Regex support, Priority).
    -   **Business Hours**: Jadwal operasional interaktif dengan pesan di luar jam kerja.
    -   **Handoff System**: Mekanisme handoff dari bot ke manusia (agent) dengan keyword tertentu.

2.  **Data Export Center 📊**

    -   **Export Capabilities**: Export data Users, Devices, Messages, dan Audit Logs.
    -   **Format Support**: Dukungan format JSON dan CSV.
    -   **Flexible Filters**: Filter data berdasarkan tanggal, status, dan kategori.

3.  **UI/UX Refinements**

    -   **Business Hours Editor**: Editor visual untuk jadwal operasional bot.
    -   **Admin Message Layout**: Perbaikan layout pesan untuk readability yang lebih baik.
    -   **Audit Log Filters**: Perbaikan sistem filtering pada audit logs.

#### Bug Fixes & Optimizations

-   Fixed linter errors in ScheduledMessageHistory.
-   Resolved "Failed to load filters" in AuditLogViewer.
-   Optimized internal API endpoints (migrated from external sources).
-   Improved Contact Group functionality verification.

---

### Versi 1.2.0 (Januari 2026)

#### Fitur Baru & Improvement

1. **User Control & Security**

   - **Lock/Unlock Account**: Admin dapat mengunci/membuka akses user.
   - **Reset Password**: Admin dapat mereset password user.
   - **Audit Logging**: Sistem mencatat setiap aksi krusial admin (Create/Update/Delete) untuk keamanan dan tracebility.

4.  **Database Auto Schema Update**

    - Kemampuan untuk melakukan update struktur tabel database secara otomatis tanpa migrasi manual, dikontrol via `.env` (`AUTO_UPDATE_SCHEMA`).

2. **Advanced Job Control**

   - **Pause/Resume Jobs**: Menghentikan sementara dan melanjutkan proses bulk messaging.
   - **Retry Failed Jobs**: Kemampuan untuk mengulang job yang gagal atau partial.

3. **Admin Dashboard Enhancements**

   - **Action Logs Viewer**: UI baru untuk melihat admin logs.
   - **Enhanced User Management**: UI untuk pengelolaan user yang lebih lengkap.

#### Bug Fixes & Optimizations

- Improved job queue reliability.
- Fixes in device connection flow.

---

### Versi 1.1.0 (Januari 2026)

#### Fitur Baru & Improvement

1. **Enhanced Role-Based Access Control**

   - Improved permission management dengan granular control
   - Ownership validation di semua endpoint yang relevan
   - Admin bypass untuk special operations

2. **Multi-Device Support Maturity**

   - Stable multi-device architecture
   - Auto-restore sessions dengan reliability tinggi
   - Device lifecycle management yang komprehensif

3. **Job Queue Improvements**

   - Better error handling dalam bulk messaging
   - Job cancellation dengan graceful shutdown
   - Real-time progress tracking via SSE

4. **Statistics & Analytics Enhancement**

   - Daily activity tracking per device
   - Response rate calculation
   - Message statistics (incoming/outgoing)

5. **Admin Dashboard Features**

   - Global statistics view
   - User management (CRUD)
   - Device monitoring across all users
   - Message management & filtering
   - Job monitoring & control

6. **User Dashboard Features**
   - Personal device management
   - Device-specific operations
   - Contact & chat history access
   - Job status monitoring (owned devices)

#### Bug Fixes & Optimizations

- Improved session persistence mechanism
- Better error logging untuk debugging
- Performance optimization untuk large datasets
- Security improvements dalam token handling

#### Breaking Changes

- None (full backward compatibility maintained)

---

## 🎯 Overview

WhatsApp Service adalah backend API untuk mengelola koneksi WhatsApp dengan dukungan multi-device. Setiap user dapat memiliki multiple devices/akun WhatsApp yang terhubung secara bersamaan. Sistem ini menggunakan arsitektur RESTful API dengan real-time updates melalui Server-Sent Events (SSE).

### Fitur Utama

- **Multi-Device Support**: Satu user dapat memiliki banyak device/akun WhatsApp
- **Role-Based Access Control**: Sistem autentikasi dan otorisasi berbasis role (Admin & User)
- **RESTful API**: API endpoints untuk semua operasi WhatsApp
- **Real-time Updates**: Server-Sent Events (SSE) untuk real-time status updates
- **Job Queue**: Async processing untuk bulk messaging dengan status tracking
- **Statistics & Analytics**: Tracking dan analitik untuk aktivitas WhatsApp
- **Session Management**: Auto-restore session dengan penyimpanan berbasis file system

---

## 🏗 Arsitektur Sistem

### Arsitektur Layered

```
┌─────────────────────────────────────────────────────────┐
│                    Client (Frontend)                    │
│          React App, API Calls, SSE Connection           │
└───────────────────┬─────────────────────────────────────┘
                    │ HTTP/SSE
┌───────────────────▼─────────────────────────────────────┐
│                 Express.js Server                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Middleware   │→ │   Routes     │→ │ Controllers  │ │
│  │ - Auth       │  │ - Auth       │  │ - Auth       │ │
│  │ - Authorize  │  │ - WhatsApp   │  │ - WhatsApp   │ │
│  │ - Validation │  │ - Admin      │  │ - Admin      │ │
│  │ - Upload     │  │ - SSE        │  │             │ │
│  └──────────────┘  └──────────────┘  └──────┬───────┘ │
└───────────────────────────────────────────────┼─────────┘
                                                │
┌───────────────────────────────────────────────▼─────────┐
│                  Services Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ DeviceMgr    │  │ WhatsAppSvc  │  │ JobQueueSvc  │ │
│  │ - Create     │  │ - Connect    │  │ - Process    │ │
│  │ - List       │  │ - Send Msg   │  │ - Track      │ │
│  │ - Validate   │  │ - Events     │  │ - Cancel     │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│  ┌──────────────┐                                      │
│  │ Statistics   │                                      │
│  │ - Track      │                                      │
│  │ - Calculate  │                                      │
│  └──────────────┘                                      │
└───────────────────┬─────────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────────┐
│                  Models Layer (ORM)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │   User   │  │  Session │  │ Message  │  │ Contact│ │
│  │          │  │  Device  │  │          │  │  Group │ │
│  │          │  │          │  │          │  │ Stats  │ │
│  └──────────┘  └──────────┘  └──────────┘  └────────┘ │
└───────────────────┬─────────────────────────────────────┘
                    │ Sequelize ORM
┌───────────────────▼─────────────────────────────────────┐
│                  MySQL Database                         │
│  Tables: users, whatsapp_sessions, messages, etc.       │
└─────────────────────────────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────────┐
│              External Services                          │
│  ┌──────────────┐  ┌──────────────┐                    │
│  │   Baileys    │  │  File System │                    │
│  │ WhatsApp API │  │  Sessions    │                    │
│  └──────────────┘  └──────────────┘                    │
└─────────────────────────────────────────────────────────┘
```

### Komponen Utama

1. **Express.js Server**: Web server yang menangani HTTP requests
2. **Middleware Layer**: Authentication, authorization, validation, dan security
3. **Routes Layer**: Endpoint routing untuk berbagai operasi
4. **Controllers Layer**: Request handling dan response formatting
5. **Services Layer**: Business logic dan integrasi dengan Baileys
6. **Models Layer**: Database ORM dengan Sequelize
7. **Database**: MySQL untuk data persistence
8. **Baileys**: Library untuk koneksi WhatsApp Web API
9. **Next.js Frontend**: React/Next.js client dengan Redux state management

### Frontend Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js App Router                   │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│   │    Pages     │  │  Components  │  │    Hooks     │  │
│   │ (app/admin)  │  │ (BotConfig)  │  │ (useAuth)    │  │
│   │ (app/dash)   │  │ (JobManger)  │  │ (useSocket)  │  │
│   └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│          │                 │                 │          │
│   ┌──────▼─────────────────▼─────────────────▼───────┐  │
│   │                 Redux Store                      │  │
│   │  ┌──────────┐   ┌──────────┐   ┌──────────┐      │  │
│   │  │ Auth     │   │ Device   │   │ Bot      │      │  │
│   │  │ Slice    │   │ Slice    │   │ Slice    │      │  │
│   │  └──────────┘   └──────────┘   └──────────┘      │  │
│   └────────────────────────┬─────────────────────────┘  │
│                            │                            │
│   ┌────────────────────────▼─────────────────────────┐  │
│   │                   API Services                   │  │
│   │          (Axios Interceptor + Services)          │  │
│   └────────────────────────┬─────────────────────────┘  │
│                            │                            │
│   ┌────────────────────────▼─────────────────────────┐  │
│   │               SSE Event Listener                 │  │
│   │        (Real-time State Updates via Redux)       │  │
│   └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 Flow Diagram

### 1. Authentication Flow

```
Client                     Express Server           Database
  │                              │                     │
  │── POST /api/auth/register ──→│                     │
  │                              │                     │
  │                              │── Validate ────────→│
  │                              │←─ Check User ───────│
  │                              │                     │
  │                              │── Hash Password ────│
  │                              │── Create User ─────→│
  │                              │←─ User Created ─────│
  │                              │                     │
  │←── 201 User Created ─────────│                     │
  │                              │                     │
  │── POST /api/auth/login ─────→│                     │
  │                              │                     │
  │                              │── Validate ────────→│
  │                              │←─ Find User ────────│
  │                              │                     │
  │                              │── Compare Password ─│
  │                              │── Generate JWT ─────│
  │                              │                     │
  │←── 200 { token, user } ──────│                     │
  │                              │                     │
  │── GET /api/auth/profile ────→│                     │
  │   Authorization: Bearer token │                     │
  │                              │── Verify JWT ───────│
  │                              │── Get User ────────→│
  │                              │←─ User Data ────────│
  │                              │                     │
  │←── 200 { user } ─────────────│                     │
```

### 2. Device Lifecycle Flow (Admin Create, User/Admin Connect)

```
Admin Client / Backoffice      Express Server      DeviceManager      Database          WhatsAppService
  │                               │                    │               │                    │
  │── POST /devices (admin) ─────→│                    │               │                    │
  │   { deviceName, userId? }     │                    │               │                    │
  │                               │── Auth + Admin ───→│               │                    │
  │                               │                    │── Create ────→│                    │
  │                               │                    │   Device      │                    │
  │                               │                    │←─ Device ─────│                    │
  │←── 201 { deviceId } ──────────│                    │               │                    │
  │
  │  (User/Admin yang memiliki device)
  │── POST /devices/:deviceId/connect ───────────────→│               │                    │
  │   Authorization: Bearer token                      │               │                    │
  │                               │── Auth + Ownership Check ─────────→│                    │
  │                               │                                      │── Create Session ─→│
  │                               │                                      │── Generate QR      │
  │←── 200 { status, qrCode? } ───│                                      │                    │
  │
  │── GET /devices/:deviceId/qr (optional) ──────────→│                                      │
  │←── 200 { qrCode } ───────────│                                      │                    │
  │
  │ (SSE Event)                  │                                      │                    │
  │←── type: qr-code / whatsapp-status / device-status ────────────────│                    │
```

### 3. Messaging Flow

```
Client                     Express Server      WhatsAppService    Baileys        WhatsApp Web
  │                              │                    │               │                │
  │── POST /send-message ───────→│                    │               │                │
  │   { phone, message }         │                    │               │                │
  │                              │                    │               │                │
  │                              │── Auth Check ──────│               │                │
  │                              │── Validate ────────│               │                │
  │                              │── Ownership ───────│               │                │
  │                              │   Check            │               │                │
  │                              │                    │               │                │
  │                              │                    │── Get ────────│                │
  │                              │                    │   Socket      │                │
  │                              │                    │               │                │
  │                              │                    │── Format ─────│                │
  │                              │                    │   Message     │                │
  │                              │                    │               │                │
  │                              │                    │── Send ───────→│                │
  │                              │                    │   Message     │                │
  │                              │                    │               │                │
  │                              │                    │               │── Send ────────→│
  │                              │                    │               │   via WA Web    │
  │                              │                    │               │                │
  │                              │                    │               │←─ ACK ──────────│
  │                              │                    │               │                │
  │                              │                    │── Save ────────│                │
  │                              │                    │   to DB        │                │
  │                              │                    │               │                │
  │                              │                    │── Update ──────│                │
  │                              │                    │   Stats        │                │
  │                              │                    │               │                │
  │←── 200 { messageId, status } │                    │               │                │
  │                              │                    │               │                │
  │                              │                    │               │←─ Delivery ─────│
  │                              │                    │               │   Update        │
  │                              │                    │               │                │
  │                              │                    │── Update ──────│                │
  │                              │                    │   Status       │                │
  │                              │                    │               │                │
  │ (SSE Event)                  │                    │               │                │
  │←── message.delivered ────────│                    │               │                │
  │     { messageId, status }    │                    │               │                │
```

### 4. Chat Blast / Bulk Messaging Flow (Job Queue)

```
Admin Client           Express Server      JobQueueService   WhatsAppService    Database
    │                       │                    │                  │               │
    │── POST /jobs/ ───────→│                    │                  │               │
    │   send-text           │                    │                  │               │
    │   { messages[] }      │                    │                  │               │
    │                       │                    │                  │               │
    │                       │── Auth Check ──────│                  │               │
    │                       │── Admin Check ─────│                  │               │
    │                       │                    │                  │               │
    │                       │                    │── Create ────────│               │
    │                       │                    │   Job            │               │
    │                       │                    │── Save ─────────→│               │
    │                       │                    │   to DB          │               │
    │                       │                    │                  │               │
    │←── 201 { jobId } ─────│                    │                  │               │
    │                       │                    │                  │               │
    │                       │                    │── Process ───────│               │
    │                       │                    │   (Async)        │               │
    │                       │                    │                  │               │
    │                       │                    │                  │── For Each ────│
    │                       │                    │                  │   Message      │
    │                       │                    │                  │               │
    │                       │                    │                  │── Send ────────│
    │                       │                    │                  │   Message      │
    │                       │                    │                  │               │
    │                       │                    │── Update ────────│               │
    │                       │                    │   Progress ─────→│               │
    │                       │                    │                  │               │
    │                       │                    │── Delay ─────────│               │
    │                       │                    │   (3s default)   │               │
    │                       │                    │                  │               │
    │── GET /jobs/:id ─────→│                    │                  │               │
    │                       │                    │── Get ───────────│               │
    │                       │                    │   Status ───────→│               │
    │                       │                    │←─ Status ────────│               │
    │                       │                    │                  │               │
    │←── 200 { status, ─────│                    │                  │               │
    │        progress }     │                    │                  │               │
    │                       │                    │                  │               │
    │                       │                    │── Complete ──────│               │
    │                       │                    │   Job            │               │
    │                       │                    │── Update ────────│               │
    │                       │                    │   Final ────────→│               │
    │                       │                    │   Status         │               │
    │                       │                    │                  │               │
    │ (SSE Event)           │                    │                  │               │
    │←── job.completed ─────│                    │                  │               │
```

### 5. Real-time Updates Flow (SSE)

```
Client                     Express Server      WhatsAppService    Event System
  │                              │                    │                  │
  │── GET /api/events?token ────→│                    │                  │
  │                              │                    │                  │
  │                              │── Verify ──────────│                  │
  │                              │   JWT Token        │                  │
  │                              │                    │                  │
  │                              │── Setup ───────────│                  │
  │                              │   SSE Stream       │                  │
  │                              │                    │                  │
  │                              │── Add ─────────────→│                  │
  │                              │   Connection       │                  │
  │                              │                    │                  │
  │←── SSE: connected ───────────│                    │                  │
  │                              │                    │                  │
  │                              │                    │── Device ────────│
  │                              │                    │   Status         │
  │                              │                    │   Changed        │
  │                              │                    │                  │
  │                              │                    │── Emit ──────────→│
  │                              │                    │   Event          │
  │                              │                    │                  │
  │                              │── Broadcast ───────│                  │
  │                              │   to Client        │                  │
  │                              │                    │                  │
  │←── SSE: whatsapp-status ─────│                    │                  │
  │     { status: connected }    │                    │                  │
  │                              │                    │                  │
  │                              │                    │── QR ────────────│
  │                              │                    │   Generated      │
  │                              │                    │                  │
  │                              │── Broadcast ───────│                  │
  │                              │   QR Event         │                  │
  │                              │                    │                  │
  │←── SSE: qr-code ─────────────│                    │                  │
  │     { qr: "..." }            │                    │                  │
  │                              │                    │                  │
  │                              │                    │── Message ───────│
  │                              │                    │   Status         │
  │                              │                    │   Updated        │
  │                              │                    │                  │
  │←── SSE: message.status ──────│                    │                  │
  │     { messageId, status }    │                    │                  │
  │                              │── Remove ──────────→│                  │
  │                              │   Connection       │                  │
  │                              │                    │                  │
  │── Close Connection ─────────→│                    │                  │
  │                              │── Remove ──────────→│                  │
  │                              │   Connection       │                  │
  │                              │                    │                  │
```

### 6. Bot Auto-Reply (Pesan Otomatis) & Handoff (Bot Dukungan) Flow

```
Incoming Msg           WhatsAppService    BotController   AutoReplySvc    HandoffSvc     Database
     │                       │                 │               │               │             │
     │── Msg Received ──────→│                 │               │               │             │
     │                       │── Check ───────→│               │               │             │
     │                       │   Handoff       │               │── Is Active? →│             │
     │                       │                 │               │←─ Status ─────│             │
     │                       │←─ Skip (If ──── │               │               │             │
     │                       │    Active)      │               │               │             │
     │                       │                 │               │               │             │
     │                       │── Process ─────→│               │               │             │
     │                       │   Auto Reply    │               │               │             │
     │                       │                 │── Get Config →│               │── Find ────→│
     │                       │                 │               │               │   Config    │
     │                       │                 │←─ Config ─────│               │←─ Match ────│
     │                       │                 │               │               │             │
     │                       │                 │── Validate ──→│               │             │
     │                       │                 │   Business    │               │             │
     │                       │                 │   Hours       │               │             │
     │                       │                 │               │               │             │
     │                       │                 │── Find ──────→│               │── Find ────→│
     │                       │                 │   Rule        │               │   Rules     │
     │                       │                 │               │←─ Match ──────│             │
     │                       │                 │               │   Rule        │             │
     │                       │                 │               │               │             │
     │                       │←─ Action ───────│               │               │             │
     │                       │   (Reply/       │               │               │             │
     │                       │    Handoff)     │               │               │             │
     │── Send Reply ────────→│                 │               │               │             │
     │                       │                 │               │               │             │
     │ (If Handoff Keyword)  │                 │               │               │             │
     │                       │── Start ───────→│               │── Create ────→│── Save ────→│
     │                       │   Handoff       │               │   Session     │   Handoff   │
```

### 7. Frontend State & Data Flow

```
User Action              Component           Redux Thunk          API Service       Redux Slice
    │                        │                    │                    │                 │
    │── Clicks "Connect" ───→│                    │                    │                 │
    │                        │── Dispatch ───────→│                    │                 │
    │                        │   connectDevice()  │                    │                 │
    │                        │                    │── Call API ───────→│                 │
    │                        │                    │   POST /connect    │                 │
    │                        │                    │                    │                 │
    │                        │                    │←─ Response ────────│                 │
    │                        │                    │   (Pending/QR)     │                 │
    │                        │                    │                    │                 │
    │                        │                    │── Dispatch ───────┐                  │
    │                        │                    │   fulfilled       │                  │
    │                        │                    └───────────────────┼─────────────────→│
    │                        │                                        │                  │── Update State
    │←── UI Updates ─────────│                                        │                  │   loading: false
    │    (Show Loading/QR)   │←───────────────────────────────────────│                  │   device: {...}
    │                        │                                        │                  │
    │                        │                                        │                  │
    │ (Real-time Update)     │                                        │                  │
    │                        │                                        │                  │
    │ SSE Event listener ────┼──────────────────────────────────────────────────────────→│
    │ (background)           │                                        │                  │── Update State
    │ "qr-code"              │                                        │                  │   qr: "base64..."
    │                        │←──────────────────────────────────────────────────────────│
    │←── UI Updates ─────────│                                                           │
    │    (Show QR Image)     │                                                           │
```

---

## ✨ Fitur

### User Features (Sidebar Menu)

Fitur yang dapat diakses oleh semua pengguna terdaftar:

1. **Dashboard** (`/dashboard`)
   - Overview status device dan koneksi
   - Statistik pesan harian (Sent/Received)
   - Ringkasan aktivitas terbaru

2. **My Devices** (`/devices`)
   - **Connect Device**: Scan QR code untuk menghubungkan WhatsApp
   - **Device Status**: Monitor status koneksi (Connected, Disconnected)
   - **Bot Configuration**: Atur auto-reply, jam kerja, dan handoff per device
   - **Device Settings**: Kelola session dan logout

3. **Send Message** (`/send-message`)
   - Kirim pesan teks single secara instan
   - Validasi format nomor telepon

4. **Schedule Message** (`/schedule-message`)
   - Jadwalkan pesan untuk dikirim otomatis di waktu tertentu
   - Daftar pesan terjadwal status (Pending, Sent, Failed)
   - Opsi pembatalan pesan

5. **Chat Blast** (`/chat-blast`)
   - **Bulk Messaging**: Kirim pesan massal (Broadcast)
   - **Media Support**: Kirim gambar dan file dalam blast
   - **Targeting**: Input nomor manual atau dari kontak tersimpan

6. **My Jobs** (`/jobs`)
   - **Job Monitoring**: Pantau progress pengiriman blast users
   - **Control**: Pause, Resume, atau Cancel job sendiri
   - **Error Insight**: Lihat detail error untuk pesan yang gagal

7. **Contacts** (`/contacts`)
   - Manajemen buku kontak pribadi
   - Tagging dan grouping kontak
   - Sinkronisasi kontak (jika diaktifkan)

8. **Activity** (`/activity`)
   - Log aktivitas personal
   - Riwayat penggunaan fitur

9. **Chat History** (`/chat-history`)
   - Akses riwayat pesan yang tersinkronisasi
   - Filter chat berdasarkan tanggal atau kontak

### Admin Features (Sidebar Menu)

Fitur khusus untuk role Admin:

1. **Dashboard** (`/dashboard`)
   - Overview status device dan koneksi
   - Statistik pesan harian (Sent/Received)
   - Ringkasan aktivitas terbaru

2. **Users** (`/admin/users`)
   - User Management: Create, Edit, Lock, Delete User
   - Reset Password User
   - View User Details & Limits

3. **Devices** (`/admin/devices`)
   - Global Device Monitoring: Lihat semua device di sistem
   - Administrative Controls: Force disconnect/wipe device

4. **Messages** (`/admin/messages`)
   - Global Message Log: Audit semua pesan masuk/keluar sistem
   - Status tracking untuk troubleshooting

5. **Groups** (`/admin/groups`)
   - Group Management: List dan manage grup WhatsApp
   - Broadcast ke Grup

6. **Contacts** (`/admin/contacts`)
   - Global Contact Management: Lihat semua kontak di sistem
   - Filter kontak berdasarkan User/Device

7. **Jobs** (`/admin/jobs`)
   - Global Job Queue: Monitor antrian sistem
   - Priority Control: Pause/Resume jobs sistem
   - Performance Monitoring

8. **Analytics** (`/analytics`)
   - System-wide Analytics Dashboard
   - Export Data (Users, Devices, Logs)
   - System Health Metrics

### Core Capabilities

- **Multi-Device**: Dukungan untuk banyak device per user
- **Bot & Auto Reply**: Logic penjawab otomatis dengan Regex dan Keyword
- **Handoff System**: Transisi mulus dari Bot ke Agent manusia
- **Data Export**: Kemampuan export data ke JSON/CSV

---

## 🛠 Teknologi

### Backend Stack

- **Node.js** (v18+) - Runtime environment
- **Express.js** (v4.18+) - Web framework
- **Baileys** (v6.6.0) - WhatsApp Web API library
- **Sequelize** (v6.35+) - ORM untuk database
- **MySQL** (v8.0+) - Relational database
- **JWT** (jsonwebtoken) - Authentication token
- **Winston** - Logging system
- **Joi** - Request validation
- **Multer** - File upload handling
- **QRCode** - QR code generation

### Key Libraries

| Library                   | Purpose                                 |
| ------------------------- | --------------------------------------- |
| `@whiskeysockets/baileys` | WhatsApp Web API implementation         |
| `sequelize`               | Database ORM dengan MySQL               |
| `jsonwebtoken`            | JWT token generation & verification     |
| `bcryptjs`                | Password hashing                        |
| `qrcode`                  | QR code generation untuk authentication |
| `express-rate-limit`      | Rate limiting untuk API protection      |
| `helmet`                  | Security headers                        |
| `cors`                    | Cross-Origin Resource Sharing           |
| `morgan`                  | HTTP request logger                     |
| `dotenv`                  | Environment variables management        |

### Development Tools

- **nodemon** - Auto-reload saat development
### Frontend Stack

- **Next.js** (v16.1.1) - React Framework (App Router)
- **React** (v19.2.3) - UI Library
- **TailwindCSS** (v4.0) - Utility-first CSS framework
- **Redux Toolkit** - State Management
- **Lucide React** - Icon System
- **Axios** - HTTP Client

---

---

## 📁 Struktur Proyek

```
ws-app/
├── backend/
│   ├── src/
│   │   ├── app.js                      # Express app configuration & middleware setup
│   │   ├── server.js                   # Server bootstrap, DB setup, session bootstrap
│   │   │
│   │   ├── config/
│   │   │   └── database.js             # Sequelize database configuration
│   │   │
│   │   ├── controllers/
│   │   │   ├── authController.js       # Authentication endpoints (register, login, profile)
│   │   │   ├── adminController.js      # Admin endpoints (user/device/message management)
│   │   │   ├── botController.js        # Bot configuration and logic
│   │   │   ├── exportController.js     # Data export features
│   │   │   ├── auditController.js      # Audit trail system
│   │   │   ├── whatsappController.js   # Legacy WhatsApp endpoints (backward compatibility)
│   │   │   └── whatsappMultiDeviceController.js  # Multi-device WhatsApp endpoints
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.js                 # JWT authentication middleware
│   │   │   ├── authorize.js            # Role-based authorization (admin/user)
│   │   │   └── upload.js               # File upload middleware (multer)
│   │   │
│   │   ├── models/
│   │   │   ├── User.js                 # User model (id, username, email, password, role)
│   │   │   ├── WhatsAppSession.js      # Session model (deviceId, userId, status, phoneNumber)
│   │   │   ├── Message.js              # Message model (messageId, content, direction, status)
│   │   │   ├── Contact.js              # Contact model (name, phoneNumber, jid)
│   │   │   ├── Group.js                # Group model (groupId, name, participants, admins)
│   │   │   ├── Statistic.js            # Statistics model (deviceId, date, metrics)
│   │   │   ├── ScheduledMessage.js     # Scheduled message model
│   │   │   └── index.js                # Model associations & exports
│   │   │
│   │   ├── routes/
│   │   │   ├── auth.js                 # Authentication routes (/api/auth/*)
│   │   │   ├── admin.js                # Admin routes (/api/admin/*)
│   │   │   ├── whatsapp.js             # Legacy WhatsApp routes (/api/whatsapp/*)
│   │   │   ├── whatsappMultiDevice.js  # Multi-device routes (/api/whatsapp-multi-device/*)
│   │   │   └── sse.js                  # SSE routes (/api/events)
│   │   │
│   │   ├── services/
│   │   │   ├── deviceManager.js        # Device CRUD operations, ownership validation
│   │   │   ├── whatsappService.js      # WhatsApp connection, messaging, event handling
│   │   │   ├── jobQueueService.js      # Bulk messaging job queue processing
│   │   │   ├── statisticsService.js    # Statistics calculation & tracking
│   │   │   ├── autoReplyService.js     # Logic for auto-reply engine
│   │   │   ├── handoffService.js       # Logic for bot-to-human handoff
│   │   │   └── businessHoursService.js # Logic for business hours validation
│   │   │
│   │   └── utils/
│   │       ├── jwt.js                  # JWT token generation & verification
│   │       ├── logger.js               # Winston logger configuration
│   │       └── validation.js           # Joi validation schemas
│   │
│   ├── migrations/                     # Sequelize database migrations
│   │   ├── 20241226000000-add-device-id-to-sessions.js
│   │   ├── 20241226000001-add-device-id-unique-constraint.js
│   │   ├── 20241226000002-create-groups-table.js
│   │   ├── 20241226000003-create-statistics-table.js
│   │   └── 20241226000004-create-scheduled-messages-table.js
│   │
│   ├── scripts/                        # Utility scripts
│   │   ├── migrate-sessions-to-devices.js
│   │   └── migrate-session-storage.js
│   │
│   ├── sessions/                       # Baileys session storage (file-based)
│   │   └── auth_info_baileys_<deviceId>/
│   │
│   ├── uploads/                        # File upload storage
│   │
│   ├── logs/                           # Application logs
│   │   ├── combined.log
│   │   └── error.log
│   │
│   ├── config/
│   │   └── database.js                 # Sequelize CLI configuration
│   │
│   ├── .sequelizerc                    # Sequelize configuration file
│   ├── nodemon.json                    # Nodemon configuration
│   ├── package.json
│   ├── .env                            # Environment variables (not in git)
│   ├── .env.example                    # Example environment variables
│   └── create-admin.js                 # Script untuk create admin user
│
├── frontend/                           # Frontend React application (Next.js)
│   ├── app/                            # App Router Pages
│   │   ├── admin/                      # Admin Dashboard Pages
│   │   │   ├── dashboard/              # Stats overview
│   │   │   ├── users/                  # User management
│   │   │   ├── devices/                # Global device mgmt
│   │   │   ├── messages/               # Message monitoring
│   │   │   └── jobs/                   # Job queue monitoring
│   │   ├── analytics/                  # **New** Data Analysis & Export
│   │   ├── auth/                       # Authentication (Login/Register)
│   │   ├── dashboard/                  # Consumer Dashboard Home
│   │   ├── devices/                    # Device Management Pages
│   │   │   ├── [id]/                   # Device Details
│   │   │   │   ├── bot/                # **Bot Configuration URL**
│   │   │   │   └── chat/               # Chat interface
│   │   ├── send-message/               # Single Message Page
│   │   ├── schedule-message/           # Scheduled Messages
│   │   ├── chat-blast/                 # **New** Bulk Messaging (Blast) Page
│   │   ├── jobs/                       # User Job Monitoring
│   │   ├── contacts/                   # Contact Management
│   │   ├── activity/                   # **New** User Activity Log
│   │   ├── chat-history/               # Chat History View
│   │   ├── profile/                    # User Profile
│   │   └── layout.tsx                  # Root Layout
│   │
│   ├── components/                     # React Components
│   │   ├── admin/                      # Admin-specific components
│   │   ├── bot/                        # **Bot & Auto-Reply Components**
│   │   │   ├── BotConfigCard.tsx       # Config Helper
│   │   │   ├── BotRulesTable.tsx       # Auto-reply rules editor
│   │   │   └── BotLogsTable.tsx        # Activity logs
│   │   ├── layout/                     # Layout Components
│   │   │   ├── AdminSidebar.tsx        # Admin Navigation
│   │   │   └── UserSidebar.tsx         # User Navigation
│   │   └── ui/                         # Shadcn/UI & Reusable Components
│   │
│   ├── store/                          # Redux State Management
│   │   ├── slices/
│   │   │   ├── authSlice.ts            # Auth State
│   │   │   ├── deviceSlice.ts          # Device & Session State
│   │   │   ├── botSlice.ts             # **Bot Config & Rules State**
│   │   │   ├── dashboardSlice.ts       # Stats State
│   │   │   └── notificationSlice.ts    # Toast/Alert State
│   │   └── index.ts                    # Store Configuration
│   │
│   └── lib/                            # Utilities
│       ├── api.ts                      # Axios instance & interceptors
│       └── sse.ts                      # EventSource handling
│
└── README.md                           # This file
```

---

## 🧩 Komponen Sistem

### 1. Controllers

#### `authController.js`

Menangani autentikasi dan profil user:

- `register()` - Registrasi user baru
- `login()` - Login dan generate JWT token
- `refreshToken()` - Refresh JWT token
- `getProfile()` - Get profil user saat ini
- `updateProfile()` - Update profil user

#### `whatsappMultiDeviceController.js`

Menangani operasi WhatsApp multi-device:

- Device Management: `createDevice()`, `listDevices()`, `getDevice()`, `deleteDevice()`
- Connection: `connectDevice()`, `disconnectDevice()`, `getQRCode()`, `getQRCodeImage()`
- Messaging: `sendMessage()`, `sendMedia()`
- Job Queue: `createSendTextJob()`, `createSendMediaJob()`, `getJobStatus()`, `cancelJob()`
- Groups: `listGroups()`, `createGroup()`, `getGroupInfo()`, `sendGroupMessage()`, `inviteParticipants()`, `kickParticipant()`, `promoteAdmin()`, `demoteAdmin()`
- Chat History: `getChatHistory()`, `getGroupChatHistory()`, `getDailyChatList()`
- Statistics: `getStatistics()`, `getDailyActivity()`

#### `adminController.js`

Menangani operasi admin:

- User Management: `listUsers()`, `createUser()`, `getUserDetails()`, `updateUser()`, `deleteUser()`
- Device Management: `listDevices()` (all devices), `disconnectDevice()`, `deleteDevice()`
- Message Management: `listMessages()` (all messages)
- Job Control: `listJobs()`, `getJobDetails()`, `cancelJob()`, `pauseJob()`, `resumeJob()`, `retryJob()`
- Statistics: `getStats()` (global statistics)

#### `botController.js`

Menangani konfigurasi dan logic bot otomatis:

- Config: `getBotConfig()`, `updateBotConfig()`
- Rules: `listRules()`, `createRule()`, `updateRule()`, `deleteRule()`
- Handoffs: `listHandoffs()`, `resumeHandoff()`
- Logs: `getBotLogs()`
- Stats: `getBotStats()`

#### `exportController.js`

Menangani fitur data export:

- `exportUsers()` - Export user data (JSON/CSV)
- `exportDevices()` - Export device data
- `exportMessages()` - Export message history
- `exportLogs()` - Export audit logs

#### `auditController.js`

Menangani sistem audit trail:

- `listLogs()` - List admin action logs (Create/Update/Delete actions)
- `logAction()` - Helper untuk mencatat aktivitas admin

### 2. Services

#### `deviceManager.js`

Manajemen lifecycle device:

- `createDevice(userId, deviceName)` - Create device baru
- `getDevice(deviceId)` - Get device info
- `listDevices(userId)` - List devices untuk user
- `deleteDevice(deviceId)` - Delete device
- `validateDeviceOwnership(deviceId, userId, userRole)` - Validasi ownership

#### `whatsappService.js`

Integrasi dengan Baileys WhatsApp API:

- `createSessionForDevice(deviceId)` - Buat session Baileys untuk device
- `connectDevice(deviceId)` - Connect device ke WhatsApp
- `disconnectDevice(deviceId)` - Disconnect device
- `sendMessage(deviceId, phone, message)` - Kirim pesan
- `sendMedia(deviceId, phone, media)` - Kirim media
- `getSessionStatus(deviceId)` - Get status session
- `bootstrapSessions()` - Restore semua session saat startup
- Event handlers: `connection.update`, `creds.update`, `messages.upsert`, dll.
- SSE integration: `addSSEConnection()`, `removeSSEConnection()`, `broadcastEvent()`

#### `jobQueueService.js`

Proses bulk messaging:

- `createJob(deviceId, messages, options)` - Create job baru
- `processJob(jobId)` - Process job secara async
- `getJobStatus(jobId)` - Get status job
- `cancelJob(jobId)` - Cancel job yang sedang berjalan

#### `statisticsService.js`

Tracking dan kalkulasi statistik:

- `trackMessage(deviceId, message)` - Track message untuk statistik
- `getStatistics(deviceId, startDate, endDate)` - Get statistik dengan range date
- `getDailyActivity(deviceId)` - Get aktivitas harian
- `calculateResponseRate(deviceId)` - Hitung response rate

#### `autoReplyService.js`

Logic untuk auto-reply engine:

- `processMessage(deviceId, message)` - Process incoming message against rules
- `findMatchingRule(message, rules)` - Match message content dengan trigger
- `executeRule(rule, deviceId, contact)` - Kirim balasan otomatis

#### `handoffService.js`

Logic untuk transisi Bot ke Manusia:

- `checkHandoff(deviceId, contact)` - Cek apakah user sedang dalam mode handoff
- `createHandoff(deviceId, contact)` - Mulai sesi handoff (disable bot untuk user ini)
- `resumeBot(deviceId, contact)` - Akhiri handoff, kembali ke bot

#### `businessHoursService.js`

Logic validasi jam kerja:

- `isOpen(config, timezone)` - Cek apakah saat ini jam operasional buka

### 3. Frontend Modules

#### Redux Slices (`store/slices/`)

- **authSlice**: Manages current user session, token, and login status.
- **deviceSlice**: Handles functionality for listing, connecting, disconnecting devices, and storing QR codes.
- **botSlice**: Manages bot configuration, loading states for rules and logs.
- **dashboardSlice**: Stores statistical data for charts and overview cards.

#### Key Components (`components/`)

- **BotConfigCard**: Form interface for basic bot settings (toggle, timezone, greeting).
- **BotRulesTable**: Interactive table to CRUD auto-reply rules (regex/keyword, response).
- **QRCodeDisplay**: Component to render QR code string as image and handle refresh.
- **ChatInterface**: Real-time chat view for history and new messages.

### 3. Middleware

#### `auth.js` - Authentication Middleware

- Verify JWT token dari header atau query parameter
- Extract user info dari token
- Attach user object ke `req.user`
- Return 401 jika token invalid atau expired

#### `authorize.js` - Authorization Middleware

- `requireAdmin` - Hanya admin yang bisa akses
- `requireUser` - Admin dan User bisa akses
- Return 403 jika user tidak punya permission

#### `upload.js` - File Upload Middleware

- Konfigurasi Multer untuk file upload
- Handle media files untuk WhatsApp

### 4. Models

#### `User`

```javascript
{
  id: INTEGER (Primary Key),
  username: STRING (Unique),
  email: STRING (Unique),
  password: STRING (Hashed),
  fullName: STRING,
  role: ENUM('admin', 'user'),
  isActive: BOOLEAN,
  lastLogin: DATETIME,
  createdAt: DATETIME,
  updatedAt: DATETIME
}
```

#### `WhatsAppSession`

```javascript
{
  id: INTEGER (Primary Key),
  userId: INTEGER (Foreign Key -> User.id),
  deviceId: STRING (Unique),
  deviceName: STRING,
  sessionId: STRING,
  phoneNumber: STRING,
  status: ENUM('disconnected', 'connecting', 'connected', 'qr_required'),
  isActive: BOOLEAN,
  lastSeen: DATETIME,
  createdAt: DATETIME,
  updatedAt: DATETIME
}
```

#### `Message`

```javascript
{
  id: INTEGER (Primary Key),
  userId: INTEGER (Foreign Key -> User.id),
  sessionId: INTEGER (Foreign Key -> WhatsAppSession.id),
  messageId: STRING,
  fromNumber: STRING,
  toNumber: STRING,
  messageType: ENUM('text', 'image', 'video', 'audio', 'document'),
  content: TEXT,
  direction: ENUM('incoming', 'outgoing'),
  status: ENUM('pending', 'sent', 'delivered', 'read', 'failed'),
  timestamp: DATETIME,
  metadata: JSON,
  createdAt: DATETIME,
  updatedAt: DATETIME
}
```

#### `Contact`

```javascript
{
  id: INTEGER (Primary Key),
  userId: INTEGER (Foreign Key -> User.id),
  name: STRING,
  phoneNumber: STRING,
  jid: STRING,
  createdAt: DATETIME,
  updatedAt: DATETIME
}
```

#### `Group`

```javascript
{
  id: INTEGER (Primary Key),
  deviceId: STRING (Foreign Key -> WhatsAppSession.deviceId),
  groupId: STRING,
  name: STRING,
  participants: JSON (Array of JIDs),
  admins: JSON (Array of JIDs),
  createdAt: DATETIME,
  updatedAt: DATETIME
}
```

#### `Statistic`

```javascript
{
  id: INTEGER (Primary Key),
  deviceId: STRING (Foreign Key -> WhatsAppSession.deviceId),
  date: DATE,
  incomingMessages: INTEGER,
  outgoingMessages: INTEGER,
  activeChats: INTEGER,
  responseRate: DECIMAL,
  createdAt: DATETIME,
  updatedAt: DATETIME
}
```

#### `ScheduledMessage`

```javascript
{
  id: INTEGER (Primary Key),
  userId: INTEGER (Foreign Key -> User.id),
  sessionId: INTEGER (Foreign Key -> WhatsAppSession.id),
  scheduledMessageId: STRING (Unique),
  targetNumber: STRING,
  message: TEXT,
  scheduleTime: DATETIME,
  status: ENUM('pending', 'sent', 'failed', 'cancelled'),
  timezone: STRING,
  errorMessage: TEXT,
  createdAt: DATETIME,
  updatedAt: DATETIME
}
```

---

## 🗄️ Database Schema

### Entity Relationship Diagram (Text)

```
┌─────────────┐
│    User     │
│─────────────│
│ id (PK)     │
│ username    │──┐
│ email       │  │
│ password    │  │
│ role        │  │
│ isActive    │  │
└─────────────┘  │
                 │ 1:N
                 │
                 │
┌────────────────▼──────────────┐      ┌─────────────┐
│   WhatsAppSession             │      │   Contact   │
│───────────────────────────────│      │─────────────│
│ id (PK)                       │      │ id (PK)     │
│ userId (FK → User.id)         │◄─────│ userId (FK) │
│ deviceId (Unique)             │ 1:N  │ name        │
│ deviceName                    │      │ phoneNumber │
│ phoneNumber                   │      │ jid         │
│ status                        │      └─────────────┘
│ isActive                      │
└───────────────────────────────┘
                 │ 1:N
                 │
                 │
┌────────────────▼──────────────┐      ┌─────────────┐
│         Message               │      │    Group    │
│───────────────────────────────│      │─────────────│
│ id (PK)                       │      │ id (PK)     │
│ userId (FK → User.id)         │      │ deviceId    │
│ sessionId (FK → Session.id)   │      │   (FK)      │
│ messageId                     │      │ groupId     │
│ fromNumber                    │      │ name        │
│ toNumber                      │      │ participants│
│ messageType                   │      │ admins      │
│ content                       │      └─────────────┘
│ direction                     │
│ status                        │      ┌─────────────┐
│ timestamp                     │      │  Statistic  │
│ metadata (JSON)               │      │─────────────│
└───────────────────────────────┘      │ id (PK)     │
                                       │ deviceId    │
                                       │   (FK)      │
                                       │ date        │
                                       │ incomingMsgs│
                                       │ outgoingMsgs│
                                       │ activeChats │
                                       │ responseRate│
                                       └─────────────┘
```

### Relasi Database

1. **User → WhatsAppSession** (1:N)

   - Satu user bisa punya banyak device/session
   - Foreign Key: `whatsapp_sessions.user_id` → `users.id`

2. **User → Message** (1:N)

   - Satu user bisa punya banyak messages
   - Foreign Key: `messages.user_id` → `users.id`

3. **User → Contact** (1:N)

   - Satu user bisa punya banyak contacts
   - Foreign Key: `contacts.user_id` → `users.id`

4. **WhatsAppSession → Message** (1:N)

   - Satu session bisa punya banyak messages
   - Foreign Key: `messages.session_id` → `whatsapp_sessions.id`

5. **WhatsAppSession → Group** (1:N)

   - Satu device bisa punya banyak groups
   - Foreign Key: `groups.device_id` → `whatsapp_sessions.deviceId`

6. **WhatsAppSession → Statistic** (1:N)
   - Satu device bisa punya banyak statistics (per hari)
   - Foreign Key: `statistics.device_id` → `whatsapp_sessions.deviceId`

7. **User → ScheduledMessage** (1:N)
   - Satu user bisa punya banyak scheduled messages
   - Foreign Key: `scheduled_messages.user_id` → `users.id`

8. **WhatsAppSession → ScheduledMessage** (1:N)
   - Satu session bisa punya banyak scheduled messages
   - Foreign Key: `scheduled_messages.session_id` → `whatsapp_sessions.id`

---

## 🚀 Instalasi

### Prerequisites

- **Node.js** v18 atau lebih baru
- **MySQL** v8.0 atau lebih baru
- **npm** atau **yarn**
- **Git** (untuk clone repository)

### Setup

1. **Clone repository**

   ```bash
   git clone <repository-url>
   cd ws-app
   ```

2. **Install dependencies**

   ```bash
   cd backend
   npm install
   ```

3. **Setup environment variables**

   Buat file `.env` di folder `backend/`:

   ```bash
   cp .env.example .env
   # Edit .env dengan konfigurasi database Anda
   ```

4. **Konfigurasi database**

   Edit file `.env`:

   ```env
   # Database Configuration
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=whatsapp_service_app

   # JWT Configuration
   JWT_SECRET=your_jwt_secret_key_here_min_32_chars
   JWT_REFRESH_SECRET=your_refresh_secret_key_here_min_32_chars
   JWT_EXPIRES_IN=24h
   JWT_REFRESH_EXPIRES_IN=7d

   # Server Configuration
   PORT=5005
   NODE_ENV=development
   FRONTEND_URL=http://localhost:5173

   # Database Auto Setup
   AUTO_CREATE_TABLES=true
   ```

5. **Create database**

   Login ke MySQL dan buat database:

   ```sql
   CREATE DATABASE whatsapp_service_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

6. **Run migrations**

   ```bash
   cd backend
   npm run db:migrate
   ```

7. **Start server**
   ```bash
   npm run dev
   ```

Server akan berjalan di `http://localhost:5005`

### Frontend Setup

1. **Install dependencies**

   ```bash
   cd frontend
   npm install
   ```

2. **Start Development Server**

   ```bash
   npm run dev
   ```

   Frontend akan berjalan di `http://localhost:5173`

---

## ⚙️ Konfigurasi

### Environment Variables

| Variable                 | Deskripsi                         | Default                 | Required |
| ------------------------ | --------------------------------- | ----------------------- | -------- |
| `DB_HOST`                | Database host                     | `localhost`             | ✅       |
| `DB_PORT`                | Database port                     | `3306`                  | ✅       |
| `DB_USER`                | Database user                     | `root`                  | ✅       |
| `DB_PASSWORD`            | Database password                 | -                       | ✅       |
| `DB_NAME`                | Database name                     | `whatsapp_service_app`  | ✅       |
| `JWT_SECRET`             | JWT secret key (min 32 chars)     | -                       | ✅       |
| `JWT_REFRESH_SECRET`     | JWT refresh secret (min 32 chars) | -                       | ✅       |
| `JWT_EXPIRES_IN`         | JWT token expiration              | `24h`                   | ❌       |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiration          | `7d`                    | ❌       |
| `PORT`                   | Server port                       | `5005`                  | ❌       |
| `FRONTEND_URL`           | Frontend URL untuk CORS           | `http://localhost:5173` | ❌       |
| `NODE_ENV`               | Environment mode                  | `development`           | ❌       |
| `AUTO_CREATE_TABLES`     | Auto create tables on startup     | `true`                  | ❌       |

### Konfigurasi CORS

CORS dikonfigurasi di `src/app.js` untuk mengizinkan request dari frontend. Default:

- `http://localhost:5173`
- `http://localhost:3001`
- `http://localhost:3002`

Untuk production, update `FRONTEND_URL` di `.env`.

### Konfigurasi Rate Limiting

Rate limiting dikonfigurasi untuk melindungi API dari abuse:

- **Window**: 15 minutes
- **Max requests**: 100 requests per IP per window

Dapat dikonfigurasi di `src/app.js`.

---

## 🗄️ Database Migration

### Running Migrations

1. **Run all migrations**

   ```bash
   cd backend
   npm run db:migrate
   ```

2. **Run data migration (setelah schema migration)**

   ```bash
   node scripts/migrate-sessions-to-devices.js
   ```

3. **Run session storage migration (optional)**
   ```bash
   node scripts/migrate-session-storage.js
   ```

### Migration Files

- `20241226000000-add-device-id-to-sessions.js` - Add `device_id` columns ke `whatsapp_sessions`
- `20241226000001-add-device-id-unique-constraint.js` - Add unique constraint untuk `device_id`
- `20241226000002-create-groups-table.js` - Create `groups` table
- `20241226000003-create-statistics-table.js` - Create `statistics` table
- `20241226000004-create-scheduled-messages-table.js` - Create `scheduled_messages` table

### Auto Table Creation

Jika `AUTO_CREATE_TABLES=true` di `.env`, server akan otomatis membuat tabel yang belum ada saat startup. Fitur ini berguna untuk development, tapi **tidak direkomendasikan untuk production**.

Untuk production, set `AUTO_CREATE_TABLES=false` dan gunakan migrations.

### Auto Schema Update

Anda dapat mengaktifkan update schema otomatis (seperti menambah kolom baru tanpa file migrasi manual) dengan mengatur environment variable:

```env
# backend/.env
AUTO_UPDATE_SCHEMA=true
```

> **Catatan**: Fitur ini menggunakan `sequelize.sync({ alter: true })`. Gunakan dengan hati-hati di production karena berpotensi mengubah struktur tabel secara otomatis. Untuk production, disarankan menggunakan migration manual (`AUTO_UPDATE_SCHEMA=false`).

---

## 🏃 Menjalankan Server

### Development Mode

```bash
cd backend
npm run dev
```

Server akan berjalan di `http://localhost:5005` dengan auto-reload menggunakan nodemon.

**Features:**

- Auto-reload saat file berubah
- Detailed error messages
- Development logging

### Production Mode

```bash
cd backend
npm start
```

**Features:**

- No auto-reload
- Optimized error handling
- Production logging

### Using Docker (Recommended)

```bash
# Build dan start containers
docker-compose up -d

# View logs
docker-compose logs -f

# Stop containers
docker-compose down
```

### Health Check

```bash
curl http://localhost:5005/api/health
```

**Response:**

```json
{
  "status": "OK",
  "message": "WhatsApp Service Backend is running",
  "timestamp": "2024-12-26T08:00:00.000Z"
}
```

---

## 📡 API Documentation

### Base URL

```
http://localhost:5005/api
```

### Authentication

Sebagian besar endpoint memerlukan JWT token di header:

```
Authorization: Bearer <token>
```

Atau untuk SSE (Server-Sent Events), token bisa dikirim via query parameter:

```
GET /api/events?token=<token>
```

### Main Endpoints

#### 1. Authentication (`/api/auth`)

| Method | Endpoint         | Description                  | Auth Required |
| ------ | ---------------- | ---------------------------- | ------------- |
| POST   | `/register`      | Register user baru           | ❌            |
| POST   | `/login`         | Login dan dapatkan JWT token | ❌            |
| POST   | `/refresh-token` | Refresh JWT token            | ❌            |
| GET    | `/profile`       | Get profil user saat ini     | ✅            |
| PUT    | `/profile`       | Update profil user           | ✅            |
| POST   | `/profile/photo` | Upload profile photo         | ✅            |


#### 2. Device Management (`/api/whatsapp-multi-device/devices`)

| Method | Endpoint                             | Description            | Auth | Role       |
| ------ | ------------------------------------ | ---------------------- | ---- | ---------- |
| POST   | `/devices`                           | Create device baru     | ✅   | Admin      |
| GET    | `/devices`                           | List devices           | ✅   | User/Admin |
| GET    | `/devices/connected`                 | List connected devices | ✅   | User/Admin |
| GET    | `/devices/connected/detail`          | Alias list connected   | ✅   | User/Admin |
| GET    | `/devices/:deviceId`                 | Get device info        | ✅   | User/Admin |
| GET    | `/devices/:deviceId/status`          | Get device status      | ✅   | User/Admin |
| POST   | `/devices/:deviceId/connect`         | Connect device         | ✅   | User/Admin |
| DELETE | `/devices/:deviceId/disconnect`      | Disconnect device      | ✅   | User/Admin |
| DELETE | `/devices/:deviceId`                 | Delete device          | ✅   | Admin      |
| POST   | `/devices/:deviceId/cancel-and-wipe` | Cancel & wipe device   | ✅   | Admin      |
| DELETE | `/devices/:deviceId/session`         | Alias cancel & wipe    | ✅   | Admin      |

#### 3. QR Code & Pairing (`/api/whatsapp-multi-device/devices/:deviceId`)

| Method | Endpoint        | Description                         | Auth | Role       |
| ------ | --------------- | ----------------------------------- | ---- | ---------- |
| GET    | `/qr`           | Get QR code string                  | ✅   | User/Admin |
| GET    | `/qr-image`     | Get QR code image (base64 data URL) | ✅   | User/Admin |
| GET    | `/qr-base64`    | Alias QR image (base64)             | ✅   | User/Admin |
| POST   | `/pairing-code` | Generate pairing code               | ✅   | Admin      |

**Catatan:** Semua endpoint di atas memerlukan `deviceId` sebagai path parameter. Contoh: `/api/whatsapp-multi-device/devices/device-1-1234567890-12345/qr`

#### 4. Messaging (`/api/whatsapp-multi-device/devices/:deviceId`)

| Method | Endpoint            | Description                  | Auth | Role       |
| ------ | ------------------- | ---------------------------- | ---- | ---------- |
| POST   | `/send-message`     | Send text message            | ✅   | User/Admin |
| POST   | `/send-media`       | Send media message           | ✅   | User/Admin |
| POST   | `/schedule-message` | Schedule a message (delayed) | ✅   | User/Admin |

#### 4b. Scheduled Messages Management (`/api/whatsapp-multi-device`)

| Method | Endpoint                                   | Description                    | Auth | Role       |
| ------ | ------------------------------------------ | ------------------------------ | ---- | ---------- |
| GET    | `/devices/:deviceId/scheduled-messages`    | List scheduled (device)        | ✅   | User/Admin |
| GET    | `/scheduled-messages`                      | List all scheduled             | ✅   | User/Admin |
| POST   | `/scheduled-messages/:messageId/cancel`    | Cancel scheduled msg           | ✅   | User/Admin |


#### 4a. Contacts (WhatsApp vs Database)

**WhatsApp Contacts (`/api/whatsapp-multi-device/devices/:deviceId`)**

| Method | Endpoint    | Description             | Auth | Role       |
| ------ | ----------- | ----------------------- | ---- | ---------- |
| GET    | `/contacts` | Get contacts from WA    | ✅   | User/Admin |

**Database Contacts (`/api/whatsapp-multi-device`)**

| Method | Endpoint                       | Description             | Auth | Role       |
| ------ | ------------------------------ | ----------------------- | ---- | ---------- |
| GET    | `/contacts`                    | Get saved contacts      | ✅   | User/Admin |
| POST   | `/contacts`                    | Save/sync contact       | ✅   | User/Admin |
| PUT    | `/contacts/:contactId/tags`    | Update contact tags     | ✅   | User/Admin |
| GET    | `/tags`                        | Get all user tags       | ✅   | User/Admin |


#### 4b. Message Templates (`/api/whatsapp-multi-device/templates`)

| Method | Endpoint                  | Description           | Auth | Role       |
| ------ | ------------------------- | --------------------- | ---- | ---------- |
| GET    | `/templates`              | List templates        | ✅   | User/Admin |
| POST   | `/templates`              | Create template       | ✅   | User/Admin |
| PUT    | `/templates/:baseId`      | Update template       | ✅   | User/Admin |
| DELETE | `/templates/:baseId`      | Delete template       | ✅   | User/Admin |
| POST   | `/templates/:baseId/use`  | Use template (msg)    | ✅   | User/Admin |


#### 5. Bulk Messaging (`/api/whatsapp-multi-device`)

| Method | Endpoint                             | Description           | Auth | Role       |
| ------ | ------------------------------------ | --------------------- | ---- | ---------- |
| POST   | `/devices/:deviceId/jobs/send-text`  | Create bulk text job  | ✅   | User/Admin |
| POST   | `/devices/:deviceId/jobs/send-media` | Create bulk media job | ✅   | User/Admin |
| GET    | `/jobs`                              | List user jobs        | ✅   | User/Admin |
| GET    | `/jobs/:jobId`                       | Get job status        | ✅   | User/Admin |
| POST   | `/jobs/:jobId/cancel`                | Cancel job            | ✅   | User/Admin |

**Catatan:** Endpoint `GET /jobs/:jobId` dan `POST /jobs/:jobId/cancel` tidak memerlukan `deviceId` karena job sudah memiliki identifier unik.

#### 6. Group Management (`/api/whatsapp-multi-device/devices/:deviceId/groups`)

| Method | Endpoint                                        | Description                   | Auth | Role  |
| ------ | ----------------------------------------------- | ----------------------------- | ---- | ----- |
| GET    | `/groups`                                       | List groups                   | ✅   | Admin |
| POST   | `/groups`                                       | Create group                  | ✅   | Admin |
| GET    | `/groups/:groupId/info`                         | Get group info                | ✅   | Admin |
| POST   | `/send-group-message`                           | Send group message            | ✅   | Admin |
| POST   | `/groups/:groupId/mention-message`              | Send group mention message    | ✅   | Admin |
| POST   | `/groups/:groupId/send-media`                   | Send group media (single)     | ✅   | Admin |
| POST   | `/groups/:groupId/jobs/send-media`              | Create group media job (bulk) | ✅   | Admin |
| POST   | `/groups/:groupId/participants`                 | Invite participants           | ✅   | Admin |
| DELETE | `/groups/:groupId/participants/:participantJid` | Kick participant              | ✅   | Admin |
| POST   | `/groups/:groupId/admins`                       | Promote admin                 | ✅   | Admin |
| DELETE | `/groups/:groupId/admins/:adminJid`             | Demote admin                  | ✅   | Admin |

#### 7. Chat History (`/api/whatsapp-multi-device/devices/:deviceId`)

| Method | Endpoint                       | Description                    | Auth | Role       |
| ------ | ------------------------------ | ------------------------------ | ---- | ---------- |
| GET    | `/chat-history/:jid`           | Get chat history dengan kontak | ✅   | User/Admin |
| GET    | `/group-chat-history/:groupId` | Get group chat history         | ✅   | Admin      |
| GET    | `/daily-chat-list`             | Get daily chat list            | ✅   | User/Admin |

#### 8. Statistics (`/api/whatsapp-multi-device/devices/:deviceId/statistics`)

| Method | Endpoint            | Description                        | Auth | Role  |
| ------ | ------------------- | ---------------------------------- | ---- | ----- |
| GET    | `/statistics`       | Get statistics (dengan date range) | ✅   | Admin |
| GET    | `/statistics/daily` | Get daily activity                 | ✅   | Admin |

**User Statistics (`/api/whatsapp-multi-device`)**

| Method | Endpoint            | Description                        | Auth | Role       |
| ------ | ------------------- | ---------------------------------- | ---- | ---------- |
| GET    | `/user/statistics`  | Get personal stats                 | ✅   | User/Admin |


#### 9. Real-time Events (`/api/events`)

| Method | Endpoint | Description                            | Auth | Role       |
| ------ | -------- | -------------------------------------- | ---- | ---------- |
| GET    | `/`      | SSE connection untuk real-time updates | ✅   | User/Admin |

#### 10. Bot Management (`/api/bot/devices/:deviceId`)

| Method | Endpoint                             | Description                               | Auth | Role       |
| ------ | ------------------------------------ | ----------------------------------------- | ---- | ---------- |
| GET    | `/config`                            | Get bot configuration for a device        | ✅   | User/Admin |
| PUT    | `/config`                            | Update bot configuration for a device     | ✅   | User/Admin |
| GET    | `/rules`                             | List auto-reply rules for a device        | ✅   | User/Admin |
| POST   | `/rules`                             | Create a new auto-reply rule              | ✅   | User/Admin |
| PUT    | `/rules/:ruleId`                     | Update an auto-reply rule                 | ✅   | User/Admin |
| DELETE | `/rules/:ruleId`                     | Delete an auto-reply rule                 | ✅   | User/Admin |
| GET    | `/handoffs`                          | List active handoff sessions              | ✅   | User/Admin |
| POST   | `/handoffs/:contactJid/resume`       | Resume bot for a contact (end handoff)    | ✅   | User/Admin |
| GET    | `/logs`                              | Get bot activity logs                     | ✅   | User/Admin |
| GET    | `/stats`                             | Get bot statistics                        | ✅   | User/Admin |

#### 11. Data Export (`/api/admin/export`)

| Method | Endpoint        | Description                               | Auth | Role  |
| ------ | --------------- | ----------------------------------------- | ---- | ----- |
| GET    | `/users`        | Export user data (JSON/CSV)               | ✅   | Admin |
| GET    | `/devices`      | Export device data (JSON/CSV)             | ✅   | Admin |
| GET    | `/messages`     | Export message history (JSON/CSV)         | ✅   | Admin |
| GET    | `/logs`         | Export audit logs (JSON/CSV)              | ✅   | Admin |

#### 12. Admin Endpoints (`/api/admin`)

| Method | Endpoint              | Description                                      | Auth | Role  |
| ------ | --------------------- | ------------------------------------------------ | ---- | ----- |
| GET    | `/users`              | List semua users (dengan pagination & filter)    | ✅   | Admin |
| POST   | `/users`              | Create user baru                                 | ✅   | Admin |
| GET    | `/users/:userId`      | Get user details                                 | ✅   | Admin |
| PUT    | `/users/:userId`      | Update user                                      | ✅   | Admin |
| DELETE | `/users/:userId`      | Delete user                                      | ✅   | Admin |
| GET    | `/users/:userId/insights` | Get user insights                            | ✅   | Admin |
| GET    | `/devices`            | List semua devices (dengan pagination & filter)  | ✅   | Admin |
| GET    | `/devices/:deviceId/health` | Get device health check                        | ✅   | Admin |
| GET    | `/messages`           | List semua messages (dengan pagination & filter) | ✅   | Admin |
| GET    | `/groups`             | List semua groups                                | ✅   | Admin |
| GET    | `/contacts`           | List semua contacts                              | ✅   | Admin |
| GET    | `/jobs`               | List semua jobs                                  | ✅   | Admin |
| GET    | `/jobs/:jobId`        | Get job detail                                   | ✅   | Admin |
| POST   | `/jobs/:jobId/cancel` | Cancel job (admin)                               | ✅   | Admin |
| POST   | `/jobs/:jobId/pause`  | Pause job                                        | ✅   | Admin |
| POST   | `/jobs/:jobId/resume` | Resume job                                       | ✅   | Admin |
| POST   | `/jobs/:jobId/retry`  | Retry job                                        | ✅   | Admin |
| GET    | `/logs`               | Get audit logs                                   | ✅   | Admin |
| GET    | `/logs/filters`       | Get audit log filters                            | ✅   | Admin |
| GET    | `/stats`              | Get global statistics                            | ✅   | Admin |

### Legacy Endpoints (Backward Compatibility)

Endpoint lama tetap berfungsi di `/api/whatsapp/*` untuk backward compatibility:

| Method | Endpoint         | Description                    | Auth | Role       |
| ------ | ---------------- | ------------------------------ | ---- | ---------- |
| GET    | `/status`        | Get WhatsApp connection status | ✅   | User/Admin |
| POST   | `/connect`       | Connect WhatsApp (single user) | ✅   | User/Admin |
| POST   | `/regenerate-qr` | Regenerate QR code             | ✅   | User/Admin |
| POST   | `/disconnect`    | Disconnect WhatsApp            | ✅   | User/Admin |
| POST   | `/send-message`  | Send text message              | ✅   | User/Admin |
| GET    | `/messages`      | Get message history            | ✅   | User/Admin |
| GET    | `/contacts`      | Get contacts list              | ✅   | User/Admin |

**Catatan:** Endpoint legacy ini menggunakan single-device architecture. Untuk multi-device support, gunakan endpoint di `/api/whatsapp-multi-device/*`.

---

## 🔐 Role-Based Access Control

Sistem menggunakan role-based access control (RBAC) untuk membatasi akses ke fitur dan resource berdasarkan peran user. Terdapat 2 role utama dalam sistem ini:

### Role Definitions

1. **Admin** - Full access ke semua fitur dan resource
2. **User** - Limited access, hanya untuk resource milik user sendiri

### Role & Permission Matrix

| Feature                    | Admin | User | Notes                               |
| -------------------------- | ----- | ---- | ----------------------------------- |
| **Authentication**         |       |      |                                     |
| Register                   | ✅    | ✅   | Semua user bisa register            |
| Login                      | ✅    | ✅   | Semua user bisa login               |
| Profile View               | ✅    | ✅   | User lihat profil sendiri           |
| Profile Update             | ✅    | ✅   | User update profil sendiri          |
| **Device Management**      |       |      |                                     |
| Create Device              | ✅    | ❌   | Hanya admin                         |
| List Devices               | ✅    | ✅   | Admin: semua, User: device miliknya |
| Get Device Details         | ✅    | ✅   | Admin: semua, User: device miliknya |
| Get Device Status          | ✅    | ✅   | Admin: semua, User: device miliknya |
| Connect Device             | ✅    | ✅   | Admin: semua, User: device miliknya |
| Disconnect Device          | ✅    | ✅   | Admin: semua, User: device miliknya |
| Delete Device              | ✅    | ❌   | Hanya admin                         |
| Cancel & Wipe Device       | ✅    | ❌   | Hanya admin                         |
| **QR Code & Pairing**      |       |      |                                     |
| View QR Code               | ✅    | ✅   | Admin: semua, User: device miliknya |
| Get QR Image               | ✅    | ✅   | Admin: semua, User: device miliknya |
| Generate Pairing Code      | ✅    | ❌   | Hanya admin                         |
| **Messaging**              |       |      |                                     |
| Send Text Message          | ✅    | ✅   | Ownership validation required       |
| Send Media Message         | ✅    | ✅   | Ownership validation required       |
| Schedule Message           | ✅    | ✅   | Ownership validation required       |
| View Message History       | ✅    | ✅   | Ownership validation required       |
| Send Group Message         | ✅    | ❌   | Hanya admin                         |
| **Bulk Messaging & Jobs**  |       |      |                                     |
| Create Bulk Text Job       | ✅    | ❌   | Hanya admin                         |
| Create Bulk Media Job      | ✅    | ❌   | Hanya admin                         |
| Create Group Media Job     | ✅    | ❌   | Hanya admin                         |
| View Job Status            | ✅    | ✅   | Admin: semua, User: device miliknya |
| Cancel Job                 | ✅    | ✅   | Admin: semua, User: device miliknya |
| Pause Job                  | ✅    | ❌   | Hanya admin                         |
| Resume Job                 | ✅    | ❌   | Hanya admin                         |
| Retry Job                  | ✅    | ❌   | Hanya admin                         |
| **Group Management**       |       |      |                                     |
| List Groups                | ✅    | ❌   | Hanya admin                         |
| Create Group               | ✅    | ❌   | Hanya admin                         |
| Get Group Info             | ✅    | ❌   | Hanya admin                         |
| Manage Group Participants  | ✅    | ❌   | Hanya admin (invite/kick)           |
| Manage Group Admins        | ✅    | ❌   | Hanya admin (promote/demote)        |
| **Chat History**           |       |      |                                     |
| View Contact Chat History  | ✅    | ✅   | Ownership validation required       |
| View Group Chat History    | ✅    | ❌   | Hanya admin                         |
| View Daily Chat List       | ✅    | ✅   | Ownership validation required       |
| **Contacts**               |       |      |                                     |
| List Contacts              | ✅    | ✅   | Ownership validation required       |
| **Statistics & Analytics** |       |      |                                     |
| View Device Statistics     | ✅    | ❌   | Hanya admin                         |
| View Daily Activity        | ✅    | ❌   | Hanya admin                         |
| View Global Statistics     | ✅    | ❌   | Hanya admin                         |
| **Bot & Auto Reply**       |       |      |                                     |
| Get Bot Config             | ✅    | ✅   | Admin: semua, User: device miliknya |
| Update Bot Config          | ✅    | ✅   | Admin: semua, User: device miliknya |
| List Auto-Reply Rules      | ✅    | ✅   | Admin: semua, User: device miliknya |
| Create Auto-Reply Rule     | ✅    | ✅   | Admin: semua, User: device miliknya |
| Update Auto-Reply Rule     | ✅    | ✅   | Admin: semua, User: device miliknya |
| Delete Auto-Reply Rule     | ✅    | ✅   | Admin: semua, User: device miliknya |
| List Handoffs              | ✅    | ✅   | Admin: semua, User: device miliknya |
| Resume Bot (End Handoff)   | ✅    | ✅   | Admin: semua, User: device miliknya |
| Get Bot Logs               | ✅    | ✅   | Admin: semua, User: device miliknya |
| **Data Export**            |       |      |                                     |
| Export Users               | ✅    | ❌   | Hanya admin                         |
| Export Devices             | ✅    | ❌   | Hanya admin                         |
| Export Messages            | ✅    | ❌   | Hanya admin                         |
| Export Audit Logs          | ✅    | ❌   | Hanya admin                         |
| **Admin Panel**            |       |      |                                     |
| Manage Users (CRUD)        | ✅    | ❌   | Hanya admin                         |
| View All Devices           | ✅    | ❌   | Hanya admin                         |
| View All Messages          | ✅    | ❌   | Hanya admin                         |
| View All Groups            | ✅    | ❌   | Hanya admin                         |
| View All Contacts          | ✅    | ❌   | Hanya admin                         |
| View All Jobs              | ✅    | ❌   | Hanya admin                         |
| Monitor System Health      | ✅    | ❌   | Hanya admin                         |

### User Flow Based on Role

#### 👤 User Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER JOURNEY                              │
└─────────────────────────────────────────────────────────────────┘

1. REGISTRATION & LOGIN
   ├── Register (Email, Username, Password, Full Name)
   ├── Login dengan email & password
   └── Terima JWT token (valid 24 jam)

2. PROFILE MANAGEMENT
   ├── View Profile (GET /api/auth/profile)
   └── Update Profile (PUT /api/auth/profile)

3. DEVICE MANAGEMENT (Owned Devices Only)
   ├── List My Devices (GET /api/whatsapp-multi-device/devices)
   ├── Get Device Details (GET /api/whatsapp-multi-device/devices/:deviceId)
   ├── Connect Device (POST /api/whatsapp-multi-device/devices/:deviceId/connect)
   │   ├── Receive QR Code via SSE (real-time)
   │   └── Scan QR dengan WhatsApp mobile
   ├── View QR Code (GET /api/whatsapp-multi-device/devices/:deviceId/qr-image)
   └── Disconnect Device (DELETE /api/whatsapp-multi-device/devices/:deviceId/disconnect)

4. MESSAGING OPERATIONS
   ├── Send Text Message
   │   └── POST /api/whatsapp-multi-device/devices/:deviceId/send-message
   ├── Send Media Message
   │   └── POST /api/whatsapp-multi-device/devices/:deviceId/send-media
   ├── Schedule Message
   │   └── POST /api/whatsapp-multi-device/devices/:deviceId/schedule-message
   └── View Message History
       └── GET /api/whatsapp-multi-device/devices/:deviceId/chat-history/:jid

5. CONTACT & CHAT MANAGEMENT
   ├── View Contacts (GET /api/whatsapp-multi-device/devices/:deviceId/contacts)
   ├── View Chat History
   │   ├── GET /api/whatsapp-multi-device/devices/:deviceId/chat-history/:jid
   │   └── GET /api/whatsapp-multi-device/devices/:deviceId/daily-chat-list
   └── Subscribe to Real-time Events
       └── GET /api/events?token=<jwt_token> (SSE)

6. JOB MONITORING
   ├── View Job Status (GET /api/whatsapp-multi-device/jobs/:jobId)
   ├── Cancel Job (POST /api/whatsapp-multi-device/jobs/:jobId/cancel)
   └── Receive Job Notifications (via SSE)

7. BOT MANAGEMENT (Owned Devices Only)
   ├── Get/Update Bot Config (GET/PUT /api/whatsapp-multi-device/devices/:deviceId/bot/config)
   ├── Manage Auto-Reply Rules (CRUD /api/whatsapp-multi-device/devices/:deviceId/bot/rules)
   ├── Monitor Handoffs (GET /api/whatsapp-multi-device/devices/:deviceId/bot/handoffs)
   └── Resume Bot for Contact (POST /api/whatsapp-multi-device/devices/:deviceId/bot/handoffs/:contactJid/resume-bot)

8. SSE EVENTS (Real-time Updates)
   ├── Device Status Changes
   ├── QR Code Generated
   ├── Connection Status Updates
   ├── Message Status Updates
   ├── Job Progress Updates
   └── Error Notifications
```

#### 👨‍💼 Admin Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        ADMIN JOURNEY                             │
└─────────────────────────────────────────────────────────────────┘

1. AUTHENTICATION (Same as User)
   ├── Login dengan admin account
   ├── Terima JWT token dengan role=admin
   └── Access admin-only endpoints

2. USER MANAGEMENT
   ├── List All Users (GET /api/admin/users)
   ├── Create New User (POST /api/admin/users)
   ├── View User Details (GET /api/admin/users/:userId)
   ├── Update User (PUT /api/admin/users/:userId)
   │   ├── Reset Password functionality
   │   └── Lock/Unlock Account (isActive toggle)
   ├── Delete User (DELETE /api/admin/users/:userId)
   └── View User Devices & Statistics

3. DEVICE MANAGEMENT (All Devices)
   ├── List All Devices (GET /api/admin/devices)
   ├── Create Device for User
   │   ├── POST /api/whatsapp-multi-device/devices
   │   ├── Specify userId (optional, untuk user tertentu)
   │   └── Specify custom deviceId (optional)
   ├── View Any Device Details
   ├── Connect/Disconnect Any Device
   ├── Get QR Code for Any Device
   ├── Delete Any Device
   ├── Cancel & Wipe Device Sessions
   └── Monitor Device Status

4. MESSAGE & CONTACT MANAGEMENT
   ├── View All Messages (GET /api/admin/messages)
   ├── Filter by device, user, status, date
   ├── View All Contacts (GET /api/admin/contacts)
   └── Message Statistics & Analysis

5. GROUP MANAGEMENT
   ├── List All Groups (GET /api/whatsapp-multi-device/devices/:deviceId/groups)
   ├── Create Group (POST /api/whatsapp-multi-device/devices/:deviceId/groups)
   ├── View Group Info & Participants
   ├── Send Group Messages
   ├── Invite/Kick Participants
   ├── Promote/Demote Admins
   └── Create & Execute Group Media Jobs

6. BULK MESSAGING & ADVANCED JOB CONTROL
   ├── Create Bulk Text Job (POST /api/whatsapp-multi-device/devices/:deviceId/jobs/send-text)
   │   ├── Specify multiple recipients
   │   ├── Set message delay (default 3s)
   │   └── Schedule optional
   ├── Create Bulk Media Job
   ├── Create Group Media Job (Bulk)
   ├── Monitor All Jobs (GET /api/admin/jobs)
   ├── Job Control Actions:
   │   ├── Cancel Job
   │   ├── Pause Job (POST /api/admin/jobs/:jobId/pause)
   │   ├── Resume Job (POST /api/admin/jobs/:jobId/resume)
   │   └── Retry Job (POST /api/admin/jobs/:jobId/retry)
   │   └── Receive Job Completion Notifications

7. BOT & AUTOMATION MANAGEMENT
   ├── Manage Bot Config (GET/PUT /api/whatsapp-multi-device/devices/:deviceId/bot/config)
   ├── Edit Auto Reply Rules (CRUD /api/whatsapp-multi-device/devices/:deviceId/bot/rules)
   ├── Monitor All Handoffs (GET /api/whatsapp-multi-device/devices/:deviceId/bot/handoffs)
   ├── Override Handoff Status (POST /api/whatsapp-multi-device/devices/:deviceId/bot/handoffs/:contactJid/resume-bot)
   └── View All Bot Logs (GET /api/whatsapp-multi-device/devices/:deviceId/bot/logs)

8. DATA EXPORT & AUDIT
   ├── Export User Data (GET /api/export/users)
   ├── Export Device List (GET /api/export/devices)
   ├── Export Message History (GET /api/export/messages)
   ├── Export Admin Audit Logs (GET /api/export/audit-logs)
   └── View Audit Logs (GET /api/admin/logs)
       ├── Filter by Admin, Action, Target
       └── Track sensitive actions (user delete, device wipe, etc.)
   
9. ANALYTICS & MONITORING
   ├── Global Statistics (GET /api/admin/stats)
   │   ├── Total users, devices, messages
   │   ├── Online devices count
   │   └── System health metrics
   ├── Device Statistics (GET /api/whatsapp-multi-device/devices/:deviceId/statistics)
   │   ├── Daily activity
   │   ├── Message count (in/out)
   │   ├── Active chats
   │   └── Response rate
   └── System Monitoring
       ├── Health Check
       └── Performance metrics

10. SSE EVENTS (Real-time Admin Notifications)
   ├── User Account Changes
   ├── Device Connection Status
   ├── Bulk Message Progress
   ├── Job Completion
   ├── System Events
   ├── Error Alerts
   └── Performance Warnings
```

### Feature Access by Role

#### **Admin-Only Features** ✅👨‍💼

```
1. User Management (CRUD)
   - Create new user accounts
   - Manage user information
   - Delete user accounts
   - View user activity
   - Lock/Unlock User Account
   - Reset User Password

2. Device Creation & Global Management
   - Create devices for any user
   - Delete any device
   - Wipe device sessions
   - Manage all device connections

3. Bulk Messaging Operations
   - Create bulk text message jobs
   - Create bulk media jobs
   - Schedule bulk messages
   - Monitor all jobs globally
   - Cancel any job
   - Pause/Resume/Retry Jobs

4. Group Management
   - Create groups on any device
   - Manage group participants
   - Manage group admins
   - Send group messages
   - Create group bulk media jobs

5. Statistics & Analytics
   - View global statistics
   - Daily activity reports
   - Message analytics
   - Response rate analysis
   - Device usage statistics
   - User behavior analytics

6. System Administration
   - View system logs
   - View Audit Logs
   - Monitor health status
   - Admin panel access
   - User list & management
   - Device monitoring
   - Message monitoring
   - Performance metrics

7. Data Export & Reports
   - Export statistics
   - Export message history
   - Export user data
   - Export audit logs
   - Generate reports

8. Bot Management (All Devices)
   - Configure bot for any device
   - Manage global auto-reply rules
   - Monitor all handoffs
   - View all bot logs
```

#### **User Features** 👤

```
1. Personal Device Management
   - List own devices
   - Connect own devices (scan QR)
   - Disconnect own devices
   - View own device status
   - Get QR code for pairing

2. Personal Messaging
   - Send text messages
   - Send media messages
   - Schedule messages
   - View chat history
   - View contact list
   - View daily chat list

3. Job Monitoring (Owned Devices)
   - View job status (own device jobs)
   - Cancel job (own device jobs)
   - Receive job notifications

4. Profile Management
   - View own profile
   - Update own profile
   - Change password

5. Real-time Updates
   - Subscribe to SSE events
   - Get device status updates
   - Receive message notifications
   - Get job progress updates

6. Bot Management (Owned Devices)
   - Enable/Disable bot
   - Configure business hours
   - Setup auto-reply rules for own devices
   - Monitor handoffs on own devices
   - View bot logs for own devices
```

### Authentication & Authorization Flow

#### **Token Generation & Verification**

```javascript
// 1. Login → Generate Token
POST /api/auth/login
Request: { email, password }
Response: {
  accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  refreshToken: "...",
  user: { id, username, email, role }
}

// Token Payload
{
  "id": 1,
  "username": "johndoe",
  "email": "john@example.com",
  "role": "user|admin",
  "iat": 1234567890,
  "exp": 1234654290
}

// 2. Request with Token
GET /api/whatsapp-multi-device/devices
Headers: { Authorization: "Bearer <accessToken>" }

// 3. Token Verification
Middleware: auth.js
- Extract token dari header
- Verify signature dengan JWT_SECRET
- Extract user info
- Attach req.user

// 4. Authorization Check
Middleware: authorize.js
- Cek req.user.role
- Enforce role-based access
- Return 403 jika unauthorized
```

#### **Request Authorization Flow**

```
Request with Token
        │
        ▼
┌─────────────────────────┐
│   auth.js Middleware    │  ← Verify JWT Token
│ - Extract token         │
│ - Verify signature      │  ✅ Token valid
│ - Attach req.user       │
└──────────────┬──────────┘
               │
               ▼
┌─────────────────────────┐
│ authorize.js Middleware │  ← Check Role
│ - requireAdmin()        │
│ - requireUser()         │  ✅ Role authorized
└──────────────┬──────────┘
               │
               ▼
┌─────────────────────────┐
│    Controller Handler   │  ← Process Request
│ - Extract parameters    │
│ - Validate ownership    │  ✅ Ownership valid
│ - Execute business      │
│   logic                 │
└──────────────┬──────────┘
               │
               ▼
        Response
```

#### **Ownership Validation**

```javascript
// Example: Connect Device (User/Admin)
// User hanya bisa connect device miliknya
// Admin bisa connect any device

async connectDevice(req, res) {
  const { deviceId } = req.params;
  const device = await getDevice(deviceId);

  // Ownership validation
  if (device.userId !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({
      message: "Anda tidak punya akses ke device ini"
    });
  }

  // Process request...
}

// Pattern Validation
┌─────────────────────────────────────────┐
│    Is User Admin?                       │
│         │                               │
│    Yes  │  No                           │
│         │  │                            │
│         │  ▼                            │
│         │  Is Resource Owner?          │
│         │  │                           │
│         │  Yes │  No                    │
│         │  │   │  │                    │
│         │  │   │  ▼                    │
│         │  │   │  403 Forbidden        │
│         │  │   │                       │
│         ▼  ▼   │                       │
│      Allow Access                      │
└─────────────────────────────────────────┘
```

#### **SSE Connection Authentication**

```javascript
// SSE Token dapat dikirim via:
// 1. Query parameter (untuk EventSource Web API)
GET /api/events?token=<accessToken>

// 2. Header Authorization (jika client support)
GET /api/events
Headers: { Authorization: "Bearer <accessToken>" }

// Verification di SSE Middleware
- Extract token dari query atau header
- Verify JWT token
- Setup SSE connection per user
- Subscribe ke user-specific events
- Cleanup saat disconnect
```

### Role Permission Implementation

#### **Middleware Authorization**

```javascript
// src/middleware/authorize.js

// Admin-only endpoint
const requireAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin only" });
  }
  next();
};

// User atau Admin
const requireUser = (req, res, next) => {
  if (!["user", "admin"].includes(req.user.role)) {
    return res.status(403).json({ message: "Unauthorized" });
  }
  next();
};

// Usage di Routes
router.post("/devices", requireAdmin, createDevice);
router.get("/devices", requireUser, listDevices);
```

#### **Controller Ownership Validation**

```javascript
// Pattern: Admin dapat akses semua, User hanya miliknya sendiri

async getDevice(req, res) {
  const { deviceId } = req.params;
  const device = await Device.findByDeviceId(deviceId);

  // Admin bypass, User harus owner
  const isAuthorized =
    req.user.role === "admin" ||
    device.userId === req.user.id;

  if (!isAuthorized) {
    return res.status(403).json({ message: "Access denied" });
  }

  res.json({ success: true, device });
}
```

---

## 📊 Current Implementation Status

### Sistem Status Saat Ini (Januari 2026)

#### ✅ Fitur yang Sudah Diimplementasi

**Core Features:**

- ✅ Multi-device architecture dengan Baileys integration
- ✅ Session management dengan auto-restore capability
- ✅ QR code generation dan pairing mechanism
- ✅ Device lifecycle management (create, connect, disconnect, delete)
- ✅ Complete messaging system (text, media, scheduled)

**Authentication & Authorization:**

- ✅ JWT-based authentication dengan access & refresh tokens
- ✅ Role-based access control (Admin & User)
- ✅ Ownership validation untuk resource management
- ✅ SSE authentication dengan token support

**Bulk Operations:**

- ✅ Job queue system untuk bulk messaging
- ✅ Async job processing dengan real-time progress tracking
- ✅ Job cancellation dengan graceful shutdown
- ✅ Error handling & retry mechanism

**Group Management:**

- ✅ Create, list, dan get group information
- ✅ Participant management (invite, kick)
- ✅ Admin management (promote, demote)
- ✅ Group messaging support
- ✅ Group media jobs (bulk)

**Chat & Contact:**

- ✅ Chat history retrieval per contact
- ✅ Daily chat list functionality
- ✅ Contact list management
- ✅ Message status tracking

**Real-time Features:**

- ✅ Server-Sent Events (SSE) untuk real-time updates
- ✅ Device status notifications
- ✅ QR code real-time delivery
- ✅ Job progress real-time updates
- ✅ Message status updates

**Admin Features:**

- ✅ User management (CRUD)
- ✅ Global device monitoring
- ✅ Message monitoring & filtering
- ✅ Job queue monitoring
- ✅ Global statistics & analytics
- ✅ System health monitoring

**Statistics & Analytics:**

- ✅ Daily activity tracking
- ✅ Message statistics (in/out)
- ✅ Active chats counting
- ✅ Response rate calculation
- ✅ Per-device statistics
- ✅ Global statistics dashboard

**Bot & Auto Reply:**

- ✅ Bot configuration per device
- ✅ Flexible auto-reply rules (keyword, regex, priority)
- ✅ Business hours management
- ✅ Handoff mechanism from bot to human agent

**Data Management:**

- ✅ Data export for Users, Devices, Messages, and Audit Logs
- ✅ Support for JSON and CSV formats
- ✅ Filtering options for data export

#### 🔄 Current API Endpoints

**Authentication (Public):**

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh-token` - Token refresh

**Device Management (User & Admin):**

- `GET /api/whatsapp-multi-device/devices` - List devices
- `GET /api/whatsapp-multi-device/devices/:deviceId` - Get device
- `POST /api/whatsapp-multi-device/devices/:deviceId/connect` - Connect device
- `DELETE /api/whatsapp-multi-device/devices/:deviceId/disconnect` - Disconnect device
- `GET /api/whatsapp-multi-device/devices/:deviceId/qr-image` - Get QR code

**Messaging (User & Admin):**

- `POST /api/whatsapp-multi-device/devices/:deviceId/send-message` - Send text
- `POST /api/whatsapp-multi-device/devices/:deviceId/send-media` - Send media
- `GET /api/whatsapp-multi-device/devices/:deviceId/chat-history/:jid` - Get chat history
- `GET /api/whatsapp-multi-device/devices/:deviceId/contacts` - List contacts

**Job Queue (Admin & User):**

- `POST /api/whatsapp-multi-device/devices/:deviceId/jobs/send-text` - Create bulk text job
- `POST /api/whatsapp-multi-device/devices/:deviceId/jobs/send-media` - Create bulk media job
- `GET /api/whatsapp-multi-device/jobs/:jobId` - Get job status
- `POST /api/whatsapp-multi-device/jobs/:jobId/cancel` - Cancel job

**Groups (Admin Only):**

- `GET /api/whatsapp-multi-device/devices/:deviceId/groups` - List groups
- `POST /api/whatsapp-multi-device/devices/:deviceId/groups` - Create group
- `GET /api/whatsapp-multi-device/devices/:deviceId/groups/:groupId/info` - Group info
- `POST /api/whatsapp-multi-device/devices/:deviceId/send-group-message` - Send group message

**Bot Management (User & Admin):**

- `GET /api/whatsapp-multi-device/devices/:deviceId/bot/config` - Get bot config
- `PUT /api/whatsapp-multi-device/devices/:deviceId/bot/config` - Update bot config
- `GET /api/whatsapp-multi-device/devices/:deviceId/bot/rules` - List bot rules
- `POST /api/whatsapp-multi-device/devices/:deviceId/bot/rules` - Create bot rule
- `PUT /api/whatsapp-multi-device/devices/:deviceId/bot/rules/:ruleId` - Update bot rule
- `DELETE /api/whatsapp-multi-device/devices/:deviceId/bot/rules/:ruleId` - Delete bot rule
- `GET /api/whatsapp-multi-device/devices/:deviceId/bot/handoffs` - List handoffs
- `POST /api/whatsapp-multi-device/devices/:deviceId/bot/handoffs/:contactJid/resume-bot` - Resume bot
- `GET /api/whatsapp-multi-device/devices/:deviceId/bot/logs` - Get bot logs

**Data Export (Admin Only):**

- `GET /api/export/users` - Export users
- `GET /api/export/devices` - Export devices
- `GET /api/export/messages` - Export messages
- `GET /api/export/audit-logs` - Export audit logs

**Admin (Admin Only):**

- `GET /api/admin/users` - List users
- `POST /api/admin/users` - Create user
- `GET /api/admin/devices` - List all devices
- `GET /api/admin/messages` - List all messages
- `GET /api/admin/stats` - Global statistics
- `POST /api/admin/jobs/:jobId/pause` - Pause job
- `POST /api/admin/jobs/:jobId/resume` - Resume job
- `POST /api/admin/jobs/:jobId/retry` - Retry job
- `GET /api/admin/logs` - Get audit logs

**Real-time (User & Admin):**

- `GET /api/events` - SSE connection untuk real-time events

#### 🎯 Role Implementation Matrix

**Admin Role:**

- Full system access
- All CRUD operations
- User management
- Device creation & global management
- Bulk messaging operations
- Global statistics
- System monitoring
- Full Bot Management (all devices)
- Data Export capabilities

**User Role:**

- Personal device management (owned only)
- Personal messaging operations
- Chat history access (owned devices)
- Job monitoring (owned device jobs)
- Profile management
- Real-time updates (owned devices)
- Personal Bot Management (owned devices)

#### 🔒 Security Implementation

**Authentication:**

- JWT tokens dengan 24-hour expiration
- Refresh token mechanism untuk extended sessions
- Secure password hashing dengan bcryptjs
- Token signature verification

**Authorization:**

- Middleware-based role checking
- Controller-level ownership validation
- Resource-level permission checks
- Admin bypass untuk special operations

**Input Validation:**

- Joi schemas untuk semua endpoints
- Request body validation
- Query parameter validation
- Path parameter validation

**Rate Limiting:**

- 100 requests per 15 minutes per IP
- Protection against abuse
- Configurable limits

#### 📈 Performance Optimizations

- Pagination untuk large datasets
- Message/job query optimization
- Connection pooling untuk database
- SSE efficient broadcasting
- Session storage optimization

### Dashboard Features

#### Admin Dashboard (`AdminLayout`)

```
┌─────────────────────────────────────────┐
│        ADMIN DASHBOARD                  │
├─────────────────────────────────────────┤
│ Dashboard:                              │
│  - System Overview                      │
│  - Total Users, Devices, Messages       │
│  - Online Devices Status                │
│  - Recent Activities Feed               │
│                                         │
│ User Management:                        │
│  - User List (CRUD)                     │
│  - User Details & Activity              │
│  - Assign Devices to Users              │
│  - Lock/Unlock Accounts                 │
│  - Reset User Passwords                 │
│                                         │
│ Device Management:                      │
│  - All Devices Overview                 │
│  - Connection Status Monitor            │
│  - Create/Delete Devices                │
│  - Device Settings                      │
│                                         │
│ Message Management:                     │
│  - All Messages View                    │
│  - Filter & Search                      │
│  - Message Status Tracking              │
│  - Bulk Operations                      │
│                                         │
│ Job Management:                         │
│  - Job Queue Overview                   │
│  - Job Progress Tracking                │
│  - Job History                          │
│  - Cancel/Pause/Resume/Retry Jobs       │
│                                         │
│ Bot Management:                         │
│  - Global Bot Configuration             │
│  - Auto Reply Rules Management          │
│  - Handoff Monitoring & Control         │
│  - Bot Logs Viewer                      │
│                                         │
│ Analytics & Reports:                    │
│  - Global Statistics                    │
│  - Usage Analytics                      │
│  - Activity Reports                     │
│  - Export Data (Users, Devices, Messages, Logs) │
│                                         │
│ Settings:                               │
│  - System Configuration                 │
│  - User Roles Management                │
│  - API Settings                         │
│  - Security Settings                    │
│                                         │
│ Audit Logs:                             │
│  - View Admin Action Logs               │
│  - Filter & Search Logs                 │
└─────────────────────────────────────────┘
```

#### User Dashboard (`UserLayout`)

```
┌─────────────────────────────────────────┐
│        USER DASHBOARD                   │
├─────────────────────────────────────────┤
│ Dashboard:                              │
│  - Device Status Overview               │
│  - Quick Actions                        │
│  - Recent Messages                      │
│                                         │
│ My Devices:                             │
│  - Device List                          │
│  - Connect New Device (QR Scan)         │
│  - Device Settings                      │
│  - Device Status                        │
│                                         │
│ Messaging:                              │
│  - Send Messages                        │
│  - Send Media                           │
│  - Message History                      │
│  - Contacts                             │
│                                         │
│ Chat History:                           │
│  - Contact Chats                        │
│  - Chat Details                         │
│  - Search Conversations                 │
│                                         │
│ Profile:                                │
│  - Profile Information                  │
│  - Change Password                      │
│  - Account Settings                     │
│                                         │
│ Bot Management:                         │
│  - Configuration (Hours, Greetings)     │
│  - Auto Reply Rules                     │
│  - Handoff Monitoring                   │
│  - Bot Logs                             │
│                                         │
│ Notifications:                          │
│  - Real-time Updates                    │
│  - Connection Status                    │
│  - New Messages Alert                   │
│  - Job Notifications                    │
└─────────────────────────────────────────┘
```

---

## �💻 Development

### Project Structure

Backend menggunakan arsitektur **MVC dengan Services Layer**:

```
Request → Routes → Middleware → Controllers → Services → Models → Database
                      ↓
                  SSE Events ← WhatsAppService ← Baileys Events
```

### Adding New Features

1. **Create Model** (if needed)

   - Add model file di `src/models/`
   - Register di `src/models/index.js`
   - Define associations
   - Create migration file

2. **Create Service** (if needed)

   - Add service file di `src/services/`
   - Implement business logic
   - Handle error cases

3. **Create Controller**

   - Add controller methods di `src/controllers/`
   - Handle request/response
   - Call services
   - Validate ownership (jika diperlukan)

4. **Create Routes**

   - Add routes di `src/routes/`
   - Apply middleware (auth, authorize, validation)
   - Register routes di `src/app.js`

5. **Add Validation**
   - Add schema di `src/utils/validation.js` (Joi)
   - Apply validation middleware

### Code Style

- Gunakan **async/await** untuk async operations
- **Error handling** dengan try/catch
- **Logging** dengan Winston logger
- **Validation** dengan Joi schemas
- **Consistent naming**: camelCase untuk variables/functions, PascalCase untuk classes

### Logging

Sistem menggunakan Winston untuk logging:

```javascript
const logger = require("./utils/logger");

logger.info("Info message");
logger.warn("Warning message");
logger.error("Error message", error);
```

Logs tersimpan di:

- `logs/combined.log` - Semua logs
- `logs/error.log` - Error logs only

### Testing

```bash
# Run tests (jika tersedia)
npm test
```

---

## 🚢 Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Set `AUTO_CREATE_TABLES=false`
- [ ] Configure database credentials (production DB)
- [ ] Set secure JWT secrets (min 32 characters, random)
- [ ] Configure CORS untuk frontend URL production
- [ ] Setup reverse proxy (nginx)
- [ ] Configure SSL/TLS certificates
- [ ] Setup process manager (PM2)
- [ ] Configure logging (file rotation)
- [ ] Setup database backup (automated)
- [ ] Configure environment variables securely
- [ ] Disable debug logging
- [ ] Setup monitoring & alerts

### Using PM2

```bash
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start src/server.js --name whatsapp-service

# Save process list
pm2 save

# Setup startup script
pm2 startup

# Monitor
pm2 monit

# View logs
pm2 logs whatsapp-service

# Restart
pm2 restart whatsapp-service

# Stop
pm2 stop whatsapp-service
```

### Using Docker

Proyek menggunakan Docker Compose untuk deployment:

```bash
# Build dan start containers
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop containers
docker-compose down

# Rebuild containers
docker-compose up -d --build
```

### Environment Setup untuk Production

File `.env` untuk production:

```env
NODE_ENV=production
PORT=5005

# Database (Production)
DB_HOST=production-db-host
DB_PORT=3306
DB_USER=production_user
DB_PASSWORD=secure_password
DB_NAME=whatsapp_service_prod

# JWT (Generate random secrets)
JWT_SECRET=<generate_random_32_char_min>
JWT_REFRESH_SECRET=<generate_random_32_char_min>
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Frontend URL (Production)
FRONTEND_URL=https://your-frontend-domain.com

# Auto create tables (DISABLED untuk production)
AUTO_CREATE_TABLES=false
```

### Nginx Configuration (Reverse Proxy)

Contoh konfigurasi Nginx:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:5005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # SSE support
        proxy_buffering off;
        proxy_cache off;
    }
}
```

### SSL/TLS Setup

Gunakan Let's Encrypt untuk SSL certificate:

```bash
sudo certbot --nginx -d api.yourdomain.com
```

---

## 📚 Dokumentasi Tambahan

### API Examples

#### 1. Register User

```bash
POST /api/auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "securepassword123",
  "fullName": "John Doe"
}
```

#### 2. Login

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepassword123"
}

# Response
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "johndoe",
      "email": "john@example.com",
      "role": "user"
    }
  }
}
```

#### 3. Create Device (Admin Only)

```bash
POST /api/whatsapp-multi-device/devices
Authorization: Bearer <token>
Content-Type: application/json

{
  "deviceName": "Device Utama"
}

# Response
{
  "success": true,
  "data": {
    "id": 1,
    "deviceId": "device-1-1234567890-12345",
    "deviceName": "Device Utama",
    "userId": 1,
    "status": "disconnected",
    "createdAt": "2024-12-26T10:00:00.000Z"
  }
}
```

#### 4. Connect Device (User/Admin - owned device)

```bash
POST /api/whatsapp-multi-device/devices/:deviceId/connect
Authorization: Bearer <token>

# Response
{
  "success": true,
  "data": {
    "status": "connecting",
    "qrCode": "data:image/png;base64,..."
  }
}

# SSE Event akan dikirim saat QR ready:
{
  "type": "qr-code",
  "deviceId": "device-1-1234567890-12345",
  "qrCode": "data:image/png;base64,..."
}
```

#### 5. Get QR Code Image (User/Admin - owned device)

```bash
GET /api/whatsapp-multi-device/devices/:deviceId/qr-image
Authorization: Bearer <token>

# Response: JSON (base64 data URL)
{
  "success": true,
  "data": {
    "deviceId": "device-1-1234567890-12345",
    "qrImage": "data:image/png;base64,...",
    "format": "png",
    "message": "QR Code sebagai image"
  }
}
```

#### 6. Send Message

```bash
POST /api/whatsapp-multi-device/devices/:deviceId/send-message
Authorization: Bearer <token>
Content-Type: application/json

{
  "phone": "6281234567890",
  "message": "Hello World"
}

# Response
{
  "success": true,
  "data": {
    "messageId": "3EB0123456789ABCDEF",
    "status": "sent",
    "timestamp": "2024-12-26T10:00:00.000Z"
  }
}
```

#### 7. Bulk Messaging (Admin Only)

```bash
POST /api/whatsapp-multi-device/devices/:deviceId/jobs/send-text
Authorization: Bearer <token>
Content-Type: application/json

{
  "messages": [
    { "to": "6281234567890", "message": "Pesan 1" },
    { "to": "6281234567891", "message": "Pesan 2" },
    { "to": "6281234567892", "message": "Pesan 3" }
  ],
  "delay": 3
}

# Response
{
  "success": true,
  "data": {
    "jobId": "job-1234567890",
    "status": "queued",
    "delaySec": 3,
    "total": 3
  }
}

# Check job status
GET /api/whatsapp-multi-device/jobs/job-1234567890
Authorization: Bearer <token>

# Response
{
  "success": true,
  "data": {
    "jobId": "job-1234567890",
    "status": "processing",
    "progress": {
      "total": 3,
      "completed": 1,
      "failed": 0,
      "pending": 2
    }
  }
}
```

#### 8. SSE Connection (Real-time Updates)

```javascript
// Frontend example
const eventSource = new EventSource(
  `http://localhost:5005/api/events?token=${token}`
);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log("Event:", data);

  switch (data.type) {
    case "connected":
      console.log("SSE Connected");
      break;
    case "whatsapp-status":
      console.log("WhatsApp Status:", data.data);
      break;
    case "qr-code":
      console.log("QR Code:", data.qr);
      // Display QR code
      break;
    case "message.status":
      console.log("Message Status Update:", data);
      break;
  }
};

eventSource.onerror = (error) => {
  console.error("SSE Error:", error);
  eventSource.close();
};
```

### Troubleshooting

#### Common Issues

1. **Database Connection Error**

   - ✅ Check database credentials di `.env`
   - ✅ Verify database sudah dibuat
   - ✅ Check MySQL service running
   - ✅ Check firewall/network connectivity

2. **Migration Errors**

   - ✅ Check database connection
   - ✅ Verify migration files syntax
   - ✅ Check for existing tables conflicts
   - ✅ Run migrations satu per satu untuk debug

3. **Session Not Restoring**

   - ✅ Check session files di `sessions/` directory
   - ✅ Verify deviceId di database matches session folder name
   - ✅ Check file permissions untuk session directory
   - ✅ Check logs untuk error messages

4. **Device Not Found**

   - ✅ Verify deviceId exists di database
   - ✅ Check user permissions (ownership)
   - ✅ Verify device belongs to user (untuk non-admin)

5. **JWT Token Invalid/Expired**

   - ✅ Check JWT_SECRET di `.env` matches
   - ✅ Verify token format (Bearer <token>)
   - ✅ Check token expiration
   - ✅ Try refresh token atau login ulang

6. **QR Code Not Generating**

   - ✅ Check device status (should be 'connecting')
   - ✅ Verify device connection process started
   - ✅ Check Baileys logs untuk errors
   - ✅ Try disconnect dan connect ulang

7. **Messages Not Sending**

   - ✅ Verify device status is 'connected'
   - ✅ Check phone number format (should include country code)
   - ✅ Verify device ownership
   - ✅ Check Baileys connection status

8. **SSE Connection Fails**
   - ✅ Verify token di query parameter
   - ✅ Check CORS configuration
   - ✅ Verify user authentication
   - ✅ Check browser console untuk errors

### Dokumentasi Tambahan

Informasi detail tentang role-based access control dan endpoint mapping dapat ditemukan di bagian [Role-Based Access Control](#-role-based-access-control) di atas.

---

## 🤝 Contributing

1. Fork repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📝 License

MIT License

---

## 👥 Authors

- Development Team

---

## 🙏 Acknowledgments

- [Baileys](https://github.com/WhiskeySockets/Baileys) - WhatsApp Web API library
- [Express.js](https://expressjs.com/) - Web framework
- [Sequelize](https://sequelize.org/) - ORM
- [Winston](https://github.com/winstonjs/winston) - Logging library

---

**Last Updated:** December 2024  
**Version:** 1.0.0
