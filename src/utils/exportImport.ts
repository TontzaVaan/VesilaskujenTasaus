import * as XLSX from 'xlsx';
import type { AppData, VuosiData } from '../types';
import { laskeTasaus } from './calculations';

// ---- JSON export / import ----

export function exportJSON(appData: AppData): void {
  const json = JSON.stringify(appData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `onnenkoukku-data-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importJSON(file: File): Promise<AppData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as AppData;
        // Basic validation
        if (!data.osapuolet || !data.vuodet) {
          throw new Error('Tiedosto ei ole kelvollinen Onnenkoukku-data');
        }
        resolve(data);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Tiedoston lukeminen epäonnistui'));
    reader.readAsText(file);
  });
}

// ---- Excel export ----

const KUUKAUDET_FULL = [
  'Tammikuu','Helmikuu','Maaliskuu','Huhtikuu','Toukokuu','Kesäkuu',
  'Heinäkuu','Elokuu','Syyskuu','Lokakuu','Marraskuu','Joulukuu',
];

function lisaaRivi(ws: XLSX.WorkSheet, rivi: number, arvot: (string | number | undefined)[]): number {
  arvot.forEach((arvo, sarake) => {
    const solu = XLSX.utils.encode_cell({ r: rivi, c: sarake });
    if (arvo !== undefined) {
      ws[solu] = { v: arvo, t: typeof arvo === 'number' ? 'n' : 's' };
    }
  });
  return rivi + 1;
}

function laajennaRef(ws: XLSX.WorkSheet, maxR: number, maxC: number): void {
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: maxR, c: maxC } });
}

function vuosiSheet(vuosiData: VuosiData, appData: AppData): XLSX.WorkSheet {
  const ws: XLSX.WorkSheet = {};
  const op1 = appData.osapuolet[0];
  const op2 = appData.osapuolet[1];
  let r = 0;

  // Otsikko
  r = lisaaRivi(ws, r, [`Vuosi ${vuosiData.vuosi}  |  ${op1.nimi} & ${op2.nimi}`]);
  r++;

  // --- Maksut ---
  r = lisaaRivi(ws, r, ['OSAKEYHTIÖN TILILLE TEHDYT MAKSUT']);
  r = lisaaRivi(ws, r, ['Päivämäärä', 'Osapuoli', 'Summa €', 'Kommentti']);
  for (const m of vuosiData.maksut) {
    const nimi = m.osapuoliId === op1.id ? op1.nimi : op2.nimi;
    r = lisaaRivi(ws, r, [m.paiva, nimi, m.maara, m.kommentti]);
  }
  const op1Maks = vuosiData.maksut.filter(m => m.osapuoliId === op1.id).reduce((s, m) => s + m.maara, 0);
  const op2Maks = vuosiData.maksut.filter(m => m.osapuoliId === op2.id).reduce((s, m) => s + m.maara, 0);
  r = lisaaRivi(ws, r, [`${op1.nimi} yhteensä`, '', op1Maks]);
  r = lisaaRivi(ws, r, [`${op2.nimi} yhteensä`, '', op2Maks]);
  r++;

  // --- Vesilaskut ---
  r = lisaaRivi(ws, r, ['VESILASKUT']);
  r = lisaaRivi(ws, r, ['Kuukausi', 'Eräpäivä', 'Perusmaksu €', 'Käyttömaksu €', 'Yhteensä €', 'Kommentti']);
  let totalPerus = 0, totalKaytto = 0;
  for (const v of vuosiData.vesilaskut) {
    const yht = v.perusmaksu + v.kayttomaksu;
    totalPerus += v.perusmaksu;
    totalKaytto += v.kayttomaksu;
    r = lisaaRivi(ws, r, [KUUKAUDET_FULL[v.kuukausi - 1], v.erapaiva, v.perusmaksu, v.kayttomaksu, yht, v.kommentti]);
  }
  r = lisaaRivi(ws, r, ['Yhteensä', '', totalPerus, totalKaytto, totalPerus + totalKaytto]);
  r++;

  // --- Vesikulutus ---
  r = lisaaRivi(ws, r, ['VESIKULUTUS (MITTARILUKEMAT)']);
  r = lisaaRivi(ws, r, ['Mittari', 'Aloituspvm', 'Aloituslukema m³', 'Lopetuspvm', 'Lopetuslukemat m³', 'Kulutus m³']);
  const { yhteinen, alamittari } = vuosiData.mittarit;
  const yhtKul = yhteinen.loppuLukema - yhteinen.alkuLukema;
  const op1Kul = alamittari.loppuLukema - alamittari.alkuLukema;
  const op2Kul = Math.max(0, yhtKul - op1Kul);
  r = lisaaRivi(ws, r, ['Yhteinen päämittari', yhteinen.alkuPvm, yhteinen.alkuLukema, yhteinen.loppuPvm, yhteinen.loppuLukema, yhtKul]);
  r = lisaaRivi(ws, r, [`${op1.nimi} alamittari`, alamittari.alkuPvm, alamittari.alkuLukema, alamittari.loppuPvm, alamittari.loppuLukema, op1Kul]);
  r = lisaaRivi(ws, r, [`${op2.nimi} kulutus (laskettu)`, '', '', '', '', op2Kul]);
  r++;

  // --- Kiinteistövero ---
  r = lisaaRivi(ws, r, ['KIINTEISTÖVERO']);
  r = lisaaRivi(ws, r, ['Tontti (maapohjavero)', '', vuosiData.kiinteistoveroTontti.maapohjaVero]);
  const kokonaisNelio = appData.tontti.op1Neliometrit + appData.tontti.op2Neliometrit;
  const op1Pct = appData.tontti.op1KiinteistoveroProsentti !== undefined
    ? appData.tontti.op1KiinteistoveroProsentti / 100
    : kokonaisNelio > 0 ? appData.tontti.op1Neliometrit / kokonaisNelio : 0.5;
  r = lisaaRivi(ws, r, [`  ${op1.nimi} osuus`, `${(op1Pct * 100).toFixed(1)} %`, vuosiData.kiinteistoveroTontti.maapohjaVero * op1Pct]);
  r = lisaaRivi(ws, r, [`  ${op2.nimi} osuus`, `${((1 - op1Pct) * 100).toFixed(1)} %`, vuosiData.kiinteistoveroTontti.maapohjaVero * (1 - op1Pct)]);
  if (vuosiData.rakennusverot.length > 0) {
    r = lisaaRivi(ws, r, ['Rakennukset']);
    r = lisaaRivi(ws, r, ['Rakennus', 'Omistaja', 'Vero €']);
    for (const rv of vuosiData.rakennusverot) {
      const omistaja = rv.omistajaId === op1.id ? op1.nimi : op2.nimi;
      r = lisaaRivi(ws, r, [rv.nimi, omistaja, rv.maara]);
    }
  }
  r++;

  // --- Muut kulut ---
  if (vuosiData.muutKulut.length > 0) {
    r = lisaaRivi(ws, r, ['MUUT YHTEISET KULUT']);
    r = lisaaRivi(ws, r, ['Kuvaus', 'Päivämäärä', 'Yhteensä €', `${op1.nimi} %`, `${op1.nimi} €`, `${op2.nimi} €`]);
    for (const k of vuosiData.muutKulut) {
      const op1Eur = k.yhteensa * (k.op1Prosentti / 100);
      const op2Eur = k.yhteensa * ((100 - k.op1Prosentti) / 100);
      r = lisaaRivi(ws, r, [k.kuvaus, k.paiva, k.yhteensa, k.op1Prosentti, op1Eur, op2Eur]);
    }
    r++;
  }

  // --- Tasaus ---
  const t = laskeTasaus(vuosiData, appData.tontti, op1.id, op2.id);
  r = lisaaRivi(ws, r, ['VUOSITTAINEN TASAUS']);
  r = lisaaRivi(ws, r, ['', op1.nimi, op2.nimi]);
  r = lisaaRivi(ws, r, ['Maksettu yhtiölle', t.op1Maksut, t.op2Maksut]);
  r = lisaaRivi(ws, r, ['Vesikulut', t.op1VesiKulut, t.op2VesiKulut]);
  r = lisaaRivi(ws, r, ['Maapohjavero', t.op1MaapohjaVero, t.op2MaapohjaVero]);
  r = lisaaRivi(ws, r, ['Rakennusverot', t.op1RakennusVero, t.op2RakennusVero]);
  r = lisaaRivi(ws, r, ['Muut kulut', t.op1MuutKulut, t.op2MuutKulut]);
  r = lisaaRivi(ws, r, ['Kulut yhteensä', t.op1KokonaisKulut, t.op2KokonaisKulut]);
  r = lisaaRivi(ws, r, ['Saldo (+ = ylijäämä)', t.op1Saldo, t.op2Saldo]);
  r++;
  if (t.tasausErotus > 0.005) {
    const maks = t.maksajaId === op1.id ? op1.nimi : op2.nimi;
    const saaj = t.saajaid === op1.id ? op1.nimi : op2.nimi;
    r = lisaaRivi(ws, r, [`${maks} maksaa ${saaj}lle`, '', t.tasausErotus]);
  } else {
    r = lisaaRivi(ws, r, ['Tasassa - ei tasausta tarvita']);
  }

  laajennaRef(ws, r, 6);

  ws['!cols'] = [
    { wch: 30 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 30 },
  ];

  return ws;
}

function yhteenvetoSheet(appData: AppData): XLSX.WorkSheet {
  const ws: XLSX.WorkSheet = {};
  const op1 = appData.osapuolet[0];
  const op2 = appData.osapuolet[1];
  let r = 0;

  r = lisaaRivi(ws, r, ['ONNENKOUKKU – LASKUJEN TASAUS – YHTEENVETO']);
  r = lisaaRivi(ws, r, [`Osapuoli 1: ${op1.nimi}  |  Osapuoli 2: ${op2.nimi}`]);
  r = lisaaRivi(ws, r, [
    `Tontti: ${op1.nimi} ${appData.tontti.op1Neliometrit} m²  /  ${op2.nimi} ${appData.tontti.op2Neliometrit} m²`,
  ]);
  r++;

  r = lisaaRivi(ws, r, [
    'Vuosi', 'Status',
    `${op1.nimi} maksut`, `${op2.nimi} maksut`,
    'Vesi yht €', `${op1.nimi} vesi`, `${op2.nimi} vesi`,
    'Kiinteistövero yht €', `${op1.nimi} kv`, `${op2.nimi} kv`,
    'Muut kulut yht €',
    `${op1.nimi} saldo`, `${op2.nimi} saldo`,
    'Tasausmäärä €', 'Maksaja',
  ]);

  const vuodet = [...appData.vuodet].sort((a, b) => a.vuosi - b.vuosi);
  for (const v of vuodet) {
    const t = laskeTasaus(v, appData.tontti, op1.id, op2.id);
    const maks = t.tasausErotus > 0.005
      ? (t.maksajaId === op1.id ? op1.nimi : op2.nimi)
      : '';
    const STATUS_MAP: Record<string, string> = {
      uusi: 'Uusi', kesken: 'Kesken', katselmoinnissa: 'Katselmoinnissa', valmis: 'Valmis',
    };
    r = lisaaRivi(ws, r, [
      v.vuosi, STATUS_MAP[v.status ?? 'uusi'] ?? 'Uusi',
      t.op1Maksut, t.op2Maksut,
      t.op1VesiKulut + t.op2VesiKulut, t.op1VesiKulut, t.op2VesiKulut,
      t.op1MaapohjaVero + t.op2MaapohjaVero + t.op1RakennusVero + t.op2RakennusVero,
      t.op1MaapohjaVero + t.op1RakennusVero,
      t.op2MaapohjaVero + t.op2RakennusVero,
      t.op1MuutKulut + t.op2MuutKulut,
      t.op1Saldo, t.op2Saldo,
      t.tasausErotus > 0.005 ? t.tasausErotus : 0,
      maks,
    ]);
  }

  laajennaRef(ws, r, 14);
  ws['!cols'] = Array(15).fill({ wch: 16 });
  ws['!cols'][0] = { wch: 8 };
  ws['!cols'][1] = { wch: 16 };
  ws['!cols'][14] = { wch: 14 };

  return ws;
}

export function exportExcel(appData: AppData): void {
  const wb = XLSX.utils.book_new();

  // Yhteenveto-välilehti ensin
  XLSX.utils.book_append_sheet(wb, yhteenvetoSheet(appData), 'Yhteenveto');

  // Yksi välilehti per vuosi
  const vuodet = [...appData.vuodet].sort((a, b) => a.vuosi - b.vuosi);
  for (const v of vuodet) {
    XLSX.utils.book_append_sheet(wb, vuosiSheet(v, appData), String(v.vuosi));
  }

  XLSX.writeFile(wb, `onnenkoukku-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
