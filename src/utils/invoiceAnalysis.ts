
export const ANTHROPIC_KEY_STORAGE_KEY = 'onnenkoukku-anthropic-key';

export function lataaAnthropicKey(): string | null {
  return localStorage.getItem(ANTHROPIC_KEY_STORAGE_KEY);
}
export function tallennaAnthropicKey(key: string): void {
  localStorage.setItem(ANTHROPIC_KEY_STORAGE_KEY, key);
}
export function poistaAnthropicKey(): void {
  localStorage.removeItem(ANTHROPIC_KEY_STORAGE_KEY);
}

export type VesilaskuTulos = {
  tyyppi: 'vesilasku';
  vuosi: number;
  kuukausi: number;
  erapaiva: string;
  perusmaksu: number;
  kayttomaksu: number;
  kommentti?: string;
};

export type KiinteistoveroTulos = {
  tyyppi: 'kiinteistovero';
  vuosi: number;
  maapohjaVero: number;
  rakennukset: { nimi: string; omistajaAvain: 'op1' | 'op2' | null; maara: number }[];
};

export type TunnistamatonTulos = {
  tyyppi: 'tunnistamaton';
  syy: string;
};

export type AnalyysiTulos = VesilaskuTulos | KiinteistoveroTulos | TunnistamatonTulos;

const ANALYYSI_MALLI = 'claude-haiku-4-5-20251001';

const SYSTEM_PROMPT = `You are analyzing a Finnish utility or property tax bill image. Return ONLY a valid JSON object — no markdown, no prose, no code fences.

If it is a water bill (vesilaskut / vesilasku):
Return: { "tyyppi": "vesilasku", "vuosi": <YYYY>, "kuukausi": <1-12>, "erapaiva": "<YYYY-MM-DD>", "perusmaksu": <number>, "kayttomaksu": <number>, "kommentti": "<optional notes or empty string>" }
- kuukausi: use the month the billing PERIOD ends in, not necessarily the month of the due date. E.g. if erapäivä is 2025-01-10 but billing covers December 2024, use kuukausi=12 and vuosi=2024.
- perusmaksu = the base fee line (perusmaksu / grundavgift / fast avgift). kayttomaksu = the usage/consumption fee (käyttömaksu / rörlig avgift).
- All euro amounts as plain numbers (no currency symbols).

If it is a Finnish property tax bill (kiinteistöveropäätös / fastighetsskatt):
Return: { "tyyppi": "kiinteistovero", "vuosi": <YYYY>, "maapohjaVero": <number or 0>, "rakennukset": [ { "nimi": "<building description from bill>", "omistajaAvain": "<op1|op2|null>", "maara": <number> } ] }
- maapohjaVero = the tax amount for tontti/maapohja (plot/land). Use 0 if not present.
- For each building listed: extract its description (e.g. "Pientalo nro 1", "Pientalo nro 2", "Autotalli") and its tax amount.
- Ownership mapping: "Pientalo nro 1" or the first detached house → omistajaAvain "op2". "Pientalo nro 2" or the second detached house → omistajaAvain "op1". Outbuildings/garages shared or unclear → omistajaAvain null. If you cannot determine ownership, use null.

If the image is not a recognizable Finnish bill, return: { "tyyppi": "tunnistamaton", "syy": "<brief explanation in Finnish>" }`;

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(i, i + chunkSize));
  }
  return btoa(binary);
}

function validateTulos(raw: unknown): AnalyysiTulos {
  if (typeof raw !== 'object' || raw === null) throw new Error('Not an object');
  const obj = raw as Record<string, unknown>;
  if (obj.tyyppi === 'vesilasku') {
    return {
      tyyppi: 'vesilasku',
      vuosi: Number(obj.vuosi) || new Date().getFullYear(),
      kuukausi: Math.min(12, Math.max(1, Number(obj.kuukausi) || 1)),
      erapaiva: String(obj.erapaiva ?? ''),
      perusmaksu: Number(obj.perusmaksu) || 0,
      kayttomaksu: Number(obj.kayttomaksu) || 0,
      kommentti: obj.kommentti ? String(obj.kommentti) : undefined,
    };
  }
  if (obj.tyyppi === 'kiinteistovero') {
    const rakennukset = Array.isArray(obj.rakennukset)
      ? obj.rakennukset.map((r: unknown) => {
          const rb = r as Record<string, unknown>;
          const avain = rb.omistajaAvain;
          const omistajaAvain: 'op1' | 'op2' | null =
            avain === 'op1' ? 'op1' : avain === 'op2' ? 'op2' : null;
          return {
            nimi: String(rb.nimi ?? ''),
            omistajaAvain,
            maara: Number(rb.maara) || 0,
          };
        })
      : [];
    return {
      tyyppi: 'kiinteistovero',
      vuosi: Number(obj.vuosi) || new Date().getFullYear(),
      maapohjaVero: Number(obj.maapohjaVero) || 0,
      rakennukset,
    };
  }
  return {
    tyyppi: 'tunnistamaton',
    syy: obj.syy ? String(obj.syy) : 'Tuntematon laskutyyppi',
  };
}

export async function analysoi(file: File, apiKey: string): Promise<AnalyysiTulos> {
  let base64: string;
  try {
    base64 = await fileToBase64(file);
  } catch {
    return { tyyppi: 'tunnistamaton', syy: 'Tiedoston lukeminen epäonnistui' };
  }

  const rawType = file.type || 'image/jpeg';
  if (rawType === 'image/heic' || rawType === 'image/heif') {
    return { tyyppi: 'tunnistamaton', syy: 'HEIC-muoto ei ole tuettu — muunna kuva JPEG-muotoon' };
  }
  const mediaType = rawType;

  let response: Response;
  try {
    response = await fetch('/api/anthropic/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: ANALYYSI_MALLI,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mediaType, data: base64 },
              },
              { type: 'text', text: 'Analysoi tämä lasku ja palauta vain JSON.' },
            ],
          },
        ],
      }),
    });
  } catch {
    return { tyyppi: 'tunnistamaton', syy: 'Verkkovirhe — tarkista internetyhteys' };
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      return { tyyppi: 'tunnistamaton', syy: 'Virheellinen API-avain (401/403)' };
    }
    if (response.status === 429) {
      return { tyyppi: 'tunnistamaton', syy: 'API-kutsujen raja ylitetty — yritä myöhemmin (429)' };
    }
    return { tyyppi: 'tunnistamaton', syy: `API-virhe: HTTP ${response.status}` };
  }

  let json: Record<string, unknown>;
  try {
    json = await response.json();
  } catch {
    return { tyyppi: 'tunnistamaton', syy: 'API palautti virheellisen vastauksen' };
  }

  const content = json.content;
  if (!Array.isArray(content) || content.length === 0) {
    return { tyyppi: 'tunnistamaton', syy: 'API palautti tyhjän vastauksen' };
  }

  const text = (content[0] as Record<string, unknown>).text;
  if (typeof text !== 'string') {
    return { tyyppi: 'tunnistamaton', syy: 'API ei palauttanut tekstiä' };
  }

  try {
    const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/\s*```$/, '');
    const parsed = JSON.parse(cleaned);
    return validateTulos(parsed);
  } catch {
    return { tyyppi: 'tunnistamaton', syy: `JSON-parsinta epäonnistui: ${text.slice(0, 100)}` };
  }
}

