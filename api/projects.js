import { db } from 'hatchable';
export const access = 'user';
export const methods = ['GET','POST'];
export default async function(req,res){
 const user=req.user;
 if(req.method==='GET'){
  const {rows}=await db.query('SELECT id,title,source_type,source_url,source_text,language,tone,brand_settings,outputs,created_at,updated_at FROM projects WHERE user_id=$1 ORDER BY updated_at DESC LIMIT 100',[user.id]);
  return res.json({projects:rows});
 }
 const b=req.body||{};
 const title=String(b.title||'Untitled project').trim().slice(0,180);
 const sourceText=String(b.source_text||'');
 if(sourceText.length>100000) return res.status(413).json({error:'Source text is too large (100 KB max).'});
 if(!sourceText.trim()) return res.status(400).json({error:'Source text is required.'});
 const licenseResult=await db.query("SELECT l.project_limit,CASE WHEN l.status='active' AND (c.status IS NULL OR c.status<>'revoked') THEN 'active' ELSE 'revoked' END AS effective_status FROM user_licenses l LEFT JOIN license_codes c ON c.id=l.code_id WHERE l.user_id=$1 LIMIT 1",[user.id]);
 const projectLimit=licenseResult.rows[0]?.effective_status==='active'?Number(licenseResult.rows[0].project_limit):3;
 const usageResult=await db.query('SELECT COUNT(*)::int AS total FROM projects WHERE user_id=$1',[user.id]);
 if(Number(usageResult.rows[0]?.total||0)>=projectLimit) return res.status(403).json({error:'Project limit reached for your current plan. Activate a lifetime license to unlock more projects.'});
 const allowed=['text','article','youtube','file'];
 const sourceType=allowed.includes(b.source_type)?b.source_type:'text';
 const language=b.language==='ar'?'ar':'en';
 const tone=String(b.tone||'professional').slice(0,40);
 const brand=JSON.stringify(b.brand_settings&&typeof b.brand_settings==='object'?b.brand_settings:{});
 const outputs=JSON.stringify(b.outputs&&typeof b.outputs==='object'?b.outputs:{});
 if(outputs.length>300000) return res.status(413).json({error:'Generated content is too large to save.'});
 const {rows}=await db.query('INSERT INTO projects (user_id,title,source_type,source_url,source_text,language,tone,brand_settings,outputs) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb) RETURNING id,title,source_type,source_url,source_text,language,tone,brand_settings,outputs,created_at,updated_at',[user.id,title,sourceType,String(b.source_url||'').slice(0,2000),sourceText,language,tone,brand,outputs]);
 return res.status(201).json({project:rows[0]});
}