const db = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

function urlFoto(path) {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return db.storage.from(CONFIG.BUCKET_FOTO).getPublicUrl(path).data.publicUrl;
}