# Onnenkoukku – Laskujen tasaus

Web-sovellus osakeyhtiön yhteisten laskujen vuosittaiseen tasaukseen. Seuraa vesilaskuja, kiinteistöveroja ja muita yhteisiä kuluja, ja laskee automaattisesti kenen tulee maksaa kenelle ja kuinka paljon.

## Ominaisuudet

- **Maksut** – kirjaa yhtiön tilille tehdyt maksut osapuolittain
- **Vesilaskut** – kuukausittaiset laskut (perusmaksu + käyttömaksu)
- **Vesikulutus** – mittarilukemat, jako lasketaan automaattisesti
- **Kiinteistövero** – tontti m²-suhteessa, rakennukset omistajilleen
- **Muut kulut** – vapaamuotoiset rivit prosenttijäolla
- **Tasaus** – laskee kuka maksaa kenelle ja kuinka paljon
- **Historia** – kaikkien vuosien yhteenveto
- Kaikki tieto tallennetaan selaimeen (localStorage), ei tarvita palvelinta

## Asennus Mac-koneelle

### Vaatimukset

- [Node.js](https://nodejs.org/) 18 tai uudempi
  - Tarkista versio: `node --version`
  - Jos ei asennettuna, lataa osoitteesta https://nodejs.org/

### Asennus

```bash
# 1. Kloonaa repositorio
git clone https://github.com/tontzavaan/vesilaskujentasaus.git
cd vesilaskujentasaus

# 2. Asenna riippuvuudet
npm install

# 3. Käynnistä kehityspalvelin
npm run dev
```

Avaa selaimessa: **http://localhost:5173**

### Tuotantoversio (valinnainen)

```bash
# Rakenna optimoitu versio
npm run build

# Tiedostot löytyvät dist/-kansiosta
# Voit avata dist/index.html suoraan selaimessa
```

## Ensiaskeleet sovelluksessa

1. Klikkaa **⚙ Asetukset** oikeasta yläkulmasta
2. Aseta osapuolten nimet (oletuksena Pakarinen ja Pusa)
3. Syötä kummankin tonttiosuus neliömetreinä (maapohjaveron jako)
4. Valitse vuosi yläpalkista tai lisää uusi vuosi
5. Täytä tiedot välilehdille: Maksut → Vesilaskut → Vesikulutus → Kiinteistövero
6. Katso laskettu tasaus **Tasaus**-välilehdeltä

## Teknologia

- [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/) – kehityspalvelin ja bundler
- [Tailwind CSS](https://tailwindcss.com/) – tyylittely
- localStorage – tiedon tallennus selaimeen
