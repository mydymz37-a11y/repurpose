import { browser } from 'hatchable';
export const access = 'user';
export const methods = ['POST'];

function getVideoId(raw) {
  try {
    const u = new URL(String(raw || '').trim());
    const host = u.hostname.toLowerCase().replace(/^www\./, '');
    if (host === 'youtu.be') return u.pathname.split('/').filter(Boolean)[0] || '';
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      if (u.pathname === '/watch') return u.searchParams.get('v') || '';
      const parts = u.pathname.split('/').filter(Boolean);
      if (['shorts','embed','live'].includes(parts[0])) return parts[1] || '';
    }
  } catch {}
  return '';
}

export default async function(req, res) {
  const videoId = getVideoId(req.body?.url);
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) return res.status(400).json({ error: 'Enter a valid public YouTube video URL.' });
  try {
    const result = await browser.session(async (page) => {
      await page.goto('https://www.youtube.com/watch?v=' + videoId, { waitUntil: 'domcontentloaded' });
      return await page.evaluate(async () => {
        const player = window.ytInitialPlayerResponse || {};
        const tracks = player.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
        if (!tracks.length) return { error: 'No public captions or transcript are available for this video.' };
        const track = tracks.find(t => /^en(-|$)/i.test(t.languageCode || '')) || tracks[0];
        const response = await fetch(track.baseUrl);
        if (!response.ok) return { error: 'YouTube did not provide the transcript.' };
        const xml = await response.text();
        const doc = new DOMParser().parseFromString(xml, 'text/xml');
        const text = Array.from(doc.querySelectorAll('text')).map(n => n.textContent || '').join(' ').replace(/\s+/g, ' ').trim();
        return { text, language: track.languageCode || '' };
      });
    });
    if (result?.error) return res.status(422).json({ error: result.error });
    const text = String(result?.text || '').trim();
    if (text.length < 40) return res.status(422).json({ error: 'The transcript is empty or unavailable. Paste a transcript manually instead.' });
    return res.json({ text: text.slice(0, 35000), language: result.language || '', truncated: text.length > 35000 });
  } catch (e) {
    return res.status(422).json({ error: 'Could not retrieve this YouTube transcript. Captions may be disabled or blocked; paste the transcript manually.' });
  }
}