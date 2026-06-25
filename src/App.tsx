import { useState } from 'react';
import { useAppData } from './hooks/useAppData';
import { tyhjaVuosiData } from './utils/storage';
import Maksut from './components/Maksut';
import Vesilaskut from './components/Vesilaskut';
import Vesikulutus from './components/Vesikulutus';
import Kiinteistovero from './components/Kiinteistovero';
import MuutKulut from './components/MuutKulut';
import Tasaus from './components/Tasaus';
import Historia from './components/Historia';
import Asetukset from './components/Asetukset';

type Valilehti = 'maksut' | 'vesilaskut' | 'vesikulutus' | 'kiinteistovero' | 'muut' | 'tasaus';

const VALILEHDET: { id: Valilehti; label: string }[] = [
  { id: 'maksut', label: 'Maksut' },
  { id: 'vesilaskut', label: 'Vesilaskut' },
  { id: 'vesikulutus', label: 'Vesikulutus' },
  { id: 'kiinteistovero', label: 'Kiinteistövero' },
  { id: 'muut', label: 'Muut kulut' },
  { id: 'tasaus', label: 'Tasaus' },
];

export default function App() {
  const { data, paivitaVuosi, lisaaVuosi, paivitaAsetukset } = useAppData();
  const [nakyma, setNakyma] = useState<number | 'historia'>(() => {
    const vuodet = data.vuodet.map((v) => v.vuosi).sort();
    return vuodet[vuodet.length - 1] ?? new Date().getFullYear();
  });
  const [valilehti, setValilehti] = useState<Valilehti>('maksut');
  const [asetuksetAuki, setAsetuksetAuki] = useState(false);
  const [uusiVuosiInput, setUusiVuosiInput] = useState('');

  const vuodet = [...data.vuodet].sort((a, b) => a.vuosi - b.vuosi);
  const aktiivinen = typeof nakyma === 'number'
    ? vuodet.find((v) => v.vuosi === nakyma) ?? tyhjaVuosiData(nakyma)
    : null;

  const lisaaUusiVuosi = () => {
    const vuosi = parseInt(uusiVuosiInput, 10);
    if (!vuosi || vuosi < 2000 || vuosi > 2100) return;
    lisaaVuosi(vuosi);
    setNakyma(vuosi);
    setUusiVuosiInput('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Onnenkoukku</h1>
          <p className="text-sm text-gray-500">Laskujen tasaus</p>
        </div>
        <button
          onClick={() => setAsetuksetAuki(true)}
          className="text-sm text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5"
        >
          ⚙ Asetukset
        </button>
      </header>

      {/* Vuosinavigointi */}
      <nav className="bg-white border-b border-gray-200 px-6 py-2 flex items-center gap-2 flex-wrap">
        {vuodet.map((v) => (
          <button
            key={v.vuosi}
            onClick={() => { setNakyma(v.vuosi); setValilehti('maksut'); }}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              nakyma === v.vuosi
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {v.vuosi}
          </button>
        ))}
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
            {/* Välilehdet */}
            <div className="flex gap-1 mb-4 border-b border-gray-200 flex-wrap">
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

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              {valilehti === 'maksut' && (
                <Maksut
                  maksut={aktiivinen.maksut}
                  osapuolet={data.osapuolet}
                  onChange={(maksut) => paivitaVuosi(aktiivinen.vuosi, { maksut })}
                />
              )}
              {valilehti === 'vesilaskut' && (
                <Vesilaskut
                  vesilaskut={aktiivinen.vesilaskut}
                  onChange={(vesilaskut) => paivitaVuosi(aktiivinen.vuosi, { vesilaskut })}
                />
              )}
              {valilehti === 'vesikulutus' && (
                <Vesikulutus
                  mittarit={aktiivinen.mittarit}
                  osapuolet={data.osapuolet}
                  onChange={(mittarit) => paivitaVuosi(aktiivinen.vuosi, { mittarit })}
                />
              )}
              {valilehti === 'kiinteistovero' && (
                <Kiinteistovero
                  kiinteistoveroTontti={aktiivinen.kiinteistoveroTontti}
                  rakennusverot={aktiivinen.rakennusverot}
                  osapuolet={data.osapuolet}
                  tontti={data.tontti}
                  onChange={(kiinteistoveroTontti, rakennusverot) =>
                    paivitaVuosi(aktiivinen.vuosi, { kiinteistoveroTontti, rakennusverot })
                  }
                />
              )}
              {valilehti === 'muut' && (
                <MuutKulut
                  muutKulut={aktiivinen.muutKulut}
                  osapuolet={data.osapuolet}
                  onChange={(muutKulut) => paivitaVuosi(aktiivinen.vuosi, { muutKulut })}
                />
              )}
              {valilehti === 'tasaus' && (
                <Tasaus vuosiData={aktiivinen} appData={data} />
              )}
            </div>
          </>
        ) : null}
      </main>

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
