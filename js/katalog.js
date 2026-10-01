// js/katalog.js
// Katalog (Best Seller + Menu) + modal detail + kirim pesanan (simpan ke Supabase, lalu buka WhatsApp).

const TOKO = CONFIG.TOKO;
let produk = [];

// ---------- util ----------
const $ = id => document.getElementById(id);
const rupiah = n => 'Rp' + Number(n).toLocaleString('id-ID');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const modal = $('modal'), isi = $('isi'), daftar = $('daftar');

// 10000 -> "10k", 6500 -> "6,5k", 750 -> "Rp750"
function hargaSingkat(h) {
  if (h < 1000) return 'Rp' + h;
  const k = h / 1000;
  return (Number.isInteger(k) ? k : k.toFixed(1).replace('.', ',')) + 'k';
}

// ---------- profil toko ----------
$('toko-nama').textContent = TOKO.nama;
$('toko-tagline').textContent = TOKO.tagline;
$('toko-alamat').textContent = TOKO.alamat;
document.title = TOKO.nama;

// ---------- footer ----------
$('tahun').textContent = new Date().getFullYear();
$('footer-nama').textContent = TOKO.nama;
$('link-ig').href = 'https://instagram.com/' + TOKO.instagram;
$('link-wa').href = 'https://wa.me/' + TOKO.wa;

// ---------- foto (gambar kalau ada, huruf awal kalau tidak) ----------
function fotoHTML(p) {
  const url = urlFoto(p.foto);
  return url
    ? `<img src="${esc(url)}" alt="${esc(p.nama)}" loading="lazy" onerror="this.replaceWith(document.createTextNode('${esc(p.nama[0])}'))">`
    : esc(p.nama[0]);
}

// ---------- ambil produk dari Supabase ----------
async function muatProduk() {
  const { data, error } = await db
    .from('products')
    .select('id,nama,deskripsi,harga,stok,foto,is_best')
    .eq('is_active', true)      // wajib: kalau penjual login, RLS bisa menampilkan semua
    .order('id');
  if (error) throw error;
  produk = data;
}

function kartuHTML(p) {
  return `
    <button class="kartu ${p.stok < 1 ? 'habis' : ''}" data-id="${p.id}">
      <div class="foto-bulat">
        <div class="foto">${fotoHTML(p)}</div>
        <span class="badge-harga">${hargaSingkat(p.harga)}</span>
      </div>
      <h3>${esc(p.nama)}</h3>
      ${p.stok < 1 ? '<p class="stok">Stok habis</p>' : ''}
    </button>`;
}

function render() {
  if (!produk.length) {
    daftar.innerHTML = '<p class="status">Belum ada produk.</p>';
    return;
  }
  const best = produk.filter(p => p.is_best);
  const lain = produk.filter(p => !p.is_best);
  let html = '';
  if (best.length) {
    html += `<section class="bagian best"><h2>Best Seller</h2><div class="grid">${best.map(kartuHTML).join('')}</div></section>`;
  }
  if (lain.length) {
    html += `<section class="bagian"><h2>${best.length ? 'Menu' : 'Menu kami'}</h2><div class="grid">${lain.map(kartuHTML).join('')}</div></section>`;
  }
  daftar.innerHTML = html;
}

daftar.addEventListener('click', e => {
  const k = e.target.closest('.kartu');
  if (k) bukaModal(Number(k.dataset.id));
});

// ---------- modal detail + form ----------
function bukaModal(id) {
  const p = produk.find(x => x.id === id);
  if (!p) return;
  history.replaceState(null, '', '#produk-' + id);
  isi.innerHTML = `
    <div class="detail-foto">${fotoHTML(p)}</div>
    <div class="detail-isi">
      <h2 id="judul">${esc(p.nama)}</h2>
      <p class="harga besar">${rupiah(p.harga)}</p>
      <p class="deskripsi">${esc(p.deskripsi)}</p>
      ${p.stok < 1 ? '<p style="color:var(--err);font-weight:700">Stok produk ini sedang habis.</p>' : `
      <form id="form" novalidate>
        <label>Jumlah <input type="number" name="qty" min="1" max="${p.stok}" value="1" inputmode="numeric"></label>
        <label>Nama <input type="text" name="nama" maxlength="100" autocomplete="name"></label>
        <label>Alamat pengiriman <textarea name="alamat" rows="2" maxlength="300" autocomplete="street-address"></textarea></label>
        <label>Catatan (opsional) <textarea name="catatan" rows="2" maxlength="300"></textarea></label>
        <p class="total">Total <strong id="total">${rupiah(p.harga)}</strong></p>
        <p class="galat" id="galat" role="alert"></p>
        <button type="submit" class="btn" id="btn-pesan">Pesan sekarang</button>
        <p class="hint">Kamu akan diarahkan ke WhatsApp penjual. Tinggal tekan kirim.</p>
      </form>`}
    </div>`;
  const form = $('form');
  if (form) {
    form.qty.addEventListener('input', () => {
      const q = Math.max(1, Math.min(p.stok, Number(form.qty.value) || 1));
      $('total').textContent = rupiah(p.harga * q);
    });
    form.addEventListener('submit', e => { e.preventDefault(); kirim(p, form); });
  }
  if (!modal.open) modal.showModal();
}

// ---------- kirim pesanan: simpan ke DB dulu, baru buka WA ----------
async function kirim(p, f) {
  const qty = Number(f.qty.value);
  const nama = f.nama.value.trim();
  const alamat = f.alamat.value.trim();
  const catatan = f.catatan.value.trim();
  const galat = $('galat'), btn = $('btn-pesan');

  if (!Number.isInteger(qty) || qty < 1 || qty > p.stok) { galat.textContent = `Jumlah harus antara 1 dan ${p.stok}.`; return; }
  if (!nama || !alamat) { galat.textContent = 'Nama dan alamat wajib diisi.'; return; }

  galat.textContent = '';
  btn.disabled = true;
  btn.textContent = 'Memproses...';

  // Harga dan stok dicek ulang di server oleh fungsi buat_pesanan
  const { error } = await db.rpc('buat_pesanan', {
    p_product_id: p.id,
    p_qty: qty,
    p_nama: nama,
    p_alamat: alamat,
    p_catatan: catatan || null
  });

  if (error) {
    galat.textContent = error.message || 'Pesanan gagal disimpan. Coba lagi.';
    btn.disabled = false;
    btn.textContent = 'Pesan sekarang';
    muatProduk().then(render).catch(() => {});   // stok mungkin berubah
    return;
  }

  const teks = [
    'Halo, saya mau pesan:',
    `Produk: ${p.nama} x${qty}`,
    `Total: ${rupiah(p.harga * qty)}`,
    `Nama: ${nama}`,
    `Alamat: ${alamat}`,
    catatan ? `Catatan: ${catatan}` : ''
  ].filter(Boolean).join('\n');

  window.location.href = `https://wa.me/${TOKO.wa}?text=${encodeURIComponent(teks)}`;
}

// ---------- tutup modal + link langsung ke produk ----------
$('tutup').addEventListener('click', () => modal.close());
modal.addEventListener('click', e => { if (e.target === modal) modal.close(); });
modal.addEventListener('close', () => history.replaceState(null, '', location.pathname));

// ---------- start ----------
(async () => {
  daftar.innerHTML = '<p class="status">Memuat produk...</p>';
  try {
    await muatProduk();
    render();
    const m = location.hash.match(/^#produk-(\d+)$/);
    if (m) bukaModal(Number(m[1]));
  } catch (err) {
    console.error(err);
    daftar.innerHTML = '<p class="status err">Produk gagal dimuat. Periksa koneksi lalu muat ulang halaman.</p>';
  }
})();