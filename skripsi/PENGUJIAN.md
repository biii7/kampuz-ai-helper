# Dokumen Pengujian Sistem
## Single Gateway — Chatbot Pelayanan Keluhan & Informasi Kampus UIN Alauddin Makassar

---

## 1. Tujuan Pengujian

Memastikan sistem berfungsi sesuai kebutuhan fungsional, akurasi klasifikasi AI dapat diukur, dan tingkat penerimaan pengguna (mahasiswa & admin) memadai untuk digunakan di lingkungan kampus.

## 2. Metode Pengujian

| No | Metode | Tujuan | Subjek Uji |
|----|--------|--------|------------|
| 1 | **Black-Box Testing** | Validasi fungsi sistem tanpa melihat kode internal | Fitur utama (chat, tiket, forwarding, admin) |
| 2 | **Confusion Matrix** | Mengukur akurasi klasifikasi kategori & deteksi intent oleh Gemini 1.5 Flash | Modul NLP `process-complaint` |
| 3 | **System Usability Scale (SUS)** | Mengukur kepuasan & kemudahan penggunaan | Mahasiswa & Admin |
| 4 | **User Acceptance Testing (UAT)** | Validasi kesesuaian sistem dengan kebutuhan pengguna akhir | Admin Primer & Sub-admin |

---

## 3. Black-Box Testing

### 3.1 Skenario Pengujian Mahasiswa (User)

| ID | Skenario | Input | Output Diharapkan | Hasil (✓/✗) |
|----|----------|-------|-------------------|--------------|
| BB-01 | Submit keluhan fasilitas | "AC ruang 301 rusak", NIM 60200121xxx | Tiket dibuat, kategori `fasilitas`, status `pending` | |
| BB-02 | Submit pertanyaan informasi (RAG) | "Bagaimana cara mengurus cuti akademik?" | Bot menjawab dari dokumen kampus | |
| BB-03 | NER mengekstrak NIM & lokasi | "Saya Ani NIM 60200121001, AC di Gedung A rusak" | NIM, lokasi, subjek terekstrak otomatis | |
| BB-04 | Deteksi intent `keluhan` vs `informasi` | Variasi 10 kalimat | Klasifikasi benar ≥ 90% | |
| BB-05 | Sentiment-aware response | "Saya sangat kecewa!" | Bot merespons empatik + sound effect sesuai | |
| BB-06 | Lihat riwayat tiket (publik) | Buka halaman riwayat | List kosong (sesuai kebijakan keamanan baru) | |
| BB-07 | Submit tanpa NIM | Pesan tanpa NIM | Bot meminta NIM | |

### 3.2 Skenario Pengujian Admin

| ID | Skenario | Input | Output Diharapkan | Hasil (✓/✗) |
|----|----------|-------|-------------------|--------------|
| BB-10 | Login admin | Email & password admin | Berhasil masuk dashboard | |
| BB-11 | Lihat daftar tiket | Buka menu Tiket | Semua tiket tampil | |
| BB-12 | Ubah status tiket → `selesai` | Klik update status | Status berubah, history tersimpan | |
| BB-13 | Auto-forward aktif | Toggle ON, masuk tiket baru | Tiket langsung diteruskan via WA/Email | |
| BB-14 | Auto-forward nonaktif | Toggle OFF, klik manual forward | Tiket diteruskan saat tombol ditekan | |
| BB-15 | Bulk forward by category | Klik "Forward Semua Fasilitas" | Semua tiket pending kategori terkirim | |
| BB-16 | Tambah kontak otoritas | Form nama, WA, email, kategori | Kontak tersimpan & dipakai forwarding | |
| BB-17 | Upload dokumen kampus PDF | Upload PDF panduan | Embedding ter-generate, masuk RAG | |
| BB-18 | Export tiket CSV | Klik export | File CSV terdownload, PII tersembunyi sesuai role | |
| BB-19 | Sub-admin akses terbatas | Login sub-admin | Menu tertentu tidak terlihat (RBAC) | |
| BB-20 | Notifikasi real-time | Tiket baru masuk | Bell notification berbunyi | |

### 3.3 Skenario Pengujian Edge Function

| ID | Endpoint | Test Case | Output Diharapkan |
|----|----------|-----------|-------------------|
| EF-01 | `POST /keluhan` | Body lengkap valid | 200, `ticket_id` dikembalikan |
| EF-02 | `POST /keluhan` | Field `nim` kosong | 400, error "Missing required fields" |
| EF-03 | `POST /process-complaint` `type=intent` | "AC rusak" | `{ intent: "keluhan" }` |
| EF-04 | `POST /process-complaint` `type=classify` | "AC rusak" | `{ kategori: "fasilitas" }` |
| EF-05 | `POST /forward-ticket` | `ticket_id` valid | Forwarding logs tersimpan |

---

## 4. Confusion Matrix (Akurasi AI)

### 4.1 Dataset Uji
- **Jumlah sampel:** 100 kalimat (50 keluhan, 50 informasi) — dikurasi manual dari log riil.
- **Distribusi kategori:** fasilitas (20), akademik (20), administrasi (15), keuangan (15), pelanggaran (15), ppid (15).

### 4.2 Format Confusion Matrix — Klasifikasi Kategori

|              | Pred: Fasilitas | Pred: Akademik | Pred: Administrasi | Pred: Keuangan | Pred: Pelanggaran | Pred: PPID |
|--------------|:---:|:---:|:---:|:---:|:---:|:---:|
| **Aktual: Fasilitas**   | TP | FN | FN | FN | FN | FN |
| **Aktual: Akademik**    | FP | TP | FN | FN | FN | FN |
| **Aktual: Administrasi**| FP | FP | TP | FN | FN | FN |
| **Aktual: Keuangan**    | FP | FP | FP | TP | FN | FN |
| **Aktual: Pelanggaran** | FP | FP | FP | FP | TP | FN |
| **Aktual: PPID**        | FP | FP | FP | FP | FP | TP |

### 4.3 Metrik

```
Accuracy  = (TP + TN) / (TP + TN + FP + FN)
Precision = TP / (TP + FP)
Recall    = TP / (TP + FN)
F1-Score  = 2 × (Precision × Recall) / (Precision + Recall)
```

### 4.4 Target Minimal
| Metrik | Target |
|--------|--------|
| Accuracy (kategori) | ≥ 85% |
| Accuracy (intent) | ≥ 90% |
| F1-Score rata-rata | ≥ 0.80 |

---

## 5. System Usability Scale (SUS)

Kuesioner 10 item, skala 1 (Sangat Tidak Setuju) – 5 (Sangat Setuju).

| No | Pernyataan | 1 | 2 | 3 | 4 | 5 |
|----|------------|---|---|---|---|---|
| 1 | Saya akan menggunakan sistem ini secara rutin. | | | | | |
| 2 | Sistem ini terasa terlalu kompleks. | | | | | |
| 3 | Sistem ini mudah digunakan. | | | | | |
| 4 | Saya butuh bantuan teknis untuk memakainya. | | | | | |
| 5 | Fungsi-fungsi sistem terintegrasi dengan baik. | | | | | |
| 6 | Terlalu banyak inkonsistensi dalam sistem. | | | | | |
| 7 | Sistem ini mudah dipelajari orang lain. | | | | | |
| 8 | Sistem ini terasa janggal saat digunakan. | | | | | |
| 9 | Saya merasa percaya diri menggunakan sistem ini. | | | | | |
| 10 | Saya perlu banyak belajar sebelum dapat menggunakannya. | | | | | |

### 5.1 Perhitungan Skor SUS
- Item ganjil (1,3,5,7,9): skor = (nilai − 1)
- Item genap (2,4,6,8,10): skor = (5 − nilai)
- Jumlahkan, kalikan **2.5** → skor SUS (0–100)

### 5.2 Interpretasi
| Skor | Grade | Adjektif |
|------|-------|----------|
| > 80.3 | A | Excellent |
| 68 – 80.3 | B | Good |
| 68 | C | OK |
| 51 – 68 | D | Poor |
| < 51 | F | Awful |

**Target:** Skor SUS ≥ 68 (Good).

### 5.3 Responden
- Minimal **30 mahasiswa** (sampel representatif).
- Minimal **5 admin** kampus.

---

## 6. User Acceptance Testing (UAT)

Format tabel persetujuan per fitur:

| ID | Fitur | Kriteria Diterima | Status | Catatan Penguji | TTD |
|----|-------|-------------------|--------|-----------------|-----|
| UAT-01 | Submit keluhan via chatbot | Tiket masuk database & terkirim ke admin | □ Terima □ Tolak | | |
| UAT-02 | RAG informasi kampus | Jawaban relevan & sesuai dokumen | □ Terima □ Tolak | | |
| UAT-03 | Auto-forward WhatsApp & Email | Pesan diterima admin/otoritas | □ Terima □ Tolak | | |
| UAT-04 | Dashboard analytics | Grafik tiket akurat | □ Terima □ Tolak | | |
| UAT-05 | RBAC Sub-admin | Sub-admin tidak bisa akses fitur primer | □ Terima □ Tolak | | |
| UAT-06 | Notifikasi real-time | Notifikasi muncul tanpa refresh | □ Terima □ Tolak | | |
| UAT-07 | Export laporan CSV/PDF | File ter-download lengkap | □ Terima □ Tolak | | |

---

## 7. Pengujian Performa (Opsional)

| Metrik | Tools | Target |
|--------|-------|--------|
| Response time chatbot | DevTools / k6 | < 3 detik |
| Response time RAG | DevTools | < 5 detik |
| Lighthouse Performance | Chrome Lighthouse | ≥ 80 |
| Concurrent users | k6 / Artillery | 50 user tanpa error |

---

## 8. Pelaporan Hasil

Susun bab IV skripsi dengan struktur:
1. Pelaksanaan pengujian (waktu, tempat, responden)
2. Hasil Black-Box (tabel skenario terisi)
3. Hasil Confusion Matrix + perhitungan metrik
4. Hasil SUS (rata-rata skor + grafik distribusi)
5. Hasil UAT (rekap penerimaan)
6. Pembahasan & kesimpulan

---

*Dokumen pengujian untuk skripsi Single Gateway — Chatbot Pelayanan Keluhan & Informasi Kampus UIN Alauddin Makassar.*
