# 📱 WhatsApp Services Dashboard

Dashboard dan API untuk mengelola beberapa akun WhatsApp (multi-device) menggunakan Baileys. Repository ini berisi:

1. **API operasional WhatsApp (real-time)** via Baileys: koneksi device, QR/pairing, kirim pesan/media, manajemen grup, chat history.
2. **API data (legacy/DB)**: statistik pesan, history terfilter, allowed numbers, chatbot config, dsb.

> Catatan: Baileys menggunakan WhatsApp Web. Pastikan penggunaan Anda sesuai kebijakan/ketentuan WhatsApp.

---

## 📋 Daftar Isi

- [Ringkasan Arsitektur](#-ringkasan-arsitektur)
- [Quickstart](#-quickstart)
- [Konfigurasi](#-konfigurasi)
- [Konsep & State Penting](#-konsep--state-penting)
- [Flow End-to-End](#-flow-end-to-end)
- [API Reference (Multi Device)](#-api-reference-multi-device)
- [API Reference (Legacy / Database)](#-api-reference-legacy--database)
- [Persistensi Chat ke Database (Allowed Numbers)](#-persistensi-chat-ke-database-allowed-numbers)
- [Job Queue (Bulk, Async)](#-job-queue-bulk-async)
- [Scheduled Message](#-scheduled-message)
- [Troubleshooting](#-troubleshooting)
- [Docker Deployment](#-docker-deployment)

---

## 🧱 Ringkasan Arsitektur

### Komponen Utama

- **Express App**: entrypoint di `index.js`.
- **Multi-device WhatsApp runtime**:
  - `services/device_manager.js`: registry device, lifecycle, auto-restore session.
  - `services/whatsapp_services.js`: wrapper Baileys per device.
  - `services/job_queue_service.js`: antrian job FIFO untuk bulk messaging.
- **Database layer**: `config/database.js` + `models/*` (history/messages/sessions/tokens/allowed_numbers/chatbots, dll).

### Base URL

- Multi-device (operasional Baileys): `GET/POST/DELETE /api/whatsapp-multi-device/...`
- Legacy (data/DB): `GET/POST/PUT/DELETE /api/whatsapp/...`
- Auth session + token: `GET/POST/PUT/DELETE /api/auth/...`

### Auto-restore saat server start

Saat server berjalan, sistem otomatis memindai folder `sessions/` untuk menemukan folder `auth_info_baileys_{deviceId}` lalu mencoba menyambungkan kembali semua device tersebut.

---

## 🚀 Quickstart

### Prasyarat

- Node.js v20+
- MySQL/MariaDB (dibutuhkan untuk fitur dashboard/DB, dan untuk fitur persist history yang bersyarat)

### Instalasi

```bash
npm install
```

### Environment

Buat file `.env` di root project:

```env
# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=whatsapp_dashboard
DB_PORT=3306

# Server
DASHBOARD_PORT=4000
SESSION_SECRET=your-secret-key-here

# External Services (opsional untuk dashboard)
API_AIRABOT=http://localhost:5000
WEBSOCKET_URL=ws://localhost:3000
WS_URL=ws://localhost:3000

# WhatsApp Configuration
WA_PRINT_QR_TERMINAL=false
WA_INITIAL_SYNC_WAIT_MS=120000
WA_CONNECT_TIMEOUT_MS=120000
WA_QUERY_TIMEOUT_MS=120000
WA_KEEPALIVE_INTERVAL_MS=30000
```

### Folder runtime

Buat folder berikut (jika belum ada):

```bash
mkdir sessions logs
```

### Menjalankan aplikasi

```bash
npm run dev
```

Server default: `http://localhost:4000`

---

## ⚙️ Konfigurasi

### Environment variables utama

| Variable                   | Fungsi                                  | Catatan                   |
| -------------------------- | --------------------------------------- | ------------------------- |
| `DASHBOARD_PORT`           | Port HTTP server                        | default 4000              |
| `SESSION_SECRET`           | Secret cookie session dashboard         | wajib diset di production |
| `WA_PRINT_QR_TERMINAL`     | Print QR di terminal                    | default `false`           |
| `WA_INITIAL_SYNC_WAIT_MS`  | Durasi tunggu sinkronisasi awal history | default 120000 ms         |
| `WA_CONNECT_TIMEOUT_MS`    | Timeout koneksi socket                  | default 120000 ms         |
| `WA_QUERY_TIMEOUT_MS`      | Timeout query Baileys                   | default 120000 ms         |
| `WA_KEEPALIVE_INTERVAL_MS` | Interval keep-alive socket              | default 30000 ms          |

### Persistensi session & store

- Kredensial device disimpan per device di folder:
  - `sessions/auth_info_baileys_{deviceId}/`
- Store chat in-memory ditulis berkala tiap 30 detik ke file:
  - `sessions/baileys_store_{deviceId}.json`

---

## 🧠 Konsep & State Penting

### Device ID

- `deviceId` adalah identifier unik per device.
- Validasi:
  - Panjang 3–50 karakter.
  - Hanya huruf/angka/underscore/dash (`^[a-zA-Z0-9_-]+$`).

### State yang umum dijumpai

Di `DeviceManager`, tiap device punya `deviceInfo.status` (nilai bisa berubah tergantung operasi):

- `created`: device dibuat tapi belum connect
- `connecting`: proses connect berjalan
- `pairing`: sedang generate pairing code
- `disconnected`: sudah disconnect
- `cancelled`: dibatalkan + session dihapus
- `error`: error saat operasi connect

Selain status, field penting:

- `isConnected`: true/false
- `qrCode`: string QR (hanya muncul ketika butuh scan)
- `phoneNumber`: nomor WhatsApp yang terhubung (akan terisi setelah `connection=open`)
- `connectionAttempts`: counter reconnect (maksimal 3 untuk auto-reconnect internal)

### Kondisi koneksi & reconnect

Di `WhatsAppService`:

- Saat `connection.update`:
  - `qr` ada → `qrCode` tersedia (device menunggu autentikasi)
  - `connection=open` → `isConnected=true`, `qrCode=null`, `phoneNumber` diisi
  - `connection=close` → jika **bukan** `loggedOut` dan belum melewati `maxReconnectAttempts` → reconnect otomatis setelah 5 detik
- Jika device di-`cancel-and-wipe` → flag `cancelled=true` sehingga connect/reconnect ditahan.

---

## 🔄 Flow End-to-End

Bagian ini merangkum tahapan + kondisi yang terjadi (sesuai implementasi).

### 1) Flow: Create → Connect → QR Scan → Connected

1. Buat device
2. Jalankan connect
3. Jika belum ada kredensial terdaftar → event akan menghasilkan `qrCode`
4. Client ambil QR (`/qr`, `/qr-image`) lalu scan lewat WhatsApp
5. Setelah scan berhasil → `connection=open` → device `isConnected=true`

Kondisi penting:

- Jika QR belum tersedia: endpoint `/qr` akan error "QR Code tidak tersedia".
- QR bisa berubah; selalu fetch yang terbaru jika scan gagal.

### 2) Flow: Pairing Code (tanpa QR)

1. Buat device
2. Panggil endpoint pairing dengan `phone`
3. Sistem meminta pairing code dari Baileys (mode mobile)
4. Client memasukkan pairing code pada WhatsApp (Linked devices)
5. Setelah sukses, device dapat di-connect seperti biasa

Kondisi penting:

- Jika kredensial sudah `registered` → akan ditolak (harus logout/wipe dulu untuk pairing ulang).
- Implementasi retry: saat error bertipe "closed" akan retry beberapa kali.

### 3) Flow: Auto-Restore saat Startup

Saat server start:

1. Scan `sessions/` mencari folder `auth_info_baileys_{deviceId}`
2. Untuk tiap deviceId:
   - `createDevice(deviceId)` (jika belum ada di memory)
   - `connectDevice(deviceId)` (jika autoConnect true)
3. Di antara koneksi, ada jeda kecil (500ms) untuk menghindari burst

Kondisi penting:

- Jika session folder ada tapi kredensial invalid/expired → connect bisa gagal dan akan dicatat di log.
- Jika ingin reset total: gunakan endpoint `cancel-and-wipe`.

### 4) Flow: Send Message / Media (Sync)

- Endpoint sync (`send-message`, `send-media`) menjalankan pengiriman langsung di request yang sama.
- Untuk payload besar atau banyak target, disarankan pakai job queue (lihat bagian Job Queue).

Kondisi penting:

- Jika device belum connect → error "WhatsApp tidak terhubung".
- Validasi nomor menggunakan pola Indonesia: `^(\+62|62|0)[0-9]{9,13}$`.
- Upload media dibatasi 16MB dan mimetype tertentu.

### 5) Flow: Chat History (Contact/Group)

- Endpoint history mencoba ambil pesan dengan strategi:
  - `source=server`: coba `socket.fetchMessages` (jika tersedia)
  - `source=store`: ambil dari in-memory store
  - `source=auto` (default): coba server dulu, lalu fallback store

Kondisi penting:

- Ada `waitSeconds` untuk memberi waktu sync awal.
- Jika data store belum lengkap, hasil bisa parsial.

---

## 🔌 API Reference (Multi Device)

Base path: `/api/whatsapp-multi-device`

### Pola response umum

- Berhasil:

```json
{
  "success": true,
  "message": "...",
  "data": {},
  "timestamp": "YYYY-MM-DD HH:mm:ss"
}
```

- Gagal validasi biasanya `400`, not found `404`, error internal `500`.

### A. Device Lifecycle

#### 1) Create device

`POST /devices`

Body:

```json
{ "deviceId": "device-001", "deviceName": "Device Utama" }
```

Kondisi:

- `deviceId` wajib, 3–50 karakter, hanya `a-zA-Z0-9_-`.

#### 2) List devices

`GET /devices`

Mengembalikan daftar device di memory + statistik ringkas.

#### 3) List connected devices

`GET /devices/connected`

Alias detail:

- `GET /devices/connected/detail`

#### 4) Get device info

`GET /devices/:deviceId`

#### 5) Get live status

`GET /devices/:deviceId/status`

Mengembalikan `isConnected`, `qrCode` (jika ada), `connectionAttempts`, `phoneNumber` (jika sudah open).

#### 6) Connect device

`POST /devices/:deviceId/connect`

Flow:

- Jika session valid → open tanpa QR
- Jika session belum ada → QR akan muncul (poll lewat endpoint QR)

#### 7) Disconnect device

`DELETE /devices/:deviceId/disconnect`

Catatan:

- Ini melakukan logout Baileys dan memutus koneksi.
- Session file bisa tetap ada; gunakan wipe jika ingin reset.

#### 8) Cancel & wipe session

`POST /devices/:deviceId/cancel-and-wipe`

Alias:

- `DELETE /devices/:deviceId/session`

Efek:

- Menghentikan koneksi/reconnect
- Menghapus `sessions/auth_info_baileys_{deviceId}/`
- Menghapus `sessions/baileys_store_{deviceId}.json` (jika ada)

#### 9) Remove device (hapus dari memory)

`DELETE /devices/:deviceId`

### B. QR & Pairing

#### 1) QR string

`GET /devices/:deviceId/qr`

Kondisi:

- Jika QR belum tersedia → error.

#### 2) QR image

`GET /devices/:deviceId/qr-image?format=png|svg`

Kondisi:

- `format=svg` → response adalah SVG (Content-Type `image/svg+xml`).
- `format=png` (default) → response JSON berisi data URL (`data:image/png;base64,...`).

Alias:

- `GET /devices/:deviceId/qr-base64` (alias handler yang sama)

#### 3) Pairing code

`POST /devices/:deviceId/pairing-code`

Body:

```json
{ "phone": "6281234567890" }
```

Kondisi:

- Nomor dinormalisasi dan diverifikasi.
- Jika sudah terhubung/registered → ditolak (wajib wipe jika ingin pairing ulang).

### C. Messaging (Contact)

#### 1) Send text (single)

`POST /devices/:deviceId/send-message`

Body:

```json
{ "to": "6281234567890", "message": "Halo" }
```

Kondisi:

- `message` maksimal 4096 karakter.

#### 2) Send text (bulk sync)

`POST /devices/:deviceId/send-message`

Body:

```json
{
  "messages": [
    { "to": "628123...", "message": "Pesan 1" },
    { "to": "628123...", "message": "Pesan 2" }
  ],
  "delay": 3
}
```

Catatan:

- `delay` dalam **detik**.
- Jika `delay` tidak diisi → default random 2–5 detik.

#### 3) Send media (single)

`POST /devices/:deviceId/send-media`

Mendukung salah satu cara:

- Upload file (multipart)
- `base64`
- `url`

Body fields:

- `to` (wajib)
- `mediaType` (wajib): `image` | `video` | `document`
- `caption` (opsional)
- `file` (multipart, opsional)
- `base64` (opsional)
- `url` (opsional)

Validasi upload:

- Maksimum 16MB
- Mimetype yang diizinkan: `image/jpeg`, `image/png`, `image/gif`, `video/mp4`, `video/avi`, `application/pdf`, `application/msword`

#### 4) Send media (bulk sync)

`POST /devices/:deviceId/send-media`

Body:

```json
{
  "items": [
    {
      "to": "628123...",
      "mediaType": "image",
      "url": "https://...",
      "caption": "..."
    },
    {
      "to": "628123...",
      "mediaType": "document",
      "base64": "...",
      "fileName": "a.pdf",
      "mimetype": "application/pdf"
    }
  ],
  "delay": 2
}
```

### D. Group

#### 1) List groups

`GET /devices/:deviceId/groups`

#### 2) Create group

`POST /devices/:deviceId/groups`

Body:

```json
{ "subject": "Nama Grup", "participants": ["628123...", "628124..."] }
```

#### 3) Group info

`GET /devices/:deviceId/groups/:groupId/info`

#### 4) Send group message (single)

`POST /devices/:deviceId/send-group-message`

Body:

```json
{ "groupId": "1203...@g.us", "message": "Halo semua" }
```

#### 5) Send group message (bulk)

`POST /devices/:deviceId/send-group-message`

Body:

```json
{
  "items": [
    { "groupId": "1203...@g.us", "message": "Halo 1" },
    { "groupId": "1203...@g.us", "message": "Halo 2" }
  ],
  "delay": 3
}
```

#### 6) Mention message

`POST /devices/:deviceId/groups/:groupId/mention-message`

Body:

```json
{
  "message": "Halo {m1} dan {m2}",
  "mentions": ["628123...", "628124..."]
}
```

Catatan:

- Placeholder yang didukung di message termasuk `{m1}` `{mention1}` `{mention[0]}` dan `{mentions}` (lihat controller).

#### 7) Send group media

`POST /devices/:deviceId/groups/:groupId/send-media`

Mendukung `file` / `base64` / `url` dan juga mode bulk `items` (mirip media kontak).

#### 8) Invite participants (bulk)

`POST /devices/:deviceId/groups/:groupId/participants`

Body:

```json
{ "participants": ["628123...", "628124..."] }
```

#### 9) Kick participant

`DELETE /devices/:deviceId/groups/:groupId/participants/:participantJid`

`participantJid` boleh berupa nomor atau JID.

#### 10) Promote admin

`POST /devices/:deviceId/groups/:groupId/admins`

Body (mode single yang benar-benar promote):

```json
{ "adminJid": "6281234567890" }
```

Catatan implementasi:

- Route juga menerima `participants` array, namun pada implementasi saat ini jalurnya mengarah ke handler invite participants.

#### 11) Demote admin

`DELETE /devices/:deviceId/groups/:groupId/admins/:adminJid`

### E. Chat History & Daily Chat List

#### 1) Contact chat history

`GET /devices/:deviceId/chat-history/:jid?limit=50&before=<messageId>&source=auto&waitSeconds=10`

Query:

- `limit`: 1–100
- `before`: cursor messageId (opsional)
- `source`: `auto` | `server` | `store`
- `waitSeconds`: durasi tunggu sinkronisasi awal

#### 2) Group chat history

`GET /devices/:deviceId/group-chat-history/:groupId?limit=50&before=<messageId>&source=auto&waitSeconds=10`

#### 3) Daily chat list

`GET /devices/:deviceId/daily-chat-list?date=YYYY-MM-DD&includeGroups=false&limit=100&offset=0`

Query:

- `date` wajib `YYYY-MM-DD`
- `includeGroups` default false
- `limit`: 1–1000
- `offset` >= 0

---

## 🔌 API Reference (Legacy / Database)

Base path: `/api/whatsapp`

Bagian ini berisi endpoint yang membaca/menulis data ke database (bukan operasi koneksi Baileys real-time). Cocok untuk dashboard reporting.

### Sessions & stats

- `GET /sessions/:id`
- `GET /sessions/user/:id`
- `PUT /sessions/:id/keterangan`
- `GET /message/stats?session_id=...&date=...`
- `GET /message/details?session_id=...&date=...&page=1&pageSize=10`

### Groups & messages

- `GET /groups/links/:session_id`
- `GET /messages/by-number/:whatsapp_number?date=...&page=1&pageSize=10`
- `GET /history/filtered?receiver_number=...&sender_number=...&start_date=...&end_date=...&page=1&pageSize=10`
- `GET /conversation/:phone1/:phone2?start_date=...&end_date=...&order=asc|desc`
- `GET /messages/number/:phone_number?start_date=...&end_date=...&page=1&pageSize=...&order=asc|desc`
- `GET /messages/number/:phone_number/mapping?start_date=...&end_date=...&page=1&pageSize=...`
- `GET /messages/number/:phone_number/contacts?start_date=...&end_date=...&page=1&pageSize=10`

### Allowed numbers (kontrol persist history)

- `GET /allowed-numbers?whatsapp_number=...`
- `POST /allowed-numbers` (body: `whatsapp_number`, `status`, `session_id`)
- `PUT /allowed-numbers/:id/status` (body: `status`)
- `DELETE /allowed-numbers/:id`

### Chatbots

- `GET /chatbots?whatsapp_number=...`
- `POST /chatbots` (body: `sender_number`, `status`, `session_id`)
- `PUT /chatbots/:id/status` (body: `status`)
- `DELETE /chatbots/:id`
- `PUT /chatbots/:whatsapp_number/endpoint` (body: `endpoint_url`)

---

## 💾 Persistensi Chat ke Database (Allowed Numbers)

Pada runtime multi-device, event pesan (`messages.upsert`) memanggil penyimpanan history ke database **hanya jika** nomor WhatsApp device termasuk "diizinkan".

Aturan (sesuai implementasi):

- Sistem mengambil nomor device yang sedang terhubung.
- Query `AllowedNumberModel.getAllowedNumbersByWhatsappNumber(deviceNumber)`.
- Jika ada record dengan `status` bernilai `aktif` → persist diaktifkan.
- Jika gagal cek izin → fail-safe: **tidak menyimpan**.
- Ada dedup sederhana berdasarkan `messageId` untuk mencegah double-save.

---

## 🔄 Job Queue (Bulk, Async)

Bulk async digunakan untuk menghindari timeout HTTP saat mengirim ratusan pesan.

### Konsep

- Job disimpan di memory (Map) dan diproses FIFO.
- Status job:
  - `queued` → `processing` → `completed` / `failed` / `cancelled`
- Progress:
  - `total`, `currentIndex`, `successCount`, `errorCount`

### Endpoint

- Buat job bulk text:
  - `POST /api/whatsapp-multi-device/devices/:deviceId/jobs/send-text`
- Buat job bulk media kontak:
  - `POST /api/whatsapp-multi-device/devices/:deviceId/jobs/send-media`
- Buat job bulk media grup:
  - `POST /api/whatsapp-multi-device/devices/:deviceId/groups/:groupId/jobs/send-media`
- Cek status:
  - `GET /api/whatsapp-multi-device/jobs/:jobId`
- Cancel:
  - `POST /api/whatsapp-multi-device/jobs/:jobId/cancel`

Catatan penting:

- Untuk endpoint async media, sumber media yang aman adalah `url` atau `base64` (karena worker berjalan di proses yang sama tapi payload file upload tidak selalu praktis diserialisasi).
- Delay default per item: random 2–5 detik jika tidak ditentukan.

---

## ⏰ Scheduled Message

Endpoint:

- `POST /api/whatsapp-multi-device/devices/:deviceId/schedule-message`

Body:

```json
{
  "to": "628123...",
  "message": "Halo",
  "scheduleTime": "2026-01-01 12:00:00",
  "timezone": "Asia/Jakarta"
}
```

Batasan implementasi saat ini:

- Scheduling dilakukan dengan `setTimeout` di memory.
- Jika server restart sebelum jadwal, jadwal **hilang** (tidak dipersist ke database).

---

## 🔧 Troubleshooting

### Device tidak terhubung setelah restart

Checklist:

1. Pastikan folder `sessions/auth_info_baileys_{deviceId}/` ada.
2. Cek log server untuk detail error.
3. Coba manual connect: `POST /api/whatsapp-multi-device/devices/:deviceId/connect`.
4. Jika kredensial expired, lakukan wipe dan scan ulang: `POST /api/whatsapp-multi-device/devices/:deviceId/cancel-and-wipe`.

### QR tidak tersedia / tidak muncul

- QR hanya tersedia saat Baileys meminta autentikasi.
- Jalankan `connect` dulu, lalu poll:
  - `GET /api/whatsapp-multi-device/devices/:deviceId/qr`
  - atau `GET /api/whatsapp-multi-device/devices/:deviceId/qr-image`

### Pesan gagal terkirim

1. Pastikan `GET /api/whatsapp-multi-device/devices/:deviceId/status` → `isConnected=true`.
2. Pastikan format nomor sesuai regex Indonesia.
3. Untuk banyak target, gunakan job queue.

### Bulk job lambat / timeout

- Itu normal bila delay besar (anti-spam).
- Cek status job via `GET /api/whatsapp-multi-device/jobs/:jobId`.

---

## 🐳 Docker Deployment

### Build

```bash
docker build -t whatsapp-dashboard .
```

### Run

```bash
docker run -d \
   --name whatsapp-dashboard \
   -p 4000:4000 \
   -e DASHBOARD_PORT=4000 \
   -e SESSION_SECRET=your-secret \
   -e DB_HOST=mysql_host \
   -e DB_USER=root \
   -e DB_PASSWORD=password \
   -e DB_NAME=whatsapp_dashboard \
   -v $(pwd)/sessions:/app/sessions \
   -v $(pwd)/logs:/app/logs \
   whatsapp-dashboard
```

---

## 📚 Dokumentasi Tambahan

- [API Restore Session](./API_RESTORE_SESSION.md)
