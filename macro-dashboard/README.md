# Dashboard Analisis Makro Ekonomi

Dashboard web statis untuk mengeksplorasi indikator makro ekonomi lintas negara menggunakan World Bank API. Dibangun dengan HTML + Bootstrap + Chart.js (tanpa backend).

## Fitur
- Pilih hingga 3 negara untuk perbandingan
- Rentang tahun kustom (1960 - tahun berjalan)
- Indikator siap pakai:
  - PDB (US$ berjalan)
  - Pertumbuhan PDB (% yoy)
  - Inflasi CPI (% yoy)
  - Pengangguran (% tenaga kerja)
  - Utang Pemerintah (% PDB)
  - Suku Bunga Riil (%)
- Kartu KPI untuk nilai terkini (negara utama)
- Grafik interaktif (line/bar toggle)
- Ekspor CSV per grafik

## Menjalankan Lokal
Tidak perlu instalasi khusus. Cukup layani folder ini dengan server statis.

Opsi 1: Python

```bash
cd macro-dashboard
python3 -m http.server 8000
```

Buka: `http://localhost:8000`

Opsi 2: Node (http-server)

```bash
npm i -g http-server
cd macro-dashboard
http-server -p 8000
```

## Catatan Data
- Sumber: World Bank Open Data (`https://data.worldbank.org/`)
- API: `https://api.worldbank.org/v2/`
- Beberapa seri mungkin memiliki nilai kosong pada tahun tertentu; grafik akan mengabaikan gap tersebut.

## Kustomisasi
- Tambah/hapus indikator di `assets/app.js` pada konstanta `INDICATORS`.
- Ubah gaya di `assets/styles.css`.