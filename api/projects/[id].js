import { db } from 'hatchable';
export const access = 'user';
export const methods = ['DELETE'];
export default async function(req,res){
 const id=String(req.params.id||'');
 if(!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({error:'Invalid project id.'});
 const result=await db.query('DELETE FROM projects WHERE id=$1::uuid AND user_id=$2',[id,req.user.id]);
 if(!result.rowCount) return res.status(404).json({error:'Project not found.'});
 return res.json({ok:true});
}