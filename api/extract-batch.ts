import type { VercelRequest, VercelResponse } from '@vercel/node'
import OpenAI from 'openai'

const MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'

const PROMPT = `You are reading one or more photos taken at a trail-running checkpoint. Together they show:
(a) a paper race-bib card with a large printed number, and/or
(b) an Amazfit sportswatch screen — either a "workout summary" screen (an overall distance, an overall pace, and a value explicitly labeled "Duration"), or a "Lap Details" list screen (a header row of icons above several numbered rows; each numbered row has 3 values in this fixed left-to-right order: [lap split time — ignore this column], [lap distance in km], [lap pace per km, shown like "12'53" or "8:23"]).

From ALL photos combined, extract:
- "bib": the race-bib number as digits only (e.g. "001"), or null if no bib card is clearly visible.
- "activity_sec": the total elapsed time value explicitly labeled "Duration" on a workout-summary screen, as an integer number of seconds, or null if not visible.
- "laps": an array of the Lap Details rows in the exact top-to-bottom order they appear on screen, each as {"pace_sec": <integer seconds, read from the 3rd/pace column>, "distance_km": <number, read from the 2nd/distance column, or null if unclear>}. Skip the 1st (lap split time) column entirely. If no Lap Details screen is visible, return an empty array.

Do not guess or infer values you cannot clearly read — use null instead. Ignore heart rate, calories, battery percentage, step count, and clock time.

Respond with strict JSON only, in this exact shape:
{"bib": "001" | null, "activity_sec": <integer> | null, "laps": [{"pace_sec": <integer>, "distance_km": <number|null>}, ...]}`

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

  const { imageDataUrls } = req.body ?? {}
  if (
    !Array.isArray(imageDataUrls) ||
    imageDataUrls.length === 0 ||
    !imageDataUrls.every((u) => typeof u === 'string' && u.startsWith('data:image/'))
  ) {
    res.status(400).json({ error: 'imageDataUrls (array of data: URLs) is required' })
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
            ...imageDataUrls.map((url) => ({ type: 'image_url' as const, image_url: { url } })),
          ],
        },
      ],
    })

    const content = completion.choices[0]?.message?.content ?? '{}'
    const parsed = JSON.parse(content)
    res.status(200).json({
      bib: typeof parsed.bib === 'string' ? parsed.bib : null,
      activity_sec: Number.isFinite(parsed.activity_sec) ? parsed.activity_sec : null,
      laps: Array.isArray(parsed.laps) ? parsed.laps : [],
    })
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'Extraction failed' })
  }
}
