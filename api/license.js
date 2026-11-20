import { db } from 'hatchable';
export const access = 'user';
export const methods = ['GET','POST'];
const limits = { starter: 20, pro: 100, agency: 1000 };
async function hashCode(value) {
  const bytes = new TextEncoder().encode(value.trim().toUpperCase());
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map(x => x.toString(16).padStart(2,'0')).join('');
}
export default async function(req,res) {
  const userId = String(req.user.id);
  if (req.method === 'GET') {
    const { rows } = await db.query("SELECT l.plan,l.source,CASE WHEN l.status='active' AND (c.status IS NULL OR c.status<>'revoked') THEN 'active' ELSE 'revoked' END AS status,l.project_limit,l.advanced_exports,l.client_workspaces,l.activated_at FROM user_licenses l LEFT JOIN license_codes c ON c.id=l.code_id WHERE l.user_id=$1 LIMIT 1",[userId]);
    const license = rows[0] || null;
    const count = await db.query('SELECT COUNT(*)::int AS total FROM projects WHERE user_id=$1',[userId]);
    return res.json({license,projects_used:Number(count.rows[0]?.total||0),free_project_limit:3});
  }
  const code = String(req.body?.code||'').trim().toUpperCase();
  if (!/^RPK-[A-F0-9]{24}$/.test(code)) return res.status(400).json({error:'Invalid license code format.'});
  const existing = await db.query('SELECT id,status FROM user_licenses WHERE user_id=$1 LIMIT 1',[userId]);
  if (existing.rows.length) return res.status(409).json({error:'This account already has a license. Contact support to change or replace it.'});
  const codeHash = await hashCode(code);
  try {
    const result = await db.transaction([
      {sql:"UPDATE license_codes SET status='redeemed',redeemed_by=$1,redeemed_at=NOW() WHERE code_hash=$2 AND status='available' AND NOT EXISTS (SELECT 1 FROM user_licenses WHERE user_id=$1) RETURNING id,plan,source",params:[userId,codeHash]},
      {sql:"INSERT INTO user_licenses (user_id,code_id,plan,source,status,project_limit,advanced_exports,client_workspaces) SELECT $1,id,plan,source,'active',CASE plan WHEN 'starter' THEN 20 WHEN 'pro' THEN 100 ELSE 1000 END,plan IN ('pro','agency'),plan='agency' FROM license_codes WHERE code_hash=$2 AND redeemed_by=$1 AND status='redeemed' ON CONFLICT (user_id) DO NOTHING RETURNING plan,source,status,project_limit,advanced_exports,client_workspaces",params:[userId,codeHash]}
    ]);
    const claimed = result.results?.[0]?.rows?.[0];
    const license = result.results?.[1]?.rows?.[0];
    if (!claimed || !license) return res.status(409).json({error:'This code is invalid, already redeemed, or cannot be activated on this account.'});
    return res.status(201).json({ok:true,license});
  } catch (error) {
    return res.status(500).json({error:'Could not activate this license. Please try again.'});
  }
}