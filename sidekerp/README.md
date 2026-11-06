# SIDEK ERP — Dashboard Monitoring Data Penelitian

Dashboard: [sidekerp/index.html](index.html). Hanya statistik agregat; **tidak** berisi respon mentah atau identitas pribadi.

## Publikasi GitHub Pages

Repo: `gunggu/akm-lab`, branch `main`, folder `/ (root)`.

1. Buka **Settings → Pages** di repositori.
2. Pada **Build and deployment**, pilih **Deploy from a branch**.
3. Pilih **main** dan **/(root)**, kemudian **Save**.
4. Setelah status Pages berhasil, buka: **https://gunggu.github.io/akm-lab/sidekerp/**

Jika situs Pages repo sudah menggunakan konfigurasi lain, jangan mengubah pengaturan existing tanpa meninjau konsekuensinya. Halaman ini juga dapat dipindahkan ke repo Pages tersendiri kelak.

## Snapshot penelitian

Snapshot 6 November 2026 adalah hasil pembacaan delapan spreadsheet Google Sheets melalui akun kerja UGM:

| Dataset | Jumlah respons |
| --- | ---: |
| SMK T0 | 80 |
| SMK T1 | 73 |
| SMK T2–T3 | 185 |
| SMK T4 | 0 |
| UMKM T0 | 83 |
| UMKM T1 | 78 |
| UMKM T2–T3 | 28 |
| UMKM T4 | 0 |

Snapshot pembanding 10 September 2026: SMK T2–T3 = 54; UMKM T1 = 78; UMKM T2–T3 = 7. Wave tanpa baseline jumlah total historis direpresentasikan `null`, bukan 0.

## Memperbarui dashboard

1. Baca data **aktual** tiap Google Sheet. Hitung jumlah baris respons dengan timestamp; jangan menggunakan `rowCount` dari metadata (itu hanya ukuran grid).
2. Periksa identitas, duplikasi, tanggal, status form T4, dan perbedaan antara response count vs unique participants.
3. Di bagian `const source` dalam `index.html`, perbarui `now` dan pindahkan nilai `now` sebelumnya menjadi `old` **hanya jika** snapshot lama berisi angka yang terverifikasi. Bila tidak, gunakan `null`.
4. Perbarui tanggal snapshot di judul, footer, teks sumber, dan nama file ekspor.
5. Commit perubahan. Pages akan membangun ulang setelah konfigurasi aktif.
6. **Jangan** commit nama, NIS, email, nama UMKM, baris jawaban individual, token OAuth, atau service-account credentials.

## Catatan ilmiah

Volume respons bukan unit analisis independen. Data T2–T3 berulang, sehingga hasil akhir membutuhkan master ID, validasi matching, missingness analysis, dan model longitudinal yang sesuai. Dashboard ini mengukur **ketersediaan data**, bukan hasil inferensial atau efektivitas kausal program.
