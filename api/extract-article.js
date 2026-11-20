import { browser } from 'hatchable';
export const access = 'user';
export const methods = ['POST'];

function isPublicWebUrl(raw) {
  let u;
  try { u = new URL(String(raw || '').trim()); } catch { return false; }
  if (!['http:', 'https:'].includes(u.protocol)) return false;
  const h = u.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!h || h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || !h.includes('.')) return false;
  if (/^(127\.|10\.|192\.168\.|169\.254\.)/.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h) || h === '::1' || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80:')) return false;
  if (u.username || u.password) return false;
  return true;
}

export default async function(req, res) {
  const raw = String(req.body?.url || '').trim();
  if (!isPublicWebUrl(raw)) return res.status(400).json({ error: 'Enter a valid public article URL (http or https). Private and local addresses are not supported.' });
  try {
    const result = await browser.session(async (page) => {
      await page.goto(raw, { waitUntil: 'domcontentloaded' });
      const extracted = await page.evaluate(() => {
        const title = document.title || '';
        const candidates = Array.from(document.querySelectorAll('article, main, [role="main"]'));
        const root = candidates.sort((a,b) => (b.innerText || '').length - (a.innerText || '').length)[0] || document.body;
        const clone = root.cloneNode(true);
        clone.querySelectorAll('script,style,noscript,nav,footer,header,aside,form,button,svg,iframe').forEach(el => el.remove());
        return { title, text: (clone.innerText || clone.textContent || '').replace(/\n{3,}/g, '\n\n').trim() };
      });
      return extracted;
    });
    const text = String(result?.text || '').trim();
    if (text.length < 300) return res.status(422).json({ error: 'We could not extract enough readable article text. This site may block automated reading; paste the article text instead.' });
    return res.json({ title: String(result.title || '').slice(0, 300), text: text.slice(0, 35000), truncated: text.length > 35000 });
  } catch (e) {
    return res.status(422).json({ error: 'Could not read this page. The website may block automated access; paste its text instead.' });
  }
}