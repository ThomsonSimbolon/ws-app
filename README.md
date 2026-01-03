# WhatsApp Service - Multi-Device Architecture

Backend service untuk WhatsApp Business dengan dukungan multi-device menggunakan [Baileys](https://github.com/WhiskeySockets/Baileys).

## 📋 Daftar Isi

- [Overview](#overview)
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
- [API Documentation](#api-documentation)
- [Role-Based Access Control](#role-based-access-control)
- [Development](#development)
- [Deployment](#deployment)
- [Dokumentasi Tambahan](#dokumentasi-tambahan)

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
```

### 4. Bulk Messaging Flow (Job Queue)

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
  │                              │                    │                  │
  │── Close Connection ─────────→│                    │                  │
  │                              │── Remove ──────────→│                  │
  │                              │   Connection       │                  │
```

---

## ✨ Fitur

### Core Features

- ✅ **Multi-device Support**: Satu user dapat memiliki banyak device/akun WhatsApp
- ✅ **QR Code Authentication**: Scan QR code untuk connect device
- ✅ **Auto-restore Session**: Session otomatis di-restore saat server restart
- ✅ **Device Management**: Create, list, connect, disconnect, delete device
- ✅ **Role-Based Access**: Admin dan User dengan permission berbeda

### Messaging

- ✅ **Send Text Messages**: Kirim pesan teks ke kontak
- ✅ **Send Media Messages**: Kirim gambar, video, dokumen (placeholder)
- ✅ **Bulk Messaging**: Kirim pesan ke banyak kontak sekaligus
- ✅ **Job Queue**: Async processing dengan status tracking
- ✅ **Job Cancellation**: Cancel job yang sedang berjalan
- ✅ **Group Messaging**: Kirim pesan ke grup

### Group Management

- ✅ **List Groups**: Daftar semua grup WhatsApp
- ✅ **Create Group**: Buat grup baru
- ✅ **Get Group Info**: Info detail grup (participants, admins, etc.)
- ✅ **Send Group Messages**: Kirim pesan ke grup
- ✅ **Manage Participants**: Invite/Kick participants
- ✅ **Manage Admins**: Promote/Demote admins

### Chat History

- ✅ **Contact Chat History**: Riwayat chat dengan kontak
- ✅ **Group Chat History**: Riwayat chat grup
- ✅ **Daily Chat List**: Daftar chat per hari
- ✅ **Message Pagination**: Pagination untuk performa

### Statistics & Analytics

- ✅ **Daily Activity Tracking**: Tracking aktivitas harian
- ✅ **Messages Statistics**: Statistik pesan masuk/keluar
- ✅ **Active Chats Tracking**: Tracking chat aktif
- ✅ **Response Rate Calculation**: Perhitungan response rate
- ✅ **Device Statistics**: Statistik per device

### Admin Features

- ✅ **User Management**: CRUD operations untuk users
- ✅ **Device Management**: Monitor dan manage semua devices
- ✅ **Message Management**: Monitor semua messages
- ✅ **Global Statistics**: Statistik global sistem
- ✅ **Role Management**: Manage user roles

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
- **sequelize-cli** - Database migration tools

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
│   │   │   └── statisticsService.js    # Statistics calculation & tracking
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
│   │   └── 20241226000003-create-statistics-table.js
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
│   └── create-admin.js                 # Script untuk create admin user
│
├── frontend/                           # Frontend React application
│   └── ...
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
- Device Management: `listDevices()` (all devices)
- Message Management: `listMessages()` (all messages)
- Statistics: `getStats()` (global statistics)

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
   PORT=5000
   NODE_ENV=development
   FRONTEND_URL=http://localhost:3000

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

Server akan berjalan di `http://localhost:5000`

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
| `PORT`                   | Server port                       | `5000`                  | ❌       |
| `FRONTEND_URL`           | Frontend URL untuk CORS           | `http://localhost:3000` | ❌       |
| `NODE_ENV`               | Environment mode                  | `development`           | ❌       |
| `AUTO_CREATE_TABLES`     | Auto create tables on startup     | `true`                  | ❌       |

### Konfigurasi CORS

CORS dikonfigurasi di `src/app.js` untuk mengizinkan request dari frontend. Default:

- `http://localhost:3000`
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

### Auto Table Creation

Jika `AUTO_CREATE_TABLES=true` di `.env`, server akan otomatis membuat tabel yang belum ada saat startup. Fitur ini berguna untuk development, tapi **tidak direkomendasikan untuk production**.

Untuk production, set `AUTO_CREATE_TABLES=false` dan gunakan migrations.

---

## 🏃 Menjalankan Server

### Development Mode

```bash
cd backend
npm run dev
```

Server akan berjalan di `http://localhost:5000` dengan auto-reload menggunakan nodemon.

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
curl http://localhost:5000/api/health
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
http://localhost:5000/api
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

#### 4a. Contacts (`/api/whatsapp-multi-device/devices/:deviceId`)

| Method | Endpoint    | Description           | Auth | Role       |
| ------ | ----------- | --------------------- | ---- | ---------- |
| GET    | `/contacts` | Get contacts (device) | ✅   | User/Admin |

#### 5. Bulk Messaging (`/api/whatsapp-multi-device`)

| Method | Endpoint                             | Description           | Auth | Role       |
| ------ | ------------------------------------ | --------------------- | ---- | ---------- |
| POST   | `/devices/:deviceId/jobs/send-text`  | Create bulk text job  | ✅   | Admin      |
| POST   | `/devices/:deviceId/jobs/send-media` | Create bulk media job | ✅   | Admin      |
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
| GET    | `/group-chat-history/:groupId` | Get group chat history         | ✅   | User/Admin |
| GET    | `/daily-chat-list`             | Get daily chat list            | ✅   | User/Admin |

#### 8. Statistics (`/api/whatsapp-multi-device/devices/:deviceId/statistics`)

| Method | Endpoint            | Description                        | Auth | Role  |
| ------ | ------------------- | ---------------------------------- | ---- | ----- |
| GET    | `/statistics`       | Get statistics (dengan date range) | ✅   | Admin |
| GET    | `/statistics/daily` | Get daily activity                 | ✅   | Admin |

#### 9. Real-time Events (`/api/events`)

| Method | Endpoint | Description                            | Auth | Role       |
| ------ | -------- | -------------------------------------- | ---- | ---------- |
| GET    | `/`      | SSE connection untuk real-time updates | ✅   | User/Admin |

#### 10. Admin Endpoints (`/api/admin`)

| Method | Endpoint              | Description                                      | Auth | Role  |
| ------ | --------------------- | ------------------------------------------------ | ---- | ----- |
| GET    | `/users`              | List semua users (dengan pagination & filter)    | ✅   | Admin |
| POST   | `/users`              | Create user baru                                 | ✅   | Admin |
| GET    | `/users/:userId`      | Get user details                                 | ✅   | Admin |
| PUT    | `/users/:userId`      | Update user                                      | ✅   | Admin |
| DELETE | `/users/:userId`      | Delete user                                      | ✅   | Admin |
| GET    | `/devices`            | List semua devices (dengan pagination & filter)  | ✅   | Admin |
| GET    | `/messages`           | List semua messages (dengan pagination & filter) | ✅   | Admin |
| GET    | `/groups`             | List semua groups                                | ✅   | Admin |
| GET    | `/contacts`           | List semua contacts                              | ✅   | Admin |
| GET    | `/jobs`               | List semua jobs                                  | ✅   | Admin |
| GET    | `/jobs/:jobId`        | Get job detail                                   | ✅   | Admin |
| POST   | `/jobs/:jobId/cancel` | Cancel job (admin)                               | ✅   | Admin |
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

### Role Hierarchy

Sistem memiliki 2 role utama:

1. **Admin** - Full access ke semua fitur
2. **User** - Limited access, hanya bisa akses resource miliknya sendiri

### Permission Matrix

| Feature                  | Admin | User | Notes                                  |
| ------------------------ | ----- | ---- | -------------------------------------- |
| Create Device            | ✅    | ❌   | Hanya admin yang bisa create device    |
| Connect Device           | ✅    | ✅   | User hanya untuk device miliknya       |
| Disconnect Device        | ✅    | ✅   | User hanya untuk device miliknya       |
| Delete Device            | ✅    | ❌   | Hanya admin yang bisa delete           |
| View QR Code             | ✅    | ✅   | User hanya untuk device miliknya       |
| List Devices             | ✅    | ✅   | User hanya lihat device miliknya       |
| Send Message             | ✅    | ✅   | Ownership validation                   |
| Schedule Message         | ✅    | ✅   | Ownership validation                   |
| Bulk Messaging           | ✅    | ❌   | Hanya admin yang bisa bulk messaging   |
| Group Management         | ✅    | ❌   | Hanya admin yang bisa manage groups    |
| Chat History             | ✅    | ✅   | Ownership validation                   |
| Statistics               | ✅    | ❌   | Hanya admin yang bisa lihat statistics |
| User Management          | ✅    | ❌   | Hanya admin                            |
| Device Management (All)  | ✅    | ❌   | Hanya admin                            |
| Message Management (All) | ✅    | ❌   | Hanya admin                            |

### Flow per Role (Implementasi Saat Ini)

#### Admin

1. Login → masuk ke dashboard admin (UI menggunakan `AdminLayout`).
2. Create device via `POST /api/whatsapp-multi-device/devices`.

- Bisa set `userId` untuk membuat device milik user lain.
- `deviceId` opsional (server akan generate jika tidak dikirim).

3. Monitoring & management via endpoint admin:

- Users/devices/messages/groups/contacts/jobs/stats di `/api/admin/*`.

4. Bulk messaging hanya admin:

- `POST /api/whatsapp-multi-device/devices/:deviceId/jobs/send-text`
- `POST /api/whatsapp-multi-device/devices/:deviceId/jobs/send-media`
- Group media job: `POST /api/whatsapp-multi-device/devices/:deviceId/groups/:groupId/jobs/send-media`

#### User

1. Login → masuk ke dashboard user (UI menggunakan `UserLayout`).
2. List device miliknya: `GET /api/whatsapp-multi-device/devices`.
3. Connect & pairing untuk device miliknya:

- `POST /api/whatsapp-multi-device/devices/:deviceId/connect`
- Ambil QR: `GET /api/whatsapp-multi-device/devices/:deviceId/qr` atau `.../qr-image`

4. Operasi yang user bisa lakukan pada device miliknya:

- Send message/media, chat history, list contacts, schedule message.

5. Job queue:

- User dapat melihat status & cancel job milik device-nya (`GET /jobs/:jobId`, `POST /jobs/:jobId/cancel`)
- User tidak dapat membuat job bulk (endpoint create job admin-only).

### Ownership Validation

Untuk endpoint yang bisa diakses oleh User dan Admin:

- **User**: Hanya bisa akses resource miliknya sendiri (validasi ownership)
- **Admin**: Bisa akses semua resource (bypass ownership)

Contoh validasi di controller:

```javascript
if (device.userId !== req.user.id && req.user.role !== "admin") {
  return res.status(403).json({ message: "Access denied" });
}
```

### Authentication Flow

1. User login → dapat JWT token
2. Token di-verify oleh middleware `auth.js`
3. User info di-attach ke `req.user`
4. Authorization middleware (`authorize.js`) cek role
5. Controller cek ownership (jika diperlukan)

Untuk detail lengkap tentang role dan permission, lihat bagian [Permission Matrix](#permission-matrix) di atas.

---

## 💻 Development

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
PORT=5000

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
        proxy_pass http://localhost:5000;
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
  `http://localhost:5000/api/events?token=${token}`
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
