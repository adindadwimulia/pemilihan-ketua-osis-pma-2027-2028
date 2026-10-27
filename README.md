# E-Voting Ketua OSIS PMA 2027–2028 (Pesantren Modern At Taqwa)
Frontend statis (HTML/CSS/JS) + backend **Supabase** (PostgreSQL, Auth, Realtime, Storage).

## 1. Instalasi backend
1. Buat proyek di supabase.com → **SQL Editor** → tempel & jalankan seluruh `schema.sql`.
2. **Authentication → Users → Add user** (email+password admin). Salin UUID-nya, lalu jalankan: `insert into admins values('UUID');`
3. **Authentication → Providers**: matikan "Allow new users to sign up" (agar publik tidak bisa mendaftar).
4. **Project Settings → API**: salin *Project URL* dan *anon key* ke `config.js`. JANGAN memakai `service_role` key di frontend.

## 2. Cara kerja keamanan
- Pemilih memakai **kode unik** (dibuat admin di `admin.html`, hanya hash SHA-256 yang disimpan). Bagikan 1 kode per pemilih secara tertutup.
- Voting hanya lewat fungsi `cast_vote` (server): cek periode buka/tutup, kode valid, kode belum dipakai (baris dikunci → anti suara ganda & atomik), lalu menyimpan suara.
- Tabel `votes` tidak berisi identitas/waktu pemilih (kerahasiaan suara) dan tidak punya akses klien. Hitungan di tabel `tally` diperbarui trigger secara atomik. Tidak ada tombol reset untuk publik.
- Log audit mencatat kode salah & percobaan ganda. Catatan: kode 10 karakter heksadesimal; aktifkan rate-limit/CAPTCHA Supabase bila diperlukan.
- Klaim "aman" hanya berlaku setelah Anda menjalankan seluruh daftar uji di bawah.

## 3. Mengganti foto & deskripsi kandidat
Buka `admin.html` → login → bagian **Kandidat** → ubah deskripsi / pilih file foto → **SIMPAN**. Tanpa foto, tampil placeholder ilustrasi.

## 4. Hosting & tautan publik
Unggah semua file (kecuali `schema.sql`, `README.md`) ke Netlify (drag & drop folder), Vercel, GitHub Pages, atau Cloudflare Pages. Bagikan URL `index.html`; halaman admin di `/admin.html` (hanya admin terdaftar yang bisa masuk).

## 5. Daftar uji (catat hasilnya)
1. Sebelum voting dibuka: tombol VOTE nonaktif; semua suara 0.
2. Buka voting, buat 5 kode uji, buka situs di HP + laptop; vote dengan 1 kode → angka bertambah di kedua perangkat tanpa reload.
3. Pakai kode yang sama lagi → ditolak "sudah digunakan"; muncul di log audit.
4. Kode ngawur → ditolak. Tutup voting → vote ditolak.
5. Di Console browser coba `sb.from('votes').select()` / `update tally` → harus gagal (RLS).
6. Sembunyikan hasil → angka tersembunyi di publik.
7. 10 perangkat vote bersamaan → total = jumlah kode terpakai.
8. **Hapus data uji** sebelum pemilihan resmi: SQL Editor `truncate votes; update tally set total=0; truncate voters;` lalu buat kode resmi.
