---
title: Penjelasan UI/UX
---

# Penjelasan UI/UX: Tugas-UMKM

Repositori: https://github.com/GozyuPolar-ui/Tugas-UMKM

> Catatan cakupan: analisis ini berdasarkan `index.html`, `css/style.css`, `js/katalog.js`, dan `admin/login.html`. Dashboard admin belum dianalisis.

## 1. Gambaran Umum

Tugas-UMKM adalah **katalog produk satu halaman** untuk UMKM dengan checkout lewat WhatsApp. Pembeli melihat produk, membuka detailnya, mengisi data singkat, lalu diarahkan ke WhatsApp penjual dengan pesan yang sudah terisi.

Tidak ada akun pembeli, keranjang, atau pembayaran online, sehingga alurnya ringan dan cocok untuk pembeli lokal.

## 2. UI (Tampilan)

### Palet warna

| Peran | Warna | Kode |
|---|---|---|
| Warna utama (oranye terakota) | Brand | `#c8601c` |
| Judul dan hover (cokelat tua) | Brand dark | `#8a3a10` |
| Latar halaman (krem) | Background | `#fdf6f2` |
| Teks utama (cokelat gelap) | Ink | `#3b1a0c` |
| Cincin fokus keyboard (kuning) | Sun | `#f2b33d` |
| Pesan error (merah) | Error | `#b3261e` |

Palet hangat bertema makanan. Merah hanya dipakai untuk error, jadi warna itu punya satu makna yang jelas.

### Tipografi

- **Arvo** (serif tebal) untuk nama toko, memberi kesan hangat seperti papan toko.
- **Plus Jakarta Sans** untuk teks lainnya, bersih dan mudah dibaca di layar kecil.
- Ukuran judul memakai `clamp()` sehingga menyesuaikan lebar layar secara otomatis.

### Header

- Garis oranye tebal 12px di bagian atas.
- Nama toko besar, tagline, dan alamat.
- Tombol "Masuk penjual" kecil berbentuk pil dengan garis tepi, agar tidak mengganggu pembeli.

### Section bergaya flyer

- Produk dikelompokkan dalam kotak putih dengan border oranye 3px dan sudut sangat membulat.
- Judul "Best Seller" dan "Menu" ditempel di tepi atas sebagai pil oranye.
- Efeknya mirip brosur atau menu cetak, bukan e-commerce yang kaku.

### Kartu produk

- Foto berbentuk **lingkaran** dengan border cokelat.
- **Badge harga bulat** di pojok kanan atas dengan format singkat (`10k`, `6,5k`).
- Hover: foto membesar sedikit (scale 1.04).
- Produk habis: foto abu-abu pudar dan label "Stok habis".
- Fallback: kalau foto gagal dimuat, tampil **huruf awal nama produk**, sehingga tampilan tidak rusak.
- Grid memakai `auto-fit` dan menjadi 2 kolom di layar kecil.

### Modal detail

- Memakai elemen `<dialog>` bawaan browser.
- Desktop: dua kolom (foto di kiri, info dan form di kanan).
- Layar ≤640px: satu kolom.

### Footer

- Dua ikon bulat (Instagram dan WhatsApp).
- Catatan "Pesanan dikonfirmasi lewat WhatsApp."

### Halaman login penjual

- Kotak sederhana: judul, nama toko, field email dan kata sandi, tombol "Masuk", dan tautan "Kembali ke katalog".
- Memakai `noindex` agar tidak muncul di mesin pencari.

## 3. UX (Pengalaman Pengguna)

### Alur utama (3 langkah)

1. Pembeli memilih produk dari kartu.
2. Di modal, pembeli mengisi jumlah, nama, alamat, dan catatan (opsional), lalu menekan **Pesan sekarang**.
3. Pesanan disimpan ke database (Supabase), lalu WhatsApp terbuka dengan pesan siap kirim. Pembeli tinggal menekan kirim.

### Hal yang sudah bagus

- **Total harga langsung berubah** saat jumlah diganti, jadi pembeli tidak perlu menghitung.
- **Kepastian langkah berikutnya:** teks bantu "Kamu akan diarahkan ke WhatsApp penjual. Tinggal tekan kirim."
- **Error jelas dan di tempat:** misalnya "Nama dan alamat wajib diisi" muncul tepat di atas tombol.
- **Feedback saat proses:** tombol berubah menjadi "Memproses..." dan dinonaktifkan agar tidak terkirim dua kali.
- **Tiga kondisi halaman ditangani:**
  - Loading: "Memuat produk..."
  - Kosong: "Belum ada produk."
  - Gagal: pesan error dengan saran memuat ulang halaman.
- **Validasi stok:** jumlah dibatasi sesuai stok, dan daftar dimuat ulang jika stok berubah.
- **Deep link:** URL `#produk-ID` membuka produk tertentu, sehingga penjual bisa membagikan link langsung ke satu produk.
- **Best Seller dipisah** dan ditaruh di atas untuk mempercepat keputusan pembeli.

## 4. Aksesibilitas

- `lang="id"` dan `aria-live` pada daftar produk.
- `aria-label` pada tombol ikon, `alt` pada foto, dan `role="alert"` pada pesan error.
- Cincin fokus kuning yang tebal untuk navigasi keyboard.
- `prefers-reduced-motion` menonaktifkan animasi hover bagi yang memilihnya.
- `inputmode="numeric"` dan `autocomplete` pada form agar pengisian di HP lebih cepat.
- `<dialog>` bawaan, sehingga tombol Esc dan fokus modal ditangani browser.
- `loading="lazy"` pada gambar untuk performa.

## 5. Ringkasan

| Aspek | Penilaian |
|---|---|
| Identitas visual | Kuat dan konsisten (hangat, gaya flyer) |
| Alur pemesanan | Sangat singkat dan jelas |
| Feedback dan error | Baik |
| Responsif | Baik (1 dan 2 kolom, modal adaptif) |
| Aksesibilitas | Di atas rata-rata untuk proyek tugas |
| Fitur lanjutan | Belum ada (keranjang, pencarian, kategori) |