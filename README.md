# Certificate Generator Backend

Backend untuk aplikasi generator sertifikat digital.

## Fitur
- Generate sertifikat digital berbasis gambar/template
- Penyimpanan data sertifikat menggunakan database (Prisma)
- Upload dan manajemen file sertifikat
- REST API untuk frontend

## Cara Menjalankan

1. Install dependencies:
   ```bash
   npm install
   ```

2. Jalankan migrasi database (jika menggunakan Prisma):
   ```bash
   npx prisma migrate deploy
   ```

3. Jalankan server:
   ```bash
   npm start
   ```

## Struktur Folder
- `src/controllers/` — Logic endpoint API
- `src/services/` — Layanan utama (generate sertifikat, dsb)
- `src/routes/` — Routing API
- `src/middleware/` — Middleware (upload, validasi)
- `assets/` — Template gambar & font
- `generated-certificates/` — Output sertifikat yang sudah dibuat
- `uploads/` — File upload dari user

## Konfigurasi
- Edit file `.env` untuk konfigurasi database dan variabel lain.

## Lisensi
MIT
