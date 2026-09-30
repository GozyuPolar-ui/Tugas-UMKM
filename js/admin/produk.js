// js/admin/produk.js
// Kelola produk: tabel, tambah/edit (modal), hapus, aktif/nonaktif, upload foto.

const $ = id => document.getElementById(id);
const rupiah = n => 'Rp' + Number(n).toLocaleString('id-ID');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const tbody = $('tbody'), modal = $('modal'), form = $('form');
let daftar = [];
let sedangEdit = null;   // objek produk yang diedit, null = tambah baru

// ---------- toast ----------
let tToast;
function toast(pesan) {
  const t = $('toast');
  t.textContent = pesan;
  t.classList.add('tampil');
  clearTimeout(tToast);
  tToast = setTimeout(() => t.classList.remove('tampil'), 2600);
}

// ---------- tabel ----------
async function muat() {
  const { data, error } = await db.from('products').select('*').order('id');
  if (error) {
    tbody.innerHTML = '<tr><td colspan="6" class="kosong err">Produk gagal dimuat. Muat ulang halaman.</td></tr>';
    return;
  }
  daftar = data;
  render();
}

function render() {
  if (!daftar.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="kosong">Belum ada produk. Klik "Tambah produk".</td></tr>';
    return;
  }
  tbody.innerHTML = daftar.map(p => {
    const url = urlFoto(p.foto);
    return `
    <tr data-id="${p.id}" class="${p.is_active ? '' : 'nonaktif'}">
      <td><div class="thumb">${url ? `<img src="${esc(url)}" alt="" loading="lazy">` : esc(p.nama[0])}</div></td>
      <td><strong>${esc(p.nama)}</strong></td>
      <td>${rupiah(p.harga)}</td>
      <td>${p.stok < 1 ? '<span class="badge merah">Habis</span>' : p.stok}</td>
      <td><input type="checkbox" class="sakelar" data-aksi="aktif" ${p.is_active ? 'checked' : ''} aria-label="Tampilkan ${esc(p.nama)} di katalog"></td>
      <td class="aksi">
        <button type="button" class="btn abu kecil" data-aksi="edit">Edit</button>
        <button type="button" class="btn bahaya kecil" data-aksi="hapus">Hapus</button>
      </td>
    </tr>`;
  }).join('');
}

tbody.addEventListener('click', async e => {
  const el = e.target.closest('[data-aksi]');
  if (!el) return;
  const id = Number(el.closest('tr').dataset.id);
  const p = daftar.find(x => x.id === id);
  if (!p) return;

  if (el.dataset.aksi === 'edit') bukaForm(p);
  if (el.dataset.aksi === 'hapus') hapus(p);
});

// toggle tampil/sembunyi (event change, bukan click, supaya cocok untuk checkbox)
tbody.addEventListener('change', async e => {
  if (e.target.dataset.aksi !== 'aktif') return;
  const id = Number(e.target.closest('tr').dataset.id);
  const p = daftar.find(x => x.id === id);
  const nilai = e.target.checked;
  const { error } = await db.from('products').update({ is_active: nilai }).eq('id', id);
  if (error) { e.target.checked = !nilai; toast('Gagal mengubah status produk.'); return; }
  p.is_active = nilai;
  e.target.closest('tr').classList.toggle('nonaktif', !nilai);
  toast(nilai ? 'Produk ditampilkan di katalog.' : 'Produk disembunyikan dari katalog.');
});

// ---------- modal tambah/edit ----------
function bukaForm(p = null) {
  sedangEdit = p;
  form.reset();
  $('galat').textContent = '';
  $('judul-modal').textContent = p ? 'Edit produk' : 'Tambah produk';
  if (p) {
    form.nama.value = p.nama;
    form.deskripsi.value = p.deskripsi || '';
    form.harga.value = p.harga;
    form.stok.value = p.stok;
    form.aktif.checked = p.is_active;
  } else {
    form.stok.value = 0;
  }
  tampilPreview(p ? urlFoto(p.foto) : null);
  modal.showModal();
  form.nama.focus();
}

function tampilPreview(url) {
  const box = $('preview');
  box.hidden = !url;
  if (url) box.querySelector('img').src = url;
}

