import { db, config } from 'hatchable';
export const access = 'user';
export const methods = ['POST'];
function fromB64(s) { return Uint8Array.from(atob(s), c => c.charCodeAt(0)); }
async function decrypt(row) {
 const secret = await config.get('AI_KEYS_ENCRYPTION_SECRET');
 if (!secret || !/^[a-f0-9]{64}$/i.test(String(secret).trim())) throw new Error('Server encryption secret is not configured.');
 const raw = Uint8Array.from(String(secret).trim().match(/.{2}/g), x => parseInt(x,16));
 const k = await crypto.subtle.importKey('raw', raw, {name:'AES-GCM'}, false, ['decrypt']);
 const plain = await crypto.subtle.decrypt({name:'AES-GCM', iv:fromB64(row.iv)}, k, fromB64(row.encrypted_key));
 return new TextDecoder().decode(plain);
}
export default async function(req,res) {
 const user=req.user, b=req.body||{}, prompt=String(b.prompt||''), provider=b.provider, model=String(b.model||'');
 if(prompt.length<10||prompt.length>120000) return res.status(400).json({error:'Prompt must be between 10 and 120,000 characters.'});
 if(!['openai','gemini'].includes(provider)) return res.status(400).json({error:'Unsupported AI provider.'});
 const allowedOpenAI=['gpt-4o-mini','gpt-4.1-mini','gpt-4o'], allowedGemini=['gemini-2.5-flash','gemini-2.5-pro'];
 if(!(provider==='openai'?allowedOpenAI:allowedGemini).includes(model)) return res.status(400).json({error:'Unsupported model.'});
 try {
  const {rows}=await db.query('SELECT provider,encrypted_key,iv FROM user_ai_keys WHERE user_id=$1',[user.id]);
  if(!rows[0]) return res.status(400).json({error:'Please save your AI key in Settings first.'});
  if(rows[0].provider!==provider) return res.status(400).json({error:'Your saved key is for '+rows[0].provider+'. Select that provider or change the key in Settings.'});
  const key=await decrypt(rows[0]);
  if(provider==='openai') {
   const r=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},body:JSON.stringify({model,messages:[{role:'system',content:'You are a precise content repurposing strategist.'},{role:'user',content:prompt}],temperature:0.7,max_tokens:12000}),signal:AbortSignal.timeout(55000)});
   const d=await r.json();
   if(!r.ok) return res.status(502).json({error:d.error?.message||'OpenAI request failed. Check your key, model and billing.'});
   return res.json({text:d.choices?.[0]?.message?.content||''});
  }
  const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(model)+':generateContent',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0.7,maxOutputTokens:12000}}),timeout_ms:55000});
  const d=await r.json();
  if(!r.ok) return res.status(502).json({error:d.error?.message||'Gemini request failed. Check your key and billing.'});
  return res.json({text:(d.candidates?.[0]?.content?.parts||[]).map(x=>x.text||'').join('\n')});
 } catch(e) {
  console.error('AI generation failed',e.message);
  return res.status(500).json({error:e.message.includes('Server encryption secret')?e.message:'AI request failed. Please try again.'});
 }
}