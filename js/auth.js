// js/auth.js
// Login penjual (Supabase Auth). Dipakai di admin/login.html dan semua halaman admin.
// PENTING: ini cuma pengalaman pengguna (redirect). Keamanan sebenarnya ada di RLS.

// ---------- untuk halaman admin (pesanan, produk) ----------
// Panggil di awal: const sesi = await wajibLogin();
async function wajibLogin() {
  const { data: { session } } = await db.auth.getSession();
  if (!session) {
    location.replace('login.html');
    return new Promise(() => {});          // hentikan eksekusi, halaman sedang pindah
  }
  document.body.classList.remove('cek');   // tampilkan halaman
  // kalau sesi habis / logout dari tab lain, tendang ke login
  db.auth.onAuthStateChange(event => {
    if (event === 'SIGNED_OUT') location.replace('login.html');
  });
  return session;
}

async function keluar() {
  await db.auth.signOut();
  location.replace('login.html');
}

// ---------- untuk halaman login ----------
const formLogin = document.getElementById('form-login');
if (formLogin) {
  const galat = document.getElementById('galat');
  const btn = document.getElementById('btn-masuk');
  document.getElementById('nama-toko').textContent = CONFIG.TOKO.nama;

  // sudah login? langsung ke halaman pesanan
  db.auth.getSession().then(({ data: { session } }) => {
    if (session) location.replace('pesanan.html');
  });

  formLogin.addEventListener('submit', async e => {
    e.preventDefault();
    const email = formLogin.email.value.trim();
    const password = formLogin.password.value;

    if (!email || !password) { galat.textContent = 'Email dan kata sandi wajib diisi.'; return; }

    galat.textContent = '';
    btn.disabled = true;
    btn.textContent = 'Memeriksa...';

    const { error } = await db.auth.signInWithPassword({ email, password });

    if (error) {
      galat.textContent = /invalid login/i.test(error.message)
        ? 'Email atau kata sandi salah.'
        : 'Gagal masuk. Periksa koneksi lalu coba lagi.';
      btn.disabled = false;
      btn.textContent = 'Masuk';
      return;
    }
    location.replace('pesanan.html');
  });
}