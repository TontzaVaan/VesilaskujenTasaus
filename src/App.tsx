import { useRef, useState } from 'react';
import { useAppData } from './hooks/useAppData';
import { tyhjaVuosiData } from './utils/storage';
import { exportExcel, exportJSON, importJSON } from './utils/exportImport';
import type { VuosiStatus, Vesilasku, RakennusVero } from './types';
import Maksut from './components/Maksut';
import Vesilaskut from './components/Vesilaskut';
import Vesikulutus from './components/Vesikulutus';
import Kiinteistovero from './components/Kiinteistovero';
import MuutKulut from './components/MuutKulut';
import Tasaus from './components/Tasaus';
import Historia from './components/Historia';
import Asetukset from './components/Asetukset';
import GitHubSync from './components/GitHubSync';
import BulkImport from './components/BulkImport';
import { tunnistaDublikaatit } from './utils/calculations';
import type { KiinteistoveroTulos } from './utils/invoiceAnalysis';
import type { MaksuPaivitys } from './components/BulkImport';

type Valilehti = 'maksut' | 'vesilaskut' | 'vesikulutus' | 'kiinteistovero' | 'muut' | 'tasaus';

const VALILEHDET: { id: Valilehti; label: string }[] = [
  { id: 'maksut', label: 'Maksut' },
  { id: 'vesilaskut', label: 'Vesilaskut' },
  { id: 'vesikulutus', label: 'Vesikulutus' },
  { id: 'kiinteistovero', label: 'Kiinteistövero' },
  { id: 'muut', label: 'Muut kulut' },
  { id: 'tasaus', label: 'Tasaus' },
];

const STATUS_VALINNAT: { arvo: VuosiStatus; label: string }[] = [
  { arvo: 'uusi', label: 'Uusi' },
  { arvo: 'kesken', label: 'Kesken' },
  { arvo: 'katselmoinnissa', label: 'Katselmoinnissa' },
  { arvo: 'valmis', label: 'Valmis' },
];

function statusVari(status: VuosiStatus | undefined): string {
  switch (status) {
    case 'kesken': return 'bg-yellow-400';
    case 'katselmoinnissa': return 'bg-blue-400';
    case 'valmis': return 'bg-green-500';
    default: return 'bg-gray-300';
  }
}

function statusBadgeClass(status: VuosiStatus | undefined): string {
  switch (status) {
    case 'kesken': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'katselmoinnissa': return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'valmis': return 'bg-green-100 text-green-800 border-green-300';
    default: return 'bg-gray-100 text-gray-600 border-gray-200';
  }
}

export default function App() {
  const { data, paivitaVuosi, lisaaVuosi, paivitaAsetukset, alustaData, githubSnapshot, setGithubSnapshot } = useAppData();
  const importInputRef = useRef<HTMLInputElement>(null);
  const [importVirhe, setImportVirhe] = useState<string | null>(null);
  const [nakyma, setNakyma] = useState<number | 'historia'>(() => {
    const vuodet = data.vuodet.map((v) => v.vuosi).sort();
    return vuodet[vuodet.length - 1] ?? new Date().getFullYear();
  });
  const [valilehti, setValilehti] = useState<Valilehti>('maksut');
  const [asetuksetAuki, setAsetuksetAuki] = useState(false);
  const [uusiVuosiInput, setUusiVuosiInput] = useState('');
  const [bulkImportAuki, setBulkImportAuki] = useState(false);

  const vuodet = [...data.vuodet].sort((a, b) => a.vuosi - b.vuosi);
  const aktiivinen = typeof nakyma === 'number'
    ? vuodet.find((v) => v.vuosi === nakyma) ?? tyhjaVuosiData(nakyma)
    : null;

  const lukittu = aktiivinen?.status === 'valmis';

  const edellinenVuosi = aktiivinen
    ? (vuodet.find((v) => v.vuosi === aktiivinen.vuosi - 1) ?? null)
    : null;
  const dublikaattiKuukaudet = aktiivinen
    ? tunnistaDublikaatit(aktiivinen, edellinenVuosi)
    : new Set<number>();

  const lisaaUusiVuosi = () => {
    const vuosi = parseInt(uusiVuosiInput, 10);
    if (!vuosi || vuosi < 2000 || vuosi > 2100) return;
    lisaaVuosi(vuosi);
    setNakyma(vuosi);
    setUusiVuosiInput('');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const uusiData = await importJSON(file);
      alustaData(uusiData);
      setImportVirhe(null);
      const vuodet = uusiData.vuodet.map((v) => v.vuosi).sort((a, b) => a - b);
      setNakyma(vuodet[vuodet.length - 1] ?? new Date().getFullYear());
    } catch (err) {
      setImportVirhe(err instanceof Error ? err.message : 'Tuntematon virhe');
    } finally {
      if (importInputRef.current) importInputRef.current.value = '';
    }
  };

  const paivitaStatus = (status: VuosiStatus) => {
    if (!aktiivinen) return;
    paivitaVuosi(aktiivinen.vuosi, { status });
  };

  const kasitteleBulkImport = (
    vesilaskuPaivitykset: Partial<Vesilasku>[],
    kiinteistoTulos: KiinteistoveroTulos | null,
    liiteIdt: Record<string, string>,
    maksuPaivitykset: MaksuPaivitys[] = []
  ) => {
    if (!aktiivinen) return;

    if (vesilaskuPaivitykset.length > 0) {
      const uudetVesilaskut = aktiivinen.vesilaskut.map((v) => {
        const paivitys = vesilaskuPaivitykset.find((p) => p.kuukausi === v.kuukausi);
        if (!paivitys) return v;
        const liiteId = liiteIdt[`vesilasku-${v.kuukausi}`];
        return {
          ...v,
          ...paivitys,
          liitteet: liiteId ? [...(v.liitteet ?? []), liiteId] : v.liitteet,
        };
      });
      paivitaVuosi(aktiivinen.vuosi, { vesilaskut: uudetVesilaskut });
    }

    if (kiinteistoTulos) {
      const liiteId = liiteIdt['kiinteistovero'];
      const uusiTontti = {
        ...aktiivinen.kiinteistoveroTontti,
        ...(kiinteistoTulos.maapohjaVero > 0 ? { maapohjaVero: kiinteistoTulos.maapohjaVero } : {}),
        ...(kiinteistoTulos.jaettuTonttivero != null && kiinteistoTulos.jaettuTonttivero > 0
          ? { jaettuTonttivero: kiinteistoTulos.jaettuTonttivero } : {}),
        liitteet: liiteId
          ? [...(aktiivinen.kiinteistoveroTontti.liitteet ?? []), liiteId]
          : aktiivinen.kiinteistoveroTontti.liitteet,
      };
      const olemassaOlevat = [...aktiivinen.rakennusverot];
      const uudetRakennukset = kiinteistoTulos.rakennukset.map((r) => {
        const osapuoliId = r.omistajaAvain === 'op1'
          ? data.osapuolet[0].id
          : r.omistajaAvain === 'op2'
          ? data.osapuolet[1].id
          : data.osapuolet[0].id;
        const matchIdx = olemassaOlevat.findIndex(
          (o) => o.nimi.toLowerCase().includes(r.nimi.toLowerCase().slice(0, 6))
        );
        if (matchIdx >= 0) {
          const p = { ...olemassaOlevat[matchIdx], maara: r.maara };
          olemassaOlevat[matchIdx] = p;
          return null;
        }
        return {
          id: crypto.randomUUID(),
          nimi: r.nimi,
          omistajaId: osapuoliId,
          maara: r.maara,
        };
      }).filter(Boolean);
      paivitaVuosi(aktiivinen.vuosi, {
        kiinteistoveroTontti: uusiTontti,
        rakennusverot: [...olemassaOlevat, ...(uudetRakennukset as RakennusVero[])],
      });
    }

    if (maksuPaivitykset.length > 0) {
      const vuodetMuutos = new Map<number, typeof data.vuodet[0]>();
      for (const mp of maksuPaivitykset) {
        const kohdeVuosiData = vuodetMuutos.get(mp.vuosi) ?? data.vuodet.find((v) => v.vuosi === mp.vuosi);
        if (!kohdeVuosiData) continue;
        const uusiMaksu = {
          id: crypto.randomUUID(),
          paiva: mp.paiva,
          osapuoliId: mp.osapuoliId,
          maara: mp.maara,
          kommentti: mp.kommentti,
        };
        vuodetMuutos.set(mp.vuosi, {
          ...kohdeVuosiData,
          maksut: [...kohdeVuosiData.maksut, uusiMaksu],
        });
      }
      for (const [vuosiNum, vuosiMuutos] of vuodetMuutos) {
        paivitaVuosi(vuosiNum, { maksut: vuosiMuutos.maksut });
      }
    }

    setBulkImportAuki(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Onnenkoukku</h1>
          <p className="text-sm text-gray-500">Laskujen tasaus</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportExcel(data)}
            className="text-sm text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5"
            title="Vie Excel-tiedostona"
          >
            ↓ Excel
          </button>
          <button
            onClick={() => exportJSON(data)}
            className="text-sm text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5"
            title="Vie varmuuskopio (JSON)"
          >
            ↓ Varmuuskopio
          </button>
          <label
            className="text-sm text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5 cursor-pointer"
            title="Tuo varmuuskopiosta (JSON)"
          >
            ↑ Tuo data
            <input
              ref={importInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>
          <GitHubSync
            data={data}
            savedSnapshot={githubSnapshot}
            onRevert={alustaData}
            onSaveSuccess={setGithubSnapshot}
          />
          <button
            onClick={() => setAsetuksetAuki(true)}
            className="text-sm text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5"
          >
            ⚙ Asetukset
          </button>
        </div>
      </header>

      {/* Vuosinavigointi */}
      <nav className="bg-white border-b border-gray-200 px-6 py-2 flex items-center gap-2 flex-wrap">
        {vuodet.map((v) => {
          const active = nakyma === v.vuosi;
          return (
            <button
              key={v.vuosi}
              onClick={() => { setNakyma(v.vuosi); setValilehti('maksut'); }}
              className={`relative px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  active ? 'bg-white/70' : statusVari(v.status)
                }`}
              />
              {v.vuosi}
            </button>
          );
        })}
        <button
          onClick={() => setNakyma('historia')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            nakyma === 'historia'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Historia
        </button>
        <div className="flex items-center gap-1 ml-2">
          <input
            type="number"
            value={uusiVuosiInput}
            onChange={(e) => setUusiVuosiInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && lisaaUusiVuosi()}
            placeholder="vuosi"
            className="border border-gray-200 rounded px-2 py-1 w-20 text-sm"
          />
          <button
            onClick={lisaaUusiVuosi}
            className="text-sm bg-gray-100 hover:bg-gray-200 rounded px-2 py-1"
          >
            + Lisää
          </button>
        </div>
      </nav>

      {/* Sisältö */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {nakyma === 'historia' ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <Historia appData={data} />
          </div>
        ) : aktiivinen ? (
          <>
            {/* Status-palkki */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-1 border-b border-gray-200 flex-1 flex-wrap">
                {VALILEHDET.map((vl) => (
                  <button
                    key={vl.id}
                    onClick={() => setValilehti(vl.id)}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                      valilehti === vl.id
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {vl.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 ml-4 pb-1">
                {!lukittu && (
                  <button
                    onClick={() => setBulkImportAuki(true)}
                    className="text-sm text-purple-600 hover:text-purple-800 border border-purple-200 hover:border-purple-400 bg-purple-50 rounded-lg px-3 py-1"
                  >
                    ✦ Analysoi laskuja ja tilisiirtoja
                  </button>
                )}
                <span className="text-xs text-gray-500">Status:</span>
                <div className="relative">
                  <select
                    value={aktiivinen.status ?? 'uusi'}
                    onChange={(e) => paivitaStatus(e.target.value as VuosiStatus)}
                    className={`text-xs font-medium border rounded px-2 py-1 pr-6 appearance-none cursor-pointer ${statusBadgeClass(aktiivinen.status)}`}
                  >
                    {STATUS_VALINNAT.map((s) => (
                      <option key={s.arvo} value={s.arvo}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {lukittu && (
              <div className="mb-4 bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-sm text-green-800 flex items-center gap-2">
                <span>✓</span>
                <span>Vuosi {aktiivinen.vuosi} on merkitty valmiiksi. Tiedot ovat vain luku -tilassa.</span>
                <button
                  onClick={() => paivitaStatus('katselmoinnissa')}
                  className="ml-auto text-xs underline hover:no-underline"
                >
                  Avaa muokkaus
                </button>
              </div>
            )}

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              {valilehti === 'maksut' && (
                <Maksut
                  maksut={aktiivinen.maksut}
                  osapuolet={data.osapuolet}
                  lukittu={lukittu}
                  onChange={(maksut) => paivitaVuosi(aktiivinen.vuosi, { maksut })}
                />
              )}
              {valilehti === 'vesilaskut' && (
                <Vesilaskut
                  vesilaskut={aktiivinen.vesilaskut}
                  lukittu={lukittu}
                  dublikaattiKuukaudet={dublikaattiKuukaudet}
                  onChange={(vesilaskut) => paivitaVuosi(aktiivinen.vuosi, { vesilaskut })}
                />
              )}
              {valilehti === 'vesikulutus' && (
                <Vesikulutus
                  mittarit={aktiivinen.mittarit}
                  osapuolet={data.osapuolet}
                  lukittu={lukittu}
                  onChange={(mittarit) => paivitaVuosi(aktiivinen.vuosi, { mittarit })}
                />
              )}
              {valilehti === 'kiinteistovero' && (
                <Kiinteistovero
                  kiinteistoveroTontti={aktiivinen.kiinteistoveroTontti}
                  rakennusverot={aktiivinen.rakennusverot}
                  osapuolet={data.osapuolet}
                  tontti={data.tontti}
                  lukittu={lukittu}
                  onChange={(kiinteistoveroTontti, rakennusverot) =>
                    paivitaVuosi(aktiivinen.vuosi, { kiinteistoveroTontti, rakennusverot })
                  }
                />
              )}
              {valilehti === 'muut' && (
                <MuutKulut
                  muutKulut={aktiivinen.muutKulut}
                  osapuolet={data.osapuolet}
                  lukittu={lukittu}
                  onChange={(muutKulut) => paivitaVuosi(aktiivinen.vuosi, { muutKulut })}
                />
              )}
              {valilehti === 'tasaus' && (
                <Tasaus vuosiData={aktiivinen} appData={data} dublikaattiKuukaudet={dublikaattiKuukaudet} />
              )}
            </div>
          </>
        ) : null}
      </main>

      {importVirhe && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-50 border border-red-300 rounded-lg px-4 py-3 text-sm text-red-800 shadow-lg z-50 flex items-center gap-3">
          <span>Tuonti epäonnistui: {importVirhe}</span>
          <button onClick={() => setImportVirhe(null)} className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
        </div>
      )}

      {bulkImportAuki && aktiivinen && (
        <BulkImport
          vuosi={aktiivinen.vuosi}
          vuosiData={aktiivinen}
          osapuolet={data.osapuolet}
          onConfirm={kasitteleBulkImport}
          onClose={() => setBulkImportAuki(false)}
        />
      )}

      {asetuksetAuki && (
        <Asetukset
          appData={data}
          onSave={paivitaAsetukset}
          onClose={() => setAsetuksetAuki(false)}
        />
      )}
    </div>
  );
}
