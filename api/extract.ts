import type { VercelRequest, VercelResponse } from '@vercel/node'
import OpenAI from 'openai'

const MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'

const PROMPT = `You are reading a photo taken at a trail-running checkpoint. It usually shows a runner's sportswatch display (workout summary or lap list) and sometimes a race bib card.

Extract every distinct value you can clearly read that is either:
- a time (a lap time, pace-per-km, or elapsed duration, shown like "0:07.73", "15'51", "8:23", "1:32:10")
- a distance in kilometers (shown like "0.03", "1.52")

Do not guess or infer values you cannot clearly read on the screen. If the display is blurry, reflective, or cropped, skip that value rather than guessing. Ignore step counts, heart rate, battery percentage, and calendar/clock time.

Respond with strict JSON only, in this exact shape:
{"readings": [{"type": "time", "seconds": <integer total seconds>}, {"type": "distance", "km": <number>}]}`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'OPENAI_API_KEY is not configured on the server' })
    return
  }

  const { imageDataUrl } = req.body ?? {}
  if (typeof imageDataUrl !== 'string' || !imageDataUrl.startsWith('data:image/')) {
    res.status(400).json({ error: 'imageDataUrl (data: URL) is required' })
    return
  }

  try {
    const client = new OpenAI({ apiKey })
    const completion = await client.chat.completions.create({
      model: MODEL,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: PROMPT },
            { type: 'image_url', image_url: { url: imageDataUrl } },
          ],
        },
      ],
    })

    const content = completion.choices[0]?.message?.content ?? '{}'
    const parsed = JSON.parse(content)
    const readings = Array.isArray(parsed.readings) ? parsed.readings : []
    res.status(200).json({ readings })
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'Extraction failed' })
  }
}
