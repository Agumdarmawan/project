# Spesifikasi Detail Use Case

## UC1 - Catat Kehadiran Masuk

**Aktor Utama:** Karyawan/Peserta Magang  
**Tingkat:** User Goal  
**Stakeholder:** Karyawan, Admin, Supervisor  

### Preconditions:
- Karyawan sudah terdaftar dalam sistem
- Karyawan sudah login ke sistem
- Sistem kehadiran tersedia

### Postconditions:
- Data kehadiran masuk tercatat dalam database
- Foto kehadiran tersimpan (jika ada)
- Status kehadiran karyawan terupdate

### Main Success Scenario:
1. Karyawan membuka fitur pencatatan kehadiran
2. Sistem menampilkan form kehadiran masuk
3. Karyawan memasukkan email
4. Karyawan mengambil foto kehadiran
5. Sistem mencatat waktu masuk otomatis
6. Sistem menyimpan data kehadiran
7. Sistem menampilkan konfirmasi berhasil

### Extensions:
3a. Email tidak valid:
   - Sistem menampilkan pesan error
   - Kembali ke langkah 3

4a. Gagal mengambil foto:
   - Sistem memberikan opsi untuk melanjutkan tanpa foto
   - Lanjut ke langkah 5

---

## UC9 - Buat Penugasan Kerja

**Aktor Utama:** Supervisor/Manager  
**Tingkat:** User Goal  
**Stakeholder:** Supervisor, Karyawan, Admin  

### Preconditions:
- Supervisor sudah login ke sistem
- Data karyawan tersedia
- Supervisor memiliki hak akses untuk memberikan penugasan

### Postconditions:
- Penugasan kerja baru tercatat dalam sistem
- Karyawan yang ditugaskan menerima notifikasi
- Status penugasan diset sebagai "Aktif"

### Main Success Scenario:
1. Supervisor membuka modul penugasan kerja
2. Sistem menampilkan daftar karyawan
3. Supervisor memilih karyawan yang akan ditugaskan
4. Supervisor mengisi detail penugasan:
   - Judul penugasan
   - Deskripsi pekerjaan
   - Deadline
   - Prioritas
5. Supervisor dapat mengupload gambar/dokumen pendukung
6. Supervisor menyimpan penugasan
7. Sistem mengirim notifikasi ke karyawan terpilih
8. Sistem menampilkan konfirmasi berhasil

### Extensions:
3a. Tidak ada karyawan yang tersedia:
   - Sistem menampilkan pesan "Tidak ada karyawan tersedia"
   - Use case berakhir

4a. Field wajib tidak diisi:
   - Sistem menampilkan pesan error
   - Kembali ke langkah 4

---

## UC13 - Buat Penilaian Kinerja

**Aktor Utama:** Supervisor/Manager  
**Tingkat:** User Goal  
**Stakeholder:** Supervisor, Karyawan, Admin  

### Preconditions:
- Supervisor sudah login ke sistem
- Karyawan yang akan dinilai sudah terdaftar
- Periode penilaian sudah ditentukan

### Postconditions:
- Data penilaian kinerja tersimpan
- Karyawan dapat melihat hasil penilaian
- Riwayat penilaian terupdate

### Main Success Scenario:
1. Supervisor membuka modul penilaian kinerja
2. Sistem menampilkan daftar karyawan
3. Supervisor memilih karyawan yang akan dinilai
4. Sistem menampilkan form penilaian dengan kriteria:
   - Kedisiplinan (1-5)
   - Tanggung Jawab (1-5)
   - Komunikasi (1-5)
   - Kualitas Kerja (1-5)
   - Kerjasama Tim (1-5)
5. Supervisor mengisi nilai untuk setiap kriteria
6. Supervisor menambahkan catatan/komentar
7. Supervisor menyimpan penilaian
8. Sistem menghitung rata-rata nilai
9. Sistem mengirim notifikasi ke karyawan
10. Sistem menampilkan konfirmasi berhasil

### Extensions:
5a. Nilai tidak dalam rentang 1-5:
   - Sistem menampilkan pesan error
   - Kembali ke langkah 5

---

## UC16 - Proses Surat Permohonan

**Aktor Utama:** Admin/HR  
**Aktor Sekunder:** Pemohon Eksternal  
**Tingkat:** User Goal  
**Stakeholder:** Admin, Pemohon, Management  

### Preconditions:
- Admin sudah login ke sistem
- Surat permohonan sudah diterima
- Master data jurusan dan divisi tersedia

### Postconditions:
- Surat permohonan tercatat dalam sistem
- Status surat diupdate
- Data pemohon tersimpan

### Main Success Scenario:
1. Admin membuka modul manajemen surat
2. Admin memilih "Proses Surat Permohonan"
3. Sistem menampilkan form input surat permohonan
4. Admin mengisi data pemohon:
   - Nama pemohon
   - Institusi asal
   - Kontak pemohon
   - Jurusan (dari master data)
   - Divisi tujuan (dari master data)
5. Admin mengupload dokumen surat permohonan
6. Admin menetapkan status surat (Diterima/Ditolak/Pending)
7. Admin menyimpan data
8. Sistem generate nomor surat otomatis
9. Sistem menampilkan konfirmasi berhasil

### Extensions:
4a. Jurusan tidak tersedia di master data:
   - Admin dapat menambah jurusan baru
   - Lanjut ke langkah 5

6a. Status tidak dipilih:
   - Sistem otomatis set status "Pending"
   - Lanjut ke langkah 7

---

## UC17 - Buat Surat Balasan

**Aktor Utama:** Admin/HR  
**Tingkat:** User Goal  
**Stakeholder:** Admin, Pemohon, Management  

### Preconditions:
- Surat permohonan sudah diproses (UC16)
- Admin sudah login ke sistem
- Template surat balasan tersedia

### Postconditions:
- Surat balasan tercatat dalam sistem
- Dokumen surat balasan terbuat
- Status surat permohonan terupdate

### Main Success Scenario:
1. Admin membuka daftar surat permohonan
2. Admin memilih surat yang akan dibuatkan balasan
3. Sistem menampilkan detail surat permohonan
4. Admin memilih template surat balasan
5. Sistem otomatis mengisi data pemohon dari surat permohonan
6. Admin melengkapi isi surat balasan:
   - Keputusan (Diterima/Ditolak)
   - Periode magang (jika diterima)
   - Syarat dan ketentuan
   - Divisi penempatan
7. Admin dapat mengupload lampiran
8. Sistem generate nomor surat balasan
9. Admin menyimpan surat balasan
10. Sistem update status surat permohonan
11. Sistem menampilkan preview surat untuk dicetak

### Extensions:
6a. Surat ditolak:
   - Admin mengisi alasan penolakan
   - Skip langkah periode dan divisi
   - Lanjut ke langkah 7

---

## UC20 - Kelola Master Jurusan

**Aktor Utama:** Admin/HR  
**Tingkat:** Subfunction  
**Stakeholder:** Admin, Sistem  

### Preconditions:
- Admin sudah login ke sistem
- Admin memiliki hak akses master data

### Postconditions:
- Data master jurusan terupdate
- Perubahan tersimpan dalam database

### Main Success Scenario:
1. Admin membuka modul master data
2. Admin memilih "Master Jurusan"
3. Sistem menampilkan daftar jurusan yang ada
4. Admin dapat memilih aksi:
   - Tambah jurusan baru
   - Edit jurusan existing
   - Hapus jurusan
   - Lihat detail jurusan

**Sub-flow Tambah Jurusan:**
4a.1. Admin klik "Tambah Jurusan"
4a.2. Sistem menampilkan form input
4a.3. Admin mengisi nama jurusan dan deskripsi
4a.4. Admin menyimpan data
4a.5. Sistem validasi data tidak duplikat
4a.6. Sistem menyimpan jurusan baru
4a.7. Sistem refresh daftar jurusan

**Sub-flow Edit Jurusan:**
4b.1. Admin memilih jurusan yang akan diedit
4b.2. Sistem menampilkan form edit dengan data existing
4b.3. Admin mengubah data yang diperlukan
4b.4. Admin menyimpan perubahan
4b.5. Sistem validasi dan update data
4b.6. Sistem menampilkan konfirmasi berhasil

**Sub-flow Hapus Jurusan:**
4c.1. Admin memilih jurusan yang akan dihapus
4c.2. Sistem menampilkan konfirmasi penghapusan
4c.3. Sistem cek apakah jurusan sedang digunakan
4c.4. Jika tidak digunakan, sistem hapus data
4c.5. Sistem menampilkan konfirmasi berhasil

### Extensions:
4a.5a. Nama jurusan sudah ada:
   - Sistem menampilkan pesan error
   - Kembali ke langkah 4a.3

4c.3a. Jurusan sedang digunakan:
   - Sistem menampilkan pesan tidak bisa dihapus
   - Use case berakhir

---

## Relationship Matrix

| Use Case | Include | Extend | Generalize |
|----------|---------|--------|------------|
| UC1 | UC3 | - | - |
| UC2 | UC3 | - | - |
| UC4 | - | UC1, UC2 | - |
| UC5 | - | - | UC4 |
| UC13 | UC6 | - | - |
| UC17 | UC16 | - | - |
| UC19 | - | UC17 | - |

## Business Rules

1. **BR001**: Setiap kehadiran harus disertai dengan email yang valid
2. **BR002**: Foto kehadiran bersifat opsional tetapi direkomendasikan
3. **BR003**: Penilaian kinerja menggunakan skala 1-5
4. **BR004**: Surat balasan harus dibuat dalam 7 hari kerja setelah surat permohonan diterima
5. **BR005**: Master data tidak boleh dihapus jika sedang digunakan oleh data transaksional
6. **BR006**: Setiap penugasan harus memiliki deadline yang jelas
7. **BR007**: Status surat default adalah "Pending" jika tidak ditentukan
8. **BR008**: Karyawan hanya bisa melihat penilaian mereka sendiri
9. **BR009**: Supervisor dapat melihat kehadiran karyawan di bawah supervisinya
10. **BR010**: Admin memiliki akses penuh ke seluruh sistem