// js/admin/pesanan.js
// Ringkasan + daftar pesanan + ubah status.

const $ = id => document.getElementById(id);
const rupiah = n => 'Rp' + Number(n).toLocaleString('id-ID');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const waktu = t => new Date(t).toLocaleString('id-ID', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });

const STATUS = ['baru', 'diproses', 'dikirim', 'selesai', 'batal'];
const LABEL = { baru:'Baru', diproses:'Diproses', dikirim:'Dikirim', selesai:'Selesai', batal:'Batal' };

const tbody = $('tbody');
let pesanan = [];
let filter = 'semua';

// ---------- toast ----------
let tToast;
function toast(pesan) {
  const t = $('toast');
  t.textContent = pesan;
  t.classList.add('tampil');
  clearTimeout(tToast);
  tToast = setTimeout(() => t.classList.remove('tampil'), 2600);
}

// ---------- muat data ----------
async function muat() {
  const { data, error } = await db
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) {
    console.error(error);
    tbody.innerHTML = '<tr><td colspan="6" class="kosong err">Pesanan gagal dimuat. Klik "Muat ulang".</td></tr>';
    return;
  }
  pesanan = data;
  renderRingkasan();
  renderFilter();
  renderTabel();
}

// ---------- ringkasan ----------
function renderRingkasan() {
  const hitung = s => pesanan.filter(o => o.status === s).length;
  const pendapatan = pesanan.filter(o => o.status === 'selesai').reduce((n, o) => n + o.total, 0);
  const kartu = (label, nilai, kelas = '') =>
    `<div class="stat ${kelas}"><span class="stat-nilai">${nilai}</span><span class="stat-label">${label}</span></div>`;
  $('ringkasan').innerHTML =
    kartu('Baru', hitung('baru'), hitung('baru') ? 'sorot' : '') +
    kartu('Diproses', hitung('diproses')) +
    kartu('Dikirim', hitung('dikirim')) +
    kartu('Selesai', hitung('selesai')) +
    kartu('Pendapatan (selesai)', rupiah(pendapatan), 'lebar');
}

// ---------- filter ----------
function renderFilter() {
  const opsi = ['semua', ...STATUS];
  $('filter').innerHTML = opsi.map(s => {
    const n = s === 'semua' ? pesanan.length : pesanan.filter(o => o.status === s).length;
    const nama = s === 'semua' ? 'Semua' : LABEL[s];
    return `<button type="button" class="chip ${filter === s ? 'aktif' : ''}" data-filter="${s}" aria-pressed="${filter === s}">${nama} (${n})</button>`;
  }).join('');
}

$('filter').addEventListener('click', e => {
  const b = e.target.closest('[data-filter]');
  if (!b) return;
  filter = b.dataset.filter;
  renderFilter();
  renderTabel();
});

// ---------- tabel ----------
function renderTabel() {
  const tampil = filter === 'semua' ? pesanan : pesanan.filter(o => o.status === filter);
  if (!tampil.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="kosong">${
      pesanan.length ? 'Tidak ada pesanan dengan status ini.' : 'Belum ada pesanan masuk.'}</td></tr>`;
    return;
  }
  tbody.innerHTML = tampil.map(o => `
    <tr data-id="${o.id}">
      <td>#${o.id}</td>
      <td class="nowrap">${waktu(o.created_at)}</td>
      <td><strong>${esc(o.nama_produk)}</strong><br><span class="redup">${o.qty} &times; ${rupiah(o.harga_satuan)}</span></td>
      <td class="nowrap"><strong>${rupiah(o.total)}</strong></td>
      <td class="pembeli">
        <strong>${esc(o.nama_pembeli)}</strong><br>
        <span class="redup">${esc(o.alamat)}</span>
        ${o.catatan ? `<br><span class="catatan-order">Catatan: ${esc(o.catatan)}</span>` : ''}
      </td>
      <td>
        <select class="status s-${o.status}" data-aksi="status" aria-label="Status pesanan #${o.id}" ${o.status === 'batal' ? 'disabled' : ''}>
          ${STATUS.map(s => `<option value="${s}" ${s === o.status ? 'selected' : ''}>${LABEL[s]}</option>`).join('')}
        </select>
      </td>
    </tr>`).join('');
}

// ---------- ubah status ----------
tbody.addEventListener('change', async e => {
  if (e.target.dataset.aksi !== 'status') return;
  const sel = e.target;
  const id = Number(sel.closest('tr').dataset.id);
  const o = pesanan.find(x => x.id === id);
  const baru = sel.value;
  const lama = o.status;
  if (baru === lama) return;

  if (baru === 'batal' && !confirm(`Batalkan pesanan #${id}?\n\nStok ${o.qty} x ${o.nama_produk} akan dikembalikan. Status batal tidak bisa diubah lagi.`)) {
    sel.value = lama;
    return;
  }

  sel.disabled = true;
  const { error } = await db.from('orders').update({ status: baru }).eq('id', id);
  if (error) {
    console.error(error);
    sel.value = lama;
    sel.disabled = false;
    toast('Gagal mengubah status. Coba lagi.');
    return;
  }
  o.status = baru;
  toast(`Pesanan #${id} jadi "${LABEL[baru]}".`);
  renderRingkasan();
  renderFilter();
  renderTabel();
});

// ---------- start ----------
(async () => {
  await wajibLogin();
  $('nama-toko').textContent = CONFIG.TOKO.nama;
  $('btn-keluar').addEventListener('click', keluar);
  $('btn-muat').addEventListener('click', async () => { await muat(); toast('Data dimuat ulang.'); });
  await muat();
})();