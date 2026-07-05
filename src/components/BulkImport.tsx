import { useState, useRef } from 'react';
import heic2any from 'heic2any';
import { tallennaTiedosto } from '../utils/fileStorage';
import type { VuosiData, Vesilasku, Osapuoli } from '../types';
import { analysoi, lataaAnthropicKey } from '../utils/invoiceAnalysis';
import type { AnalyysiTulos, VesilaskuTulos, KiinteistoveroTulos } from '../utils/invoiceAnalysis';
import { KUUKAUDET } from '../utils/calculations';

interface Props {
  vuosi: number;
  vuosiData: VuosiData;
  osapuolet: [Osapuoli, Osapuoli];
  onConfirm: (
    vesilaskuPaivitykset: Partial<Vesilasku>[],
    kiinteistoTulos: KiinteistoveroTulos | null,
    liiteIdt: Record<string, string>
  ) => void;
  onClose: () => void;
}

type VaiheStatus = 'odottaa' | 'analysoidaan' | 'valmis' | 'virhe';

interface TiedostoTila {
  tiedosto: File;
  previewUrl: string;
  status: VaiheStatus;
  tulos: AnalyysiTulos | null;
  ohita: boolean;
  muokattuTulos: AnalyysiTulos | null;
}

type Vaihe = 'valinta' | 'analyysi' | 'tarkistus';

function isHeic(file: File): boolean {
  return (
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    /\.(heic|heif)$/i.test(file.name)
  );
}

async function muunnaJaLisaa(file: File): Promise<File | null> {
  if (!isHeic(file)) return file;
  const nimi = file.name.replace(/\.(heic|heif)$/i, '.jpg');
  // Ensin heic2any
  try {
    const result = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 });
    const blob = Array.isArray(result) ? result[0] : result;
    return new File([blob], nimi, { type: 'image/jpeg' });
  } catch { /* fall through */ }
  // Canvas-fallback: toimii Safarissa ja Chromessa (macOS natiivi HEIC-tuki)
  try {
    const url = URL.createObjectURL(file);
    const blob = await new Promise<Blob | null>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d')!.drawImage(img, 0, 0);
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.85);
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
    URL.revokeObjectURL(url);
    if (blob) return new File([blob], nimi, { type: 'image/jpeg' });
  } catch { /* fall through */ }
  return null;
}

export default function BulkImport({ vuosi, vuosiData, osapuolet, onConfirm, onClose }: Props) {
  const [vaihe, setVaihe] = useState<Vaihe>('valinta');
  const [tiedostot, setTiedostot] = useState<TiedostoTila[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [tallentaa, setTallentaa] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const apiKey = lataaAnthropicKey();

  const lisaaTiedostot = async (lista: FileList | File[]) => {
    const arr = Array.from(lista);
    const uudet: TiedostoTila[] = [];
    for (const f of arr) {
      const muunnettu = await muunnaJaLisaa(f);
      if (!muunnettu) {
        alert(`HEIC-muunnos epäonnistui: ${f.name}\nVie kuva JPEG-muotoon ja yritä uudelleen.`);
        continue;
      }
      const url = URL.createObjectURL(muunnettu);
      uudet.push({
        tiedosto: muunnettu,
        previewUrl: url,
        status: 'odottaa',
        tulos: null,
        ohita: false,
        muokattuTulos: null,
      });
    }
    setTiedostot((prev) => [...prev, ...uudet]);
    if (inputRef.current) inputRef.current.value = '';
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) lisaaTiedostot(e.target.files);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) lisaaTiedostot(e.dataTransfer.files);
  };

  const poistaTiedosto = (idx: number) => {
    setTiedostot((prev) => {
      URL.revokeObjectURL(prev[idx].previewUrl);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const analysoi_ = async () => {
    if (!apiKey || tiedostot.length === 0) return;
    setVaihe('analyysi');
    const paivitetty = [...tiedostot];
    for (let i = 0; i < paivitetty.length; i++) {
      paivitetty[i] = { ...paivitetty[i], status: 'analysoidaan' };
      setTiedostot([...paivitetty]);
      const tulos = await analysoi(paivitetty[i].tiedosto, apiKey);
      paivitetty[i] = {
        ...paivitetty[i],
        status: 'valmis',
        tulos,
        muokattuTulos: JSON.parse(JSON.stringify(tulos)),
        ohita: tulos.tyyppi === 'tunnistamaton',
      };
      setTiedostot([...paivitetty]);
    }
    setVaihe('tarkistus');
  };

  const paivitaMuokattuTulos = (idx: number, paivitys: Partial<VesilaskuTulos> | Partial<KiinteistoveroTulos>) => {
    setTiedostot((prev) =>
      prev.map((t, i) =>
        i === idx
          ? { ...t, muokattuTulos: { ...(t.muokattuTulos as object), ...paivitys } as AnalyysiTulos }
          : t
      )
    );
  };

  const paivitaRakennus = (tiedostoIdx: number, rakIdx: number, kentta: string, arvo: string | number) => {
    setTiedostot((prev) =>
      prev.map((t, i) => {
        if (i !== tiedostoIdx || !t.muokattuTulos || t.muokattuTulos.tyyppi !== 'kiinteistovero') return t;
        const tulos = t.muokattuTulos as KiinteistoveroTulos;
        const rakennukset = tulos.rakennukset.map((r, ri) =>
          ri === rakIdx ? { ...r, [kentta]: arvo } : r
        );
        return { ...t, muokattuTulos: { ...tulos, rakennukset } };
      })
    );
  };

  const vahvista = async () => {
    setTallentaa(true);
    const liiteIdt: Record<string, string> = {};
    const vesilaskuPaivitykset: Partial<Vesilasku>[] = [];
    let kiinteistoTulos: KiinteistoveroTulos | null = null;

    for (const t of tiedostot) {
      if (t.ohita || !t.muokattuTulos) continue;
      const id = await tallennaTiedosto(t.tiedosto);
      if (t.muokattuTulos.tyyppi === 'vesilasku') {
        const vt = t.muokattuTulos as VesilaskuTulos;
        liiteIdt[`vesilasku-${vt.kuukausi}`] = id;
        vesilaskuPaivitykset.push({
          kuukausi: vt.kuukausi,
          erapaiva: vt.erapaiva,
          perusmaksu: vt.perusmaksu,
          kayttomaksu: vt.kayttomaksu,
          kommentti: vt.kommentti,
        });
      } else if (t.muokattuTulos.tyyppi === 'kiinteistovero') {
        liiteIdt['kiinteistovero'] = id;
        kiinteistoTulos = t.muokattuTulos as KiinteistoveroTulos;
      }
    }

    onConfirm(vesilaskuPaivitykset, kiinteistoTulos, liiteIdt);
    setTallentaa(false);
  };

  const aktiivisiaKpl = tiedostot.filter((t) => !t.ohita).length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 overflow-y-auto py-6 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Analysoi laskuja – {vuosi}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="p-6 space-y-4">
          {/* Vaihe: valinta */}
          {(vaihe === 'valinta') && (
            <>
              {!apiKey && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
                  <span>⚠</span>
                  <span>Anthropic API-avain puuttuu. Aseta se <strong>Asetuksissa</strong> ennen analyysiä.</span>
                </div>
              )}

              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                  dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
              >
                <div className="text-3xl mb-2">📷</div>
                <p className="text-gray-600 mb-3">
                  {dragOver ? 'Pudota kuvat tähän' : 'Valitse tai pudota laskujen kuvat tähän'}
                </p>
                <label className="cursor-pointer inline-block bg-blue-600 text-white text-sm rounded-lg px-4 py-2 hover:bg-blue-700">
                  Valitse kuvat
                  <input
                    ref={inputRef}
                    type="file"
                    accept="image/*,.heic,.heif"
                    multiple
                    onChange={onFileChange}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-gray-400 mt-2">Tuetut formaatit: JPEG, PNG, HEIC, WebP</p>
              </div>

              {tiedostot.length > 0 && (
                <div className="space-y-2">
                  {tiedostot.map((t, i) => (
                    <div key={i} className="flex items-center gap-3 border border-gray-200 rounded-lg p-2">
                      <img src={t.previewUrl} alt="" className="w-12 h-12 object-cover rounded" />
                      <span className="flex-1 text-sm text-gray-700 truncate">{t.tiedosto.name}</span>
                      <button onClick={() => poistaTiedosto(i)} className="text-gray-400 hover:text-red-500">×</button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Vaihe: analyysi */}
          {vaihe === 'analyysi' && (
            <div className="space-y-2">
              <p className="text-sm text-gray-600 mb-3">Analysoidaan laskuja…</p>
              {tiedostot.map((t, i) => (
                <div key={i} className="flex items-center gap-3 border border-gray-100 rounded-lg p-3">
                  <img src={t.previewUrl} alt="" className="w-10 h-10 object-cover rounded" />
                  <span className="flex-1 text-sm text-gray-700 truncate">{t.tiedosto.name}</span>
                  {t.status === 'odottaa' && <span className="text-xs text-gray-400">Odottaa…</span>}
                  {t.status === 'analysoidaan' && (
                    <span className="text-xs text-blue-600 animate-pulse">Analysoidaan…</span>
                  )}
                  {t.status === 'valmis' && t.tulos?.tyyppi === 'tunnistamaton' && (
                    <span className="text-xs text-amber-600">⚠ Ei tunnistettu</span>
                  )}
                  {t.status === 'valmis' && t.tulos?.tyyppi === 'vesilasku' && (
                    <span className="text-xs text-green-600">✓ Vesilasku</span>
                  )}
                  {t.status === 'valmis' && t.tulos?.tyyppi === 'kiinteistovero' && (
                    <span className="text-xs text-green-600">✓ Kiinteistövero</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Vaihe: tarkistus */}
          {vaihe === 'tarkistus' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">Tarkista tiedot ennen tallennusta. Voit muokata kenttiä.</p>
              {tiedostot.map((t, i) => (
                <div key={i} className={`border rounded-xl p-4 ${t.ohita ? 'border-gray-200 opacity-60' : 'border-gray-300'}`}>
                  <div className="flex items-start gap-3 mb-3">
                    <img
                      src={t.previewUrl}
                      alt=""
                      className="w-16 h-16 object-cover rounded cursor-pointer hover:opacity-80"
                      onClick={() => window.open(t.previewUrl, '_blank')}
                      title="Avaa kuva"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">{t.tiedosto.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {t.muokattuTulos?.tyyppi === 'vesilasku' && 'Vesilasku'}
                        {t.muokattuTulos?.tyyppi === 'kiinteistovero' && 'Kiinteistövero'}
                        {t.muokattuTulos?.tyyppi === 'tunnistamaton' && '⚠ Ei tunnistettu'}
                      </p>
                    </div>
                    <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={t.ohita}
                        onChange={(e) =>
                          setTiedostot((prev) =>
                            prev.map((x, xi) => xi === i ? { ...x, ohita: e.target.checked } : x)
                          )
                        }
                      />
                      Ohita
                    </label>
                  </div>

                  {!t.ohita && t.muokattuTulos?.tyyppi === 'vesilasku' && (
                    <VesilaskuKortti
                      tulos={t.muokattuTulos as VesilaskuTulos}
                      vuosiData={vuosiData}
                      onChange={(p) => paivitaMuokattuTulos(i, p)}
                    />
                  )}

                  {!t.ohita && t.muokattuTulos?.tyyppi === 'kiinteistovero' && (
                    <KiinteistoveroKortti
                      tulos={t.muokattuTulos as KiinteistoveroTulos}
                      osapuolet={osapuolet}
                      onChange={(p) => paivitaMuokattuTulos(i, p)}
                      onRakennusChange={(ri, k, v) => paivitaRakennus(i, ri, k, v)}
                    />
                  )}

                  {t.muokattuTulos?.tyyppi === 'tunnistamaton' && (
                    <p className="text-xs text-amber-700 bg-amber-50 rounded px-3 py-2">
                      {(t.muokattuTulos as { syy: string }).syy}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">
            Peruuta
          </button>
          <div className="flex gap-2">
            {vaihe === 'valinta' && (
              <button
                onClick={analysoi_}
                disabled={!apiKey || tiedostot.length === 0}
                className="text-sm bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Analysoi {tiedostot.length > 0 ? `(${tiedostot.length} kuvaa)` : ''}
              </button>
            )}
            {vaihe === 'tarkistus' && (
              <button
                onClick={vahvista}
                disabled={tallentaa || aktiivisiaKpl === 0}
                className="text-sm bg-green-600 text-white rounded-lg px-4 py-2 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {tallentaa ? 'Tallennetaan…' : `Tallenna ${aktiivisiaKpl > 0 ? `(${aktiivisiaKpl} laskua)` : ''}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function VesilaskuKortti({
  tulos,
  vuosiData,
  onChange,
}: {
  tulos: VesilaskuTulos;
  vuosiData: VuosiData;
  onChange: (p: Partial<VesilaskuTulos>) => void;
}) {
  const olemassaoleva = vuosiData.vesilaskut.find((v) => v.kuukausi === tulos.kuukausi);
  const onYlikirjoitus = olemassaoleva && (olemassaoleva.perusmaksu > 0 || olemassaoleva.kayttomaksu > 0);

  return (
    <div className="space-y-2">
      {onYlikirjoitus && (
        <div className="bg-amber-50 border border-amber-200 rounded px-3 py-1.5 text-xs text-amber-800">
          ⚠ Kuukausi {KUUKAUDET[tulos.kuukausi - 1]} sisältää jo tietoja — ylikirjoitetaan
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500 block mb-0.5">Kuukausi</label>
          <select
            value={tulos.kuukausi}
            onChange={(e) => onChange({ kuukausi: parseInt(e.target.value) })}
            className="border border-gray-200 rounded px-2 py-1 text-sm w-full"
          >
            {KUUKAUDET.map((kk, idx) => (
              <option key={idx + 1} value={idx + 1}>{kk}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-0.5">Eräpäivä</label>
          <input
            type="date"
            value={tulos.erapaiva}
            onChange={(e) => onChange({ erapaiva: e.target.value })}
            className="border border-gray-200 rounded px-2 py-1 text-sm w-full"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-0.5">Perusmaksu €</label>
          <input
            type="number"
            value={tulos.perusmaksu || ''}
            onChange={(e) => onChange({ perusmaksu: parseFloat(e.target.value) || 0 })}
            step="0.01"
            className="border border-gray-200 rounded px-2 py-1 text-sm w-full text-right"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-0.5">Käyttömaksu €</label>
          <input
            type="number"
            value={tulos.kayttomaksu || ''}
            onChange={(e) => onChange({ kayttomaksu: parseFloat(e.target.value) || 0 })}
            step="0.01"
            className="border border-gray-200 rounded px-2 py-1 text-sm w-full text-right"
          />
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-500 block mb-0.5">Kommentti</label>
        <input
          type="text"
          value={tulos.kommentti ?? ''}
          onChange={(e) => onChange({ kommentti: e.target.value })}
          className="border border-gray-200 rounded px-2 py-1 text-sm w-full"
          placeholder="Valinnainen kommentti"
        />
      </div>
    </div>
  );
}

function KiinteistoveroKortti({
  tulos,
  osapuolet,
  onChange,
  onRakennusChange,
}: {
  tulos: KiinteistoveroTulos;
  osapuolet: [Osapuoli, Osapuoli];
  onChange: (p: Partial<KiinteistoveroTulos>) => void;
  onRakennusChange: (idx: number, kentta: string, arvo: string | number) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-gray-500 block mb-0.5">Maapohjavero €</label>
        <input
          type="number"
          value={tulos.maapohjaVero || ''}
          onChange={(e) => onChange({ maapohjaVero: parseFloat(e.target.value) || 0 })}
          step="0.01"
          className="border border-gray-200 rounded px-2 py-1 text-sm w-40 text-right"
        />
      </div>
      {tulos.rakennukset.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-1.5">Rakennukset</p>
          <div className="space-y-2">
            {tulos.rakennukset.map((r, i) => (
              <div
                key={i}
                className={`grid grid-cols-3 gap-2 p-2 rounded-lg border ${
                  r.omistajaAvain === null ? 'border-amber-300 bg-amber-50' : 'border-gray-200'
                }`}
              >
                <div>
                  <label className="text-xs text-gray-400 block mb-0.5">Rakennus</label>
                  <input
                    type="text"
                    value={r.nimi}
                    onChange={(e) => onRakennusChange(i, 'nimi', e.target.value)}
                    className="border border-gray-200 rounded px-2 py-1 text-xs w-full bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-0.5">
                    Omistaja {r.omistajaAvain === null && <span className="text-amber-600">⚠ valitse</span>}
                  </label>
                  <select
                    value={r.omistajaAvain ?? ''}
                    onChange={(e) => onRakennusChange(i, 'omistajaAvain', e.target.value || '')}
                    className={`border rounded px-2 py-1 text-xs w-full ${
                      r.omistajaAvain === null ? 'border-amber-400 bg-amber-50' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <option value="">— valitse —</option>
                    <option value="op1">{osapuolet[0].nimi}</option>
                    <option value="op2">{osapuolet[1].nimi}</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-0.5">Vero €</label>
                  <input
                    type="number"
                    value={r.maara || ''}
                    onChange={(e) => onRakennusChange(i, 'maara', parseFloat(e.target.value) || 0)}
                    step="0.01"
                    className="border border-gray-200 rounded px-2 py-1 text-xs w-full text-right bg-white"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
