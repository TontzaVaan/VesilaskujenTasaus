import { useState, useEffect, useRef } from 'react';
import type { AppData } from '../types';
import type { GitHubConfig, GitHubCommit } from '../utils/githubStorage';
import {
  GITHUB_CONFIG_KEY,
  lataaGitHubConfig,
  tallennaGitHubConfig,
  poistaGitHubConfig,
  saveToGitHub,
  loadFromGitHub,
  listGitHubCommits,
  getDataAtCommit,
} from '../utils/githubStorage';

interface Props {
  data: AppData;
  savedSnapshot: string | null;
  onRevert: (data: AppData) => void;
  onSaveSuccess: (snapshot: string) => void;
}

const DEFAULT_CONFIG: Partial<GitHubConfig> = {
  owner: 'TontzaVaan',
  repo: 'VesilaskujenTasaus',
  branch: 'main',
  path: 'data/appdata.json',
};

export default function GitHubSync({ data, savedSnapshot, onRevert, onSaveSuccess }: Props) {
  const [config, setConfig] = useState<GitHubConfig | null>(() => lataaGitHubConfig());
  const [auki, setAuki] = useState(false);
  const [naytaAsetukset, setNaytaAsetukset] = useState(!lataaGitHubConfig());
  const [commitViesti, setCommitViesti] = useState('');
  const [lataa, setLataa] = useState(false);
  const [virhe, setVirhe] = useState<string | null>(null);
  const [onnistui, setOnnistui] = useState<string | null>(null);
  const [commitit, setCommitit] = useState<GitHubCommit[]>([]);
  const [commititLataus, setCommititLataus] = useState(false);
  const [konfForm, setKonfForm] = useState<Partial<GitHubConfig>>(
    lataaGitHubConfig() ?? DEFAULT_CONFIG
  );
  const panelRef = useRef<HTMLDivElement>(null);

  const currentSnapshot = JSON.stringify(data);
  const dirty = savedSnapshot !== null && currentSnapshot !== savedSnapshot;
  const synced = savedSnapshot !== null && currentSnapshot === savedSnapshot;

  // Sulje dropdown klikatessa ulkopuolella
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setAuki(false);
      }
    };
    if (auki) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [auki]);

  // Lataa commitit kun avautuu (konfiguroitu tila)
  useEffect(() => {
    if (auki && config && !naytaAsetukset && commitit.length === 0) {
      setCommititLataus(true);
      listGitHubCommits(config)
        .then(setCommitit)
        .catch((e: Error) => setVirhe(e.message))
        .finally(() => setCommititLataus(false));
    }
  }, [auki, config, naytaAsetukset]);

  const nappulaVari = () => {
    if (!config) return 'text-gray-400 border-gray-200';
    if (synced) return 'text-green-600 border-green-300';
    if (dirty) return 'text-orange-500 border-orange-300';
    return 'text-gray-500 border-gray-200';
  };

  const nappulaIkoni = () => {
    if (!config) return '⊙';
    if (synced) return '✓';
    if (dirty) return '●';
    return '⊙';
  };

  const tallenna = async () => {
    if (!config) return;
    setLataa(true);
    setVirhe(null);
    setOnnistui(null);
    try {
      await saveToGitHub(config, data, commitViesti || undefined);
      onSaveSuccess(currentSnapshot);
      setOnnistui('Tallennettu GitHubiin ✓');
      setCommitViesti('');
      // Päivitä commitit
      const uudet = await listGitHubCommits(config);
      setCommitit(uudet);
    } catch (e) {
      setVirhe((e as Error).message);
    } finally {
      setLataa(false);
    }
  };

  const lataaGithubista = async () => {
    if (!config) return;
    if (!confirm('Korvaa paikallinen data GitHubin versiolla? Tallentamattomat muutokset häviävät.')) return;
    setLataa(true);
    setVirhe(null);
    try {
      const uusiData = await loadFromGitHub(config);
      onRevert(uusiData);
      onSaveSuccess(JSON.stringify(uusiData));
      setOnnistui('Ladattu GitHubista ✓');
    } catch (e) {
      setVirhe((e as Error).message);
    } finally {
      setLataa(false);
    }
  };

  const palauta = async (commit: GitHubCommit) => {
    if (!config) return;
    if (!confirm(`Palauta versio ${commit.date.slice(0, 10)} — "${commit.message}"?\n\nNykyiset tallentamattomat muutokset häviävät.`)) return;
    setLataa(true);
    setVirhe(null);
    try {
      const vanha = await getDataAtCommit(config, commit.sha);
      onRevert(vanha);
      onSaveSuccess(JSON.stringify(vanha));
      setOnnistui(`Palautettu: ${commit.message}`);
    } catch (e) {
      setVirhe((e as Error).message);
    } finally {
      setLataa(false);
    }
  };

  const tallennaKonfiguraatio = () => {
    if (!konfForm.token || !konfForm.owner || !konfForm.repo || !konfForm.branch || !konfForm.path) {
      setVirhe('Täytä kaikki kentät');
      return;
    }
    const uusi = konfForm as GitHubConfig;
    tallennaGitHubConfig(uusi);
    setConfig(uusi);
    setNaytaAsetukset(false);
    setVirhe(null);
    setCommitit([]); // päivitetään uudelle repolle
  };

  const poistaKonfiguraatio = () => {
    poistaGitHubConfig();
    localStorage.removeItem(GITHUB_CONFIG_KEY);
    setConfig(null);
    setNaytaAsetukset(true);
    setKonfForm(DEFAULT_CONFIG);
    setCommitit([]);
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setAuki((a) => !a)}
        className={`text-sm border rounded-lg px-3 py-1.5 flex items-center gap-1.5 transition-colors hover:bg-gray-50 ${nappulaVari()}`}
        title={!config ? 'GitHub ei konfiguroitu' : dirty ? 'Tallentamattomia muutoksia' : synced ? 'Synkronoitu' : 'GitHub-synkronointi'}
      >
        <span className="font-mono text-xs">{nappulaIkoni()}</span>
        GitHub
      </button>

      {auki && (
        <div className="absolute right-0 top-full mt-1 w-96 bg-white border border-gray-200 rounded-xl shadow-lg z-50 p-4 space-y-3">
          {virhe && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 flex items-start gap-2">
              <span className="mt-0.5">⚠</span>
              <span>{virhe}</span>
              <button onClick={() => setVirhe(null)} className="ml-auto text-red-400">×</button>
            </div>
          )}
          {onnistui && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700 flex items-center gap-2">
              <span>{onnistui}</span>
              <button onClick={() => setOnnistui(null)} className="ml-auto text-green-400">×</button>
            </div>
          )}

          {naytaAsetukset ? (
            /* Konfiguraatiolomake */
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-800">GitHub-asetukset</h3>
              {([
                ['token', 'Personal Access Token (PAT)', 'password'],
                ['owner', 'Omistaja (owner)', 'text'],
                ['repo', 'Repositorio (repo)', 'text'],
                ['branch', 'Haara (branch)', 'text'],
                ['path', 'Tiedostopolku', 'text'],
              ] as [keyof GitHubConfig, string, string][]).map(([key, label, type]) => (
                <div key={key}>
                  <label className="text-xs text-gray-500 block mb-0.5">{label}</label>
                  <input
                    type={type}
                    value={konfForm[key] ?? ''}
                    onChange={(e) => setKonfForm((prev) => ({ ...prev, [key]: e.target.value }))}
                    className="w-full border border-gray-200 rounded px-2 py-1 text-xs"
                    placeholder={key === 'token' ? 'ghp_...' : (DEFAULT_CONFIG[key] ?? '')}
                  />
                </div>
              ))}
              <div className="text-xs text-gray-400">
                PAT tarvitsee <code>repo</code>-oikeudet. Token tallennetaan vain paikallisesti (localStorage).
              </div>
              <div className="flex gap-2">
                <button
                  onClick={tallennaKonfiguraatio}
                  className="flex-1 text-xs bg-blue-600 text-white rounded-lg py-1.5 hover:bg-blue-700"
                >
                  Tallenna asetukset
                </button>
                {config && (
                  <button
                    onClick={() => { setNaytaAsetukset(false); setVirhe(null); }}
                    className="text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50"
                  >
                    Peruuta
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Pääpaneeli */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {config?.owner}/{config?.repo} · {config?.branch}
                </span>
                <button
                  onClick={() => { setNaytaAsetukset(true); setKonfForm(config ?? DEFAULT_CONFIG); }}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Muuta
                </button>
              </div>

              {/* Commit-viesti + tallenna */}
              <div className="space-y-1.5">
                <input
                  type="text"
                  value={commitViesti}
                  onChange={(e) => setCommitViesti(e.target.value)}
                  placeholder="Commit-viesti (valinnainen)"
                  className="w-full border border-gray-200 rounded px-2 py-1 text-xs"
                  onKeyDown={(e) => e.key === 'Enter' && tallenna()}
                />
                <div className="flex gap-2">
                  <button
                    onClick={tallenna}
                    disabled={lataa}
                    className="flex-1 text-xs bg-blue-600 text-white rounded-lg py-1.5 hover:bg-blue-700 disabled:opacity-50"
                  >
                    {lataa ? 'Tallennetaan…' : '↑ Tallenna GitHubiin'}
                  </button>
                  <button
                    onClick={lataaGithubista}
                    disabled={lataa}
                    className="text-xs border border-gray-200 text-gray-600 rounded-lg px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
                    title="Lataa GitHubista (korvaa paikallinen data)"
                  >
                    ↓ Lataa
                  </button>
                </div>
              </div>

              {/* Committihistoria */}
              <div>
                <h4 className="text-xs font-medium text-gray-500 mb-1.5">Versiohistoria</h4>
                {commititLataus ? (
                  <div className="text-xs text-gray-400 py-2 text-center">Ladataan…</div>
                ) : commitit.length === 0 ? (
                  <div className="text-xs text-gray-400 py-2 text-center">Ei tallennettuja versioita</div>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {commitit.map((c) => (
                      <div key={c.sha} className="flex items-start gap-2 py-1 border-b border-gray-50 last:border-0">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-gray-700 truncate">{c.message}</div>
                          <div className="text-xs text-gray-400">{c.date.slice(0, 16).replace('T', ' ')} · {c.author}</div>
                        </div>
                        <button
                          onClick={() => palauta(c)}
                          disabled={lataa}
                          className="text-xs text-blue-500 hover:text-blue-700 flex-shrink-0 disabled:opacity-50"
                          title="Palauta tähän versioon"
                        >
                          Palauta
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={poistaKonfiguraatio}
                className="text-xs text-red-400 hover:text-red-600 w-full text-center"
              >
                Poista GitHub-asetukset
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
