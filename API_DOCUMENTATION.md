# 📚 Dokumentasi API WhatsApp Multi-Device

## 📋 Daftar Isi

1. [Pendahuluan](#pendahuluan)
2. [Base URL](#base-url)
3. [Format Response](#format-response)
4. [Error Handling](#error-handling)
5. [Device Management](#device-management)
6. [Koneksi Device](#koneksi-device)
7. [Pengiriman Pesan](#pengiriman-pesan)
8. [Pengiriman Media](#pengiriman-media)
9. [Grup Management](#grup-management)
10. [Chat History](#chat-history)
11. [Job Queue (Async Operations)](#job-queue-async-operations)
12. [Kontak Management](#kontak-management)
13. [Analytics & Reporting](#analytics--reporting)

---

## Pendahuluan

API WhatsApp Multi-Device memungkinkan Anda untuk mengelola multiple device WhatsApp secara bersamaan melalui REST API. Setiap device memiliki ID unik dan dapat dikoneksikan secara independen.

### Fitur Utama

- ✅ Multi-device support
- ✅ QR Code & Pairing Code authentication
- ✅ Pengiriman pesan teks & media (single & bulk)
- ✅ Grup management
- ✅ Chat history & analytics
- ✅ Async job queue untuk operasi bulk
- ✅ Contact management
- ✅ Real-time status monitoring

---

## Format Response

### Success Response

```json
{
  "success": true,
  "message": "Pesan sukses",
  "data": { ... },
  "timestamp": "2024-01-01 12:00:00"
}
```

### Error Response

```json
{
  "success": false,
  "message": "Pesan error",
  "error": "Detail error"
}
```

---

## Error Handling

### Status Code

- `200` - Success
- `201` - Created
- `202` - Accepted (untuk async jobs)
- `400` - Bad Request
- `404` - Not Found
- `500` - Internal Server Error

### Error Messages

Semua error response mengikuti format standar dengan pesan dalam bahasa Indonesia.

---

## Device Management

### 1. Membuat Device Baru

**Endpoint:** `POST /devices`

**Request Body:**
```json
{
  "deviceId": "device-001",
  "deviceName": "Device Utama" // optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Device berhasil dibuat",
  "data": {
    "success": true,
    "deviceId": "device-001",
    "deviceName": "Device Utama",
    "message": "Device berhasil dibuat"
  },
  "timestamp": "2024-01-01 12:00:00"
}
```

**Validasi:**
- `deviceId` wajib diisi (3-50 karakter)
- Format: hanya huruf, angka, underscore, dan dash

---

### 2. Mendapatkan Daftar Semua Device

**Endpoint:** `GET /devices`

**Response:**
```json
{
  "success": true,
  "data": {
    "devices": [
      {
        "deviceId": "device-001",
        "deviceName": "Device Utama",
        "status": "connected",
        "isConnected": true,
        "phoneNumber": "6281234567890",
        "createdAt": "2024-01-01 10:00:00",
        "lastActivity": "2024-01-01 12:00:00",
        "connectionAttempts": 1
      }
    ],
    "stats": {
      "total": 1,
      "connected": 1,
      "disconnected": 0,
      "withPhoneNumber": 1,
      "createdToday": 1
    }
  },
  "timestamp": "2024-01-01 12:00:00"
}
```

---

### 3. Mendapatkan Device yang Terkoneksi

**Endpoint:** `GET /devices/connected`

**Alias:** `GET /devices/connected/detail`

**Response:**
```json
{
  "success": true,
  "data": {
    "devices": [
      {
        "deviceId": "device-001",
        "deviceName": "Device Utama",
        "isConnected": true,
        "phoneNumber": "6281234567890",
        "createdAt": "2024-01-01 10:00:00",
        "lastActivity": "2024-01-01 12:00:00",
        "connectionAttempts": 1
      }
    ],
    "total": 1
  },
  "timestamp": "2024-01-01 12:00:00"
}
```

---

### 4. Mendapatkan Info Device Tertentu

**Endpoint:** `GET /devices/:deviceId`

**Response:**
```json
{
  "success": true,
  "data": {
    "deviceId": "device-001",
    "deviceName": "Device Utama",
    "status": "connected",
    "createdAt": "2024-01-01 10:00:00",
    "lastActivity": "2024-01-01 12:00:00",
    "isConnected": true,
    "phoneNumber": "6281234567890",
    "connectionAttempts": 1
  },
  "timestamp": "2024-01-01 12:00:00"
}
```

---

### 5. Menghapus Device

**Endpoint:** `DELETE /devices/:deviceId`

**Response:**
```json
{
  "success": true,
  "message": "Device device-001 berhasil dihapus",
  "data": {
    "success": true,
    "message": "Device device-001 berhasil dihapus"
  },
  "timestamp": "2024-01-01 12:00:00"
}
```

---

## Koneksi Device

### 1. Koneksi Device

**Endpoint:** `POST /devices/:deviceId/connect`

**Response:**
```json
{
  "success": true,
  "message": "Device device-001 berhasil dikoneksikan",
  "data": {
    "status": "connecting",
    "qrCode": "QR_CODE_STRING"
  },
  "timestamp": "2024-01-01 12:00:00"
}
```

---

### 2. Generate Pairing Code

**Endpoint:** `POST /devices/:deviceId/pairing-code`

**Request Body:**
```json
{
  "phone": "6281234567890"
}
```

**Validasi:**
- Format nomor: `+62`, `62`, atau `0` diikuti 8-13 digit

**Response:**
```json
{
  "success": true,
  "message": "Pairing code berhasil dibuat",
  "data": {
    "pairingCode": "123456",
    "expiresIn": 60
  },
  "timestamp": "2024-01-01 12:00:00"
}
```

---

### 3. Mendapatkan Status Device

**Endpoint:** `GET /devices/:deviceId/status`

**Response:**
```json
{
  "success": true,
  "data": {
    "deviceId": "device-001",
    "deviceName": "Device Utama",
    "isConnected": true,
    "phoneNumber": "6281234567890",
    "connectionAttempts": 1,
    "createdAt": "2024-01-01 10:00:00",
    "lastActivity": "2024-01-01 12:00:00"
  },
  "timestamp": "2024-01-01 12:00:00"
}
```

---

### 4. Mendapatkan QR Code

**Endpoint:** `GET /devices/:deviceId/qr`

**Response:**
```json
{
  "success": true,
  "data": {
    "deviceId": "device-001",
    "qrCode": "QR_CODE_STRING",
    "message": "Scan QR Code ini dengan WhatsApp untuk terhubung"
  },
  "timestamp": "2024-01-01 12:00:00"
}
```

---

### 5. Mendapatkan QR Code sebagai Image

**Endpoint:** `GET /devices/:deviceId/qr-image`

**Query Parameters:**
- `format` (optional): `png` atau `svg` (default: `png`)

**Response (PNG):**
```json
{
  "success": true,
  "data": {
    "deviceId": "device-001",
    "qrImage": "data:image/png;base64,iVBORw0KG...",
    "format": "png",
    "message": "QR Code sebagai image"
  },
  "timestamp": "2024-01-01 12:00:00"
}
```

**Response (SVG):** Mengembalikan SVG langsung dengan `Content-Type: image/svg+xml`

**Alias:** `GET /devices/:deviceId/qr-base64`

---

### 6. Disconnect Device

**Endpoint:** `DELETE /devices/:deviceId/disconnect`

**Response:**
```json
{
  "success": true,
  "message": "Device device-001 berhasil diputuskan",
  "data": {
    "success": true,
    "message": "Device disconnected"
  },
  "timestamp": "2024-01-01 12:00:00"
}
```

---

### 7. Cancel Connection & Wipe Session

**Endpoint:** `POST /devices/:deviceId/cancel-and-wipe`

**Alias:** `DELETE /devices/:deviceId/session`

**Response:**
```json
{
  "success": true,
  "message": "Koneksi dibatalkan dan data session dihapus",
  "data": {
    "success": true,
    "message": "Session wiped"
  },
  "timestamp": "2024-01-01 12:00:00"
}
```

---

## Pengiriman Pesan

### 1. Mengirim Pesan (Single)

**Endpoint:** `POST /devices/:deviceId/send-message`

**Request Body:**
```json
{
  "to": "6281234567890",
  "message": "Halo, ini pesan test"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Pesan berhasil dikirim",
  "data": {
    "deviceId": "device-001",
    "messageId": "3EB0C767F26DEE6C",
    "timestamp": "2024-01-01T12:00:00.000Z",
    "to": "6281234567890"
  }
}
```

---

### 2. Mengirim Pesan (Bulk)

**Endpoint:** `POST /devices/:deviceId/send-message`

**Request Body:**
```json
{
  "messages": [
    {
      "to": "6281234567890",
      "message": "Pesan 1"
    },
    {
      "to": "6281234567891",
      "message": "Pesan 2"
    }
  ],
  "delay": 3 // optional, delay dalam detik antar pesan (default: random 2-5 detik)
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bulk kirim selesai. 2 berhasil, 0 gagal",
  "data": {
    "total": 2,
    "successCount": 2,
    "errorCount": 0,
    "results": [
      {
        "to": "6281234567890",
        "status": "success",
        "messageId": "3EB0C767F26DEE6C",
        "timestamp": "2024-01-01T12:00:00.000Z"
      },
      {
        "to": "6281234567891",
        "status": "success",
        "messageId": "3EB0C767F26DEE7D",
        "timestamp": "2024-01-01T12:00:03.000Z"
      }
    ]
  }
}
```

**Validasi:**
- `to` dan `message` wajib diisi
- Format nomor: `+62`, `62`, atau `0` diikuti 9-13 digit
- Maksimal panjang pesan: 4096 karakter

---

## Pengiriman Media

### 1. Mengirim Media (Single)

**Endpoint:** `POST /devices/:deviceId/send-media`

**Request Body (Form Data):**
```
to: 6281234567890
mediaType: image
caption: Ini caption (optional)
file: [FILE_UPLOAD]
```

**Atau dengan Base64:**
```json
{
  "to": "6281234567890",
  "mediaType": "image",
  "caption": "Ini caption",
  "base64": "data:image/png;base64,iVBORw0KG..."
}
```

**Atau dengan URL:**
```json
{
  "to": "6281234567890",
  "mediaType": "image",
  "caption": "Ini caption",
  "url": "https://example.com/image.png"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Media berhasil dikirim",
  "data": {
    "deviceId": "device-001",
    "messageId": "3EB0C767F26DEE6C",
    "timestamp": "2024-01-01T12:00:00.000Z",
    "to": "6281234567890"
  }
}
```

**Media Types:**
- `image` - Gambar (JPEG, PNG, GIF)
- `video` - Video (MP4, AVI)
- `document` - Dokumen (PDF, DOC)

**File Upload:**
- Maksimal ukuran: 16MB
- Tipe file yang didukung: JPEG, PNG, GIF, MP4, AVI, PDF, DOC

---

### 2. Mengirim Media (Bulk)

**Endpoint:** `POST /devices/:deviceId/send-media`

**Request Body (Form Data):**
```
items: [{"to": "6281234567890", "mediaType": "image", "caption": "Caption 1", "base64": "..."}, {"to": "6281234567891", "mediaType": "image", "url": "https://..."}]
delay: 3
file: [FILE_UPLOAD] // optional, jika menggunakan file upload
```

**Atau JSON:**
```json
{
  "items": [
    {
      "to": "6281234567890",
      "mediaType": "image",
      "caption": "Caption 1",
      "base64": "data:image/png;base64,..."
    },
    {
      "to": "6281234567891",
      "mediaType": "image",
      "url": "https://example.com/image.png",
      "caption": "Caption 2"
    }
  ],
  "delay": 3
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bulk kirim media selesai. 2 berhasil, 0 gagal",
  "data": {
    "total": 2,
    "successCount": 2,
    "errorCount": 0,
    "results": [
      {
        "to": "6281234567890",
        "status": "success",
        "messageId": "3EB0C767F26DEE6C",
        "timestamp": "2024-01-01T12:00:00.000Z"
      },
      {
        "to": "6281234567891",
        "status": "success",
        "messageId": "3EB0C767F26DEE7D",
        "timestamp": "2024-01-01T12:00:03.000Z"
      }
    ]
  }
}
```

**Item Options:**
- `to` - Nomor tujuan (wajib)
- `mediaType` - Tipe media: `image`, `video`, `document` (wajib)
- `caption` - Caption media (optional)
- `base64` - Base64 encoded media (optional)
- `url` - URL media (optional)
- `fileIndex` - Index file dari upload (optional)
- `fileField` - Field name dari upload (optional)
- `mimetype` - MIME type (optional)
- `fileName` - Nama file (optional)

---

## Grup Management

### 1. Mendapatkan Daftar Grup

**Endpoint:** `GET /devices/:deviceId/groups`

**Response:**
```json
{
  "success": true,
  "data": {
    "deviceId": "device-001",
    "groups": [
      {
        "id": "120363123456789012@g.us",
        "subject": "Grup Test",
        "participants": ["6281234567890@s.whatsapp.net"],
        "creation": 1640995200,
        "owner": "6281234567890@s.whatsapp.net"
      }
    ],
    "total": 1
  },
  "timestamp": "2024-01-01 12:00:00"
}
```

---

### 2. Membuat Grup

**Endpoint:** `POST /devices/:deviceId/groups`

**Request Body:**
```json
{
  "subject": "Grup Baru",
  "participants": ["6281234567890", "6281234567891"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Grup berhasil dibuat",
  "data": {
    "groupId": "120363123456789012@g.us",
    "subject": "Grup Baru",
    "participants": ["6281234567890", "6281234567891"],
    "totalParticipants": 2
  },
  "timestamp": "2024-01-01 12:00:00"
}
```

---

### 3. Mengirim Pesan ke Grup (Single)

**Endpoint:** `POST /devices/:deviceId/send-group-message`

**Request Body:**
```json
{
  "groupId": "120363123456789012@g.us",
  "message": "Halo semua!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Pesan grup berhasil dikirim",
  "data": {
    "groupId": "120363123456789012@g.us",
    "messageId": "3EB0C767F26DEE6C",
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

---

### 4. Mengirim Pesan ke Grup (Bulk)

**Endpoint:** `POST /devices/:deviceId/send-group-message`

**Request Body:**
```json
{
  "items": [
    {
      "groupId": "120363123456789012@g.us",
      "message": "Pesan 1"
    },
    {
      "groupId": "120363123456789013@g.us",
      "message": "Pesan 2"
    }
  ],
  "delay": 3
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bulk kirim pesan grup selesai. 2 berhasil, 0 gagal",
  "data": {
    "total": 2,
    "successCount": 2,
    "errorCount": 0,
    "results": [
      {
        "groupId": "120363123456789012@g.us",
        "status": "success",
        "messageId": "3EB0C767F26DEE6C",
        "timestamp": "2024-01-01T12:00:00.000Z"
      }
    ]
  }
}
```

---

### 5. Mengirim Pesan Mention ke Grup

**Endpoint:** `POST /devices/:deviceId/groups/:groupId/mention-message`

**Request Body:**
```json
{
  "message": "Halo {m1} dan {m2}!",
  "mentions": ["6281234567890@s.whatsapp.net", "6281234567891@s.whatsapp.net"]
}
```

**Placeholder Format:**
- `{m1}`, `{m2}`, ... - 1-based index
- `{mention1}`, `{mention2}`, ... - 1-based index
- `{mention[0]}`, `{mention[1]}`, ... - 0-based index
- `{mentions}` - Semua mentions

**Response:**
```json
{
  "success": true,
  "message": "Pesan mention grup berhasil dikirim",
  "data": {
    "messageId": "3EB0C767F26DEE6C",
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

---

### 6. Mengirim Media ke Grup (Single)

**Endpoint:** `POST /devices/:deviceId/groups/:groupId/send-media`

**Request Body:** Sama seperti send-media single, tapi tanpa `to` parameter

**Response:**
```json
{
  "success": true,
  "message": "Media berhasil dikirim ke grup",
  "data": {
    "deviceId": "device-001",
    "groupId": "120363123456789012@g.us",
    "messageId": "3EB0C767F26DEE6C",
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

---

### 7. Mengirim Media ke Grup (Bulk)

**Endpoint:** `POST /devices/:deviceId/groups/:groupId/send-media`

**Request Body:**
```json
{
  "items": [
    {
      "groupId": "120363123456789012@g.us",
      "mediaType": "image",
      "caption": "Caption 1",
      "base64": "data:image/png;base64,..."
    },
    {
      "groupId": "120363123456789013@g.us",
      "mediaType": "image",
      "url": "https://example.com/image.png"
    }
  ],
  "delay": 3
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bulk kirim media grup selesai. 2 berhasil, 0 gagal",
  "data": {
    "total": 2,
    "successCount": 2,
    "errorCount": 0,
    "results": [
      {
        "groupId": "120363123456789012@g.us",
        "status": "success",
        "messageId": "3EB0C767F26DEE6C",
        "timestamp": "2024-01-01T12:00:00.000Z"
      }
    ]
  }
}
```

---

### 8. Menambahkan Participant ke Grup

**Endpoint:** `POST /devices/:deviceId/groups/:groupId/participants`

**Request Body:**
```json
{
  "participants": ["6281234567890", "6281234567891"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Participants berhasil diundang",
  "data": {
    "success": true,
    "added": ["6281234567890@s.whatsapp.net", "6281234567891@s.whatsapp.net"]
  },
  "timestamp": "2024-01-01 12:00:00"
}
```

---

### 9. Menghapus Participant dari Grup

**Endpoint:** `DELETE /devices/:deviceId/groups/:groupId/participants/:participantJid`

**Response:**
```json
{
  "success": true,
  "message": "Participant berhasil dihapus",
  "data": {
    "success": true,
    "removed": "6281234567890@s.whatsapp.net"
  },
  "timestamp": "2024-01-01 12:00:00"
}
```

---

### 10. Menambahkan Admin Grup

**Endpoint:** `POST /devices/:deviceId/groups/:groupId/admins`

**Request Body (Single):**
```json
{
  "adminJid": "6281234567890@s.whatsapp.net"
}
```

**Request Body (Batch):**
```json
{
  "participants": ["6281234567890@s.whatsapp.net", "6281234567891@s.whatsapp.net"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Admin berhasil ditambahkan",
  "data": {
    "success": true,
    "promoted": ["6281234567890@s.whatsapp.net"]
  },
  "timestamp": "2024-01-01 12:00:00"
}
```

---

### 11. Menghapus Admin Grup

**Endpoint:** `DELETE /devices/:deviceId/groups/:groupId/admins/:adminJid`

**Response:**
```json
{
  "success": true,
  "message": "Admin berhasil dihapus",
  "data": {
    "success": true,
    "demoted": "6281234567890@s.whatsapp.net"
  },
  "timestamp": "2024-01-01 12:00:00"
}
```

---

### 12. Mendapatkan Info Grup

**Endpoint:** `GET /devices/:deviceId/groups/:groupId/info`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "120363123456789012@g.us",
    "subject": "Grup Test",
    "creation": 1640995200,
    "owner": "6281234567890@s.whatsapp.net",
    "participants": [
      {
        "id": "6281234567890@s.whatsapp.net",
        "isAdmin": true,
        "isSuperAdmin": true
      }
    ],
    "description": "Deskripsi grup"
  },
  "timestamp": "2024-01-01 12:00:00"
}
```

---

## Chat History

### 1. Mendapatkan Chat History Kontak

**Endpoint:** `GET /devices/:deviceId/chat-history/:jid`

**Query Parameters:**
- `limit` (optional): Jumlah pesan (1-100, default: 50)
- `before` (optional): Message ID untuk pagination
- `source` (optional): `auto`, `store`, atau `whatsapp` (default: `auto`)
- `waitSeconds` (optional): Waktu tunggu dalam detik (default: 10)

**Response:**
```json
{
  "success": true,
  "message": "Chat history berhasil diambil langsung dari WhatsApp",
  "data": {
    "jid": "6281234567890@s.whatsapp.net",
    "messages": [
      {
        "id": "3EB0C767F26DEE6C",
        "from": "6281234567890@s.whatsapp.net",
        "fromMe": false,
        "messageType": "conversation",
        "content": {
          "text": "Halo"
        },
        "timestamp": 1640995200000
      }
    ],
    "total": 1,
    "hasMore": false
  },
  "timestamp": "2024-01-01 12:00:00"
}
```

---

### 2. Mendapatkan Chat History Grup

**Endpoint:** `GET /devices/:deviceId/group-chat-history/:groupId`

**Query Parameters:** Sama seperti chat-history kontak

**Response:**
```json
{
  "success": true,
  "message": "Chat history grup berhasil diambil langsung dari WhatsApp",
  "data": {
    "groupId": "120363123456789012@g.us",
    "messages": [
      {
        "id": "3EB0C767F26DEE6C",
        "from": "6281234567890@s.whatsapp.net",
        "fromMe": false,
        "messageType": "conversation",
        "content": {
          "text": "Halo semua"
        },
        "timestamp": 1640995200000
      }
    ],
    "total": 1,
    "hasMore": false
  },
  "timestamp": "2024-01-01 12:00:00"
}
```

---

### 3. Mendapatkan Daily Chat List

**Endpoint:** `GET /devices/:deviceId/daily-chat-list`

**Query Parameters:**
- `date` (required): Format `YYYY-MM-DD`
- `includeGroups` (optional): `true` atau `false` (default: `false`)
- `limit` (optional): 1-1000 (default: 100)
- `offset` (optional): Default: 0

**Response:**
```json
{
  "success": true,
  "message": "Daftar chat harian berhasil diambil langsung dari WhatsApp",
  "data": {
    "contacts": [
      {
        "jid": "6281234567890@s.whatsapp.net",
        "name": "John Doe",
        "phoneNumber": "6281234567890",
        "messageCount": 10,
        "incomingMessages": 5,
        "outgoingMessages": 5,
        "unreadMessages": 2,
        "lastActivity": "2024-01-01T12:00:00.000Z",
        "responseRate": 80
      }
    ],
    "summary": {
      "date": "2024-01-01",
      "totalContacts": 1,
      "individualContacts": 1,
      "groupContacts": 0,
      "totalMessages": 10,
      "totalIncomingMessages": 5,
      "totalOutgoingMessages": 5,
      "totalUnreadMessages": 2,
      "averageResponseRate": 80
    },
    "pagination": {
      "total": 1,
      "limit": 100,
      "offset": 0,
      "hasMore": false
    }
  },
  "timestamp": "2024-01-01 12:00:00"
}
```

---

## Job Queue (Async Operations)

Job Queue digunakan untuk operasi bulk yang membutuhkan waktu lama, menghindari timeout pada request.

### 1. Enqueue Bulk Text

**Endpoint:** `POST /devices/:deviceId/jobs/send-text`

**Request Body:**
```json
{
  "messages": [
    {
      "to": "6281234567890",
      "message": "Pesan 1"
    },
    {
      "to": "6281234567891",
      "message": "Pesan 2"
    }
  ],
  "delay": 3 // optional, delay dalam detik
}
```

**Response:**
```json
{
  "success": true,
  "message": "Job pengiriman teks dibuat",
  "data": {
    "jobId": "send-text-bulk_1640995200000_abc123",
    "status": "queued",
    "delaySec": 3,
    "total": 2
  },
  "timestamp": "2024-01-01 12:00:00"
}
```

---

### 2. Enqueue Bulk Media ke Kontak

**Endpoint:** `POST /devices/:deviceId/jobs/send-media`

**Request Body:**
```json
{
  "items": [
    {
      "to": "6281234567890",
      "mediaType": "image",
      "caption": "Caption 1",
      "base64": "data:image/png;base64,..."
    },
    {
      "to": "6281234567891",
      "mediaType": "image",
      "url": "https://example.com/image.png"
    }
  ],
  "delay": 3
}
```

**Response:**
```json
{
  "success": true,
  "message": "Job pengiriman media (kontak) dibuat",
  "data": {
    "jobId": "send-media-bulk-contact_1640995200000_abc123",
    "status": "queued",
    "delaySec": 3,
    "total": 2
  },
  "timestamp": "2024-01-01 12:00:00"
}
```

---

### 3. Enqueue Bulk Media ke Grup

**Endpoint:** `POST /devices/:deviceId/groups/:groupId/jobs/send-media`

**Request Body:**
```json
{
  "items": [
    {
      "base64": "data:image/png;base64,...",
      "caption": "Caption 1"
    },
    {
      "url": "https://example.com/image.png",
      "caption": "Caption 2"
    }
  ],
  "mediaType": "image",
  "caption": "Default caption",
  "delay": 3
}
```

**Response:**
```json
{
  "success": true,
  "message": "Job pengiriman media (grup) dibuat",
  "data": {
    "jobId": "send-media-bulk-group_1640995200000_abc123",
    "status": "queued",
    "delaySec": 3,
    "total": 2
  },
  "timestamp": "2024-01-01 12:00:00"
}
```

---

### 4. Mendapatkan Status Job

**Endpoint:** `GET /jobs/:jobId`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "send-text-bulk_1640995200000_abc123",
    "type": "send-text-bulk",
    "deviceId": "device-001",
    "status": "completed",
    "createdAt": "2024-01-01 12:00:00",
    "startedAt": "2024-01-01 12:00:01",
    "finishedAt": "2024-01-01 12:00:10",
    "progress": {
      "total": 2,
      "currentIndex": 2,
      "successCount": 2,
      "errorCount": 0
    },
    "results": [
      {
        "to": "6281234567890",
        "status": "success",
        "messageId": "3EB0C767F26DEE6C",
        "timestamp": "2024-01-01T12:00:02.000Z"
      },
      {
        "to": "6281234567891",
        "status": "success",
        "messageId": "3EB0C767F26DEE7D",
        "timestamp": "2024-01-01T12:00:05.000Z"
      }
    ],
    "options": {
      "delaySec": 3
    }
  },
  "timestamp": "2024-01-01 12:00:00"
}
```

**Job Status:**
- `queued` - Job dalam antrian
- `processing` - Job sedang diproses
- `completed` - Job selesai
- `failed` - Job gagal
- `cancelled` - Job dibatalkan

---

### 5. Membatalkan Job

**Endpoint:** `POST /jobs/:jobId/cancel`

**Response:**
```json
{
  "success": true,
  "message": "Job dibatalkan",
  "data": {
    "id": "send-text-bulk_1640995200000_abc123",
    "status": "cancelled",
    "cancelled": true
  }
}
```

---

## Kontak Management

### 1. Mendapatkan Daftar Kontak

**Endpoint:** `GET /devices/:deviceId/contacts`

**Response:**
```json
{
  "success": true,
  "data": {
    "deviceId": "device-001",
    "contacts": [
      {
        "id": "6281234567890@s.whatsapp.net",
        "name": "John Doe",
        "notify": "John",
        "verifiedName": "John Doe"
      }
    ],
    "total": 1
  },
  "timestamp": "2024-01-01 12:00:00"
}
```

---

## Scheduled Message

### 1. Menjadwalkan Pesan

**Endpoint:** `POST /devices/:deviceId/schedule-message`

**Request Body:**
```json
{
  "to": "6281234567890",
  "message": "Pesan terjadwal",
  "scheduleTime": "2024-01-01 15:00:00",
  "timezone": "Asia/Jakarta"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Pesan berhasil dijadwalkan",
  "data": {
    "scheduledMessageId": "sched_1640995200000_abc123",
    "scheduleTime": "2024-01-01 15:00:00",
    "timezone": "Asia/Jakarta",
    "delaySeconds": 10800
  },
  "timestamp": "2024-01-01 12:00:00"
}
```

---

## Contoh Penggunaan

### Contoh 1: Membuat Device dan Mengirim Pesan

```bash
# 1. Buat device
curl -X POST http://localhost:4000/api/whatsapp-multi-device/devices \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "device-001",
    "deviceName": "Device Utama"
  }'

# 2. Koneksikan device
curl -X POST http://localhost:4000/api/whatsapp-multi-device/devices/device-001/connect

# 3. Dapatkan QR Code
curl http://localhost:4000/api/whatsapp-multi-device/devices/device-001/qr

# 4. Setelah terhubung, kirim pesan
curl -X POST http://localhost:4000/api/whatsapp-multi-device/devices/device-001/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "to": "6281234567890",
    "message": "Halo, ini pesan test"
  }'
```

### Contoh 2: Bulk Send dengan Job Queue

```bash
# 1. Buat job bulk text
curl -X POST http://localhost:4000/api/whatsapp-multi-device/devices/device-001/jobs/send-text \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"to": "6281234567890", "message": "Pesan 1"},
      {"to": "6281234567891", "message": "Pesan 2"}
    ],
    "delay": 3
  }'

# Response: {"success": true, "data": {"jobId": "send-text-bulk_..."}}

# 2. Cek status job
curl http://localhost:4000/api/whatsapp-multi-device/jobs/send-text-bulk_...

# 3. Jika perlu, batalkan job
curl -X POST http://localhost:4000/api/whatsapp-multi-device/jobs/send-text-bulk_.../cancel
```

### Contoh 3: Mengirim Media dengan Base64

```bash
curl -X POST http://localhost:4000/api/whatsapp-multi-device/devices/device-001/send-media \
  -H "Content-Type: application/json" \
  -d '{
    "to": "6281234567890",
    "mediaType": "image",
    "caption": "Ini gambar",
    "base64": "data:image/png;base64,iVBORw0KGgoAAAANS..."
  }'
```

### Contoh 4: Grup Management

```bash
# 1. Buat grup
curl -X POST http://localhost:4000/api/whatsapp-multi-device/devices/device-001/groups \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Grup Test",
    "participants": ["6281234567890", "6281234567891"]
  }'

# 2. Kirim pesan ke grup
curl -X POST http://localhost:4000/api/whatsapp-multi-device/devices/device-001/send-group-message \
  -H "Content-Type: application/json" \
  -d '{
    "groupId": "120363123456789012@g.us",
    "message": "Halo semua!"
  }'

# 3. Tambah participant
curl -X POST http://localhost:4000/api/whatsapp-multi-device/devices/device-001/groups/120363123456789012@g.us/participants \
  -H "Content-Type: application/json" \
  -d '{
    "participants": ["6281234567892"]
  }'
```

---

## Catatan Penting

### Format Nomor Telepon

Format nomor yang didukung:
- `+6281234567890`
- `6281234567890`
- `081234567890`

Format akan dinormalisasi secara otomatis.

### Rate Limiting

Untuk menghindari spam detection:
- Gunakan delay minimal 2-5 detik untuk bulk operations
- Job queue secara otomatis menambahkan delay antar item
- Default delay adalah random 2-5 detik jika tidak ditentukan

### File Upload

- Maksimal ukuran file: 16MB
- Tipe file yang didukung:
  - Image: JPEG, PNG, GIF
  - Video: MP4, AVI
  - Document: PDF, DOC

### Session Management

- Session disimpan di folder `sessions/`
- Format: `auth_info_baileys_{deviceId}`
- Session akan otomatis di-restore saat server restart
- Gunakan endpoint `cancel-and-wipe` untuk menghapus session

### Error Handling

Semua error mengembalikan response dengan format:
```json
{
  "success": false,
  "message": "Pesan error dalam bahasa Indonesia",
  "error": "Detail error (optional)"
}
```

### Timezone

Semua timestamp menggunakan timezone `Asia/Jakarta` (WIB).

---

## Support & Kontak

Untuk pertanyaan atau bantuan, silakan hubungi tim development.

---

**Versi Dokumentasi:** 1.0.0  
**Last Updated:** 2024-01-01