form.foto.addEventListener('change', () => {
  const f = form.foto.files[0];
  if (f) tampilPreview(URL.createObjectURL(f));
  else tampilPreview(sedangEdit ? urlFoto(sedangEdit.foto) : null);
});

$('btn-tambah').addEventListener('click', () => bukaForm());
$('batal').addEventListener('click', () => modal.close());
modal.addEventListener('click', e => { if (e.target === modal) modal.close(); });

// ---------- foto: kecilkan lalu upload ----------
function kecilkan(file, maks = 1000) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const src = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(src);
      const skala = Math.min(1, maks / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * skala);
      c.height = Math.round(img.height * skala);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      c.toBlob(b => b ? resolve(b) : reject(new Error('Gagal memproses foto')), 'image/jpeg', 0.85);
    };
    img.onerror = () => reject(new Error('File bukan gambar yang valid'));
    img.src = src;
  });
}

async function unggah(file) {
  const blob = await kecilkan(file);
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await db.storage.from(CONFIG.BUCKET_FOTO).upload(path, blob, { contentType: 'image/jpeg' });
  if (error) throw error;
  return path;
}

function hapusFoto(path) {
  if (path && !/^https?:\/\//.test(path)) {
    db.storage.from(CONFIG.BUCKET_FOTO).remove([path]);   // gagal pun tidak masalah
  }
}

// ---------- simpan ----------
form.addEventListener('submit', async e => {
  e.preventDefault();
  const galat = $('galat'), btn = $('btn-simpan');

  const nama = form.nama.value.trim();
  const deskripsi = form.deskripsi.value.trim();
  const harga = Number(form.harga.value);
  const stok = Number(form.stok.value);
  const file = form.foto.files[0];

  if (!nama) { galat.textContent = 'Nama produk wajib diisi.'; return; }
  if (form.harga.value === '' || !Number.isInteger(harga) || harga < 0) { galat.textContent = 'Harga harus bilangan bulat, 0 atau lebih.'; return; }
  if (form.stok.value === '' || !Number.isInteger(stok) || stok < 0) { galat.textContent = 'Stok harus bilangan bulat, 0 atau lebih.'; return; }
  if (file && file.size > 15 * 1024 * 1024) { galat.textContent = 'Ukuran foto maksimal 15 MB.'; return; }

  galat.textContent = '';
  btn.disabled = true;
  btn.textContent = 'Menyimpan...';

  let fotoBaru = null;
  try {
    if (file) fotoBaru = await unggah(file);

    const payload = {
      nama,
      deskripsi: deskripsi || null,
      harga,
      stok,
      is_active: form.aktif.checked,
      foto: fotoBaru ?? (sedangEdit ? sedangEdit.foto : null)
    };

    const { error } = sedangEdit
      ? await db.from('products').update(payload).eq('id', sedangEdit.id)
      : await db.from('products').insert(payload);
    if (error) throw error;

    // foto lama dibuang hanya setelah data berhasil tersimpan
    if (fotoBaru && sedangEdit) hapusFoto(sedangEdit.foto);

    modal.close();
    toast(sedangEdit ? 'Produk diperbarui.' : 'Produk ditambahkan.');
    await muat();
  } catch (err) {
    if (fotoBaru) hapusFoto(fotoBaru);   // batalkan upload yatim
    console.error(err);
    galat.textContent = 'Gagal menyimpan: ' + (err.message || 'coba lagi.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Simpan';
  }
});

// ---------- hapus ----------
async function hapus(p) {
  const ok = confirm(`Hapus "${p.nama}" secara permanen?\n\nPesanan lama produk ini tetap tersimpan. Kalau produk cuma sedang tidak dijual, lebih baik sembunyikan saja.`);
  if (!ok) return;
  const { error } = await db.from('products').delete().eq('id', p.id);
  if (error) { toast('Gagal menghapus produk.'); return; }
  hapusFoto(p.foto);
  toast('Produk dihapus.');
  await muat();
}

// ---------- start ----------
(async () => {
  await wajibLogin();
  $('nama-toko').textContent = CONFIG.TOKO.nama;
  $('btn-keluar').addEventListener('click', keluar);
  await muat();
})();