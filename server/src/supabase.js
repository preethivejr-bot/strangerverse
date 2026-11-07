import dotenv from 'dotenv';
dotenv.config();

let supabaseClient = null;

// Initialize Supabase if credentials are provided in .env
if (process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)) {
  try {
    // Dynamic import to avoid crash if @supabase/supabase-js is not installed
    const { createClient } = await import('@supabase/supabase-js');
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    supabaseClient = createClient(process.env.SUPABASE_URL, key, {
      auth: { persistSession: false }
    });
    console.log('[Supabase] Connected to 24/7 cloud database at', process.env.SUPABASE_URL);
  } catch (err) {
    console.warn('[Supabase] Initialization warning:', err.message);
  }
} else {
  console.log('[Supabase] No SUPABASE_URL configured. Running with in-memory resilient store. (Add SUPABASE_URL in .env to enable 24/7 database syncing)');
}

export async function syncUserToSupabase(user) {
  if (!supabaseClient || !user) return;
  try {
    const { error } = await supabaseClient
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email,
        display_name: user.displayName,
        photo_url: user.photoURL,
        role: user.role,
        status: user.status,
        is_banned: Boolean(user.isBanned),
        is_suspended: Boolean(user.isSuspended),
        registered_at: user.registeredAt ? new Date(user.registeredAt).toISOString() : new Date().toISOString(),
        last_active: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) console.warn('[Supabase] syncUser error:', error.message);
  } catch (e) {
    console.warn('[Supabase] syncUser exception:', e.message);
  }
}

export async function saveReportToSupabase(report) {
  if (!supabaseClient || !report) return;
  try {
    await supabaseClient.from('reports').insert({
      id: report.id,
      reporter_id: report.reporterId,
      reported_user_id: report.reportedUserId,
      reason: report.reason,
      details: report.details,
      context: report.context,
      status: report.status || 'PENDING'
    });
  } catch (e) {
    console.warn('[Supabase] saveReport exception:', e.message);
  }
}

export async function saveAuditLogToSupabase(log) {
  if (!supabaseClient || !log) return;
  try {
    await supabaseClient.from('audit_logs').insert({
      id: log.id,
      actor_id: log.actorId,
      actor_name: log.actorName,
      actor_role: log.actorRole,
      action: log.action,
      details: log.details,
      target_user_id: log.targetUserId
    });
  } catch (e) {
    console.warn('[Supabase] saveAuditLog exception:', e.message);
  }
}

export { supabaseClient };
