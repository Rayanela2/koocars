// @ts-nocheck — portage tel quel de l'algorithme de nettoyage (ex-api/_kc.js, qui tournait avec sharp).
// Retire les marques Encar des photos (logo « Trust Encar » en haut, bandeau « encar.com »
// en bas à droite, plaque rouge) puis pose le badge « KC / KooCars ». Tourne dans photo.worker.ts.

// Masque binaire 270x80 du bandeau « encar.com » (calé sur le coin bas-droit), compressé (zlib).
const BOTTOM_MASK = {"W":270,"H":80,"data":"eJztloluhDAMRMP//3Sl3eVIPOODUthGM6oqghN7/AhZWpMkSZIkSZIkSZIkaU4t3y3BOOhBGM1cwKg762o9QuN11T61t4u2G3rNaO9/yzs0PY218wSNdg+NW3HsJeHeaBupA4SVw7R7o322/robDI3PhP1yQzgTjrXi+9lve6Ob8OjeeOJNeXfWDmAO4W3u4a9bPBuNfZNsjQ80+r1xI407cfQVNwOg3/VXZ9kXzQaj9TV3GsONY/P+N9oUNL5Xd9IQjv/C414MkiSdUPC+0ihbF5wAfgAHcxbJsCJ8fG036OnGzj18Itp8ng+nEmh5iAUPI8vC1kr3PHo0kXXAjLJ8IGMjGYHhIo60+SF5sM5GWE9BPpiRlwqqlGEw811yGuOLXJtOrXxG13EJxnEwljIT+2GcA3nnPkjL1gVxiLKUaIDRmI23CY4zlH7wDmHYZWNPvN8RdJ3GuIA33I3DmEeD2wD5zCJOgyDN0zDzbcfQsQORFvDM8Xx2kaWBHF5Mgz2USp3u4TmLeAhEQhq0uaTdTClv23ggCjRykT2PvzXKNBam4ksUpY3MTUwDpztHY2ywmxx1fxUNJzd8iaKUrDGn5++iYXzYWJwxefLWIiMNNtkp6NLw2kJz46cM3o64Vi6y58/RSGAgHXs+SjTA8GIa8V54jMbgz/sSzdc6SYNnTeLoh25uh0Z/TPyeBjooC99eF9EIf1KYD0PDWwNsgHVm1eFG1P1ZGosdMRuoEDO/eAlT+UoHkVegRMMWTtHoNiy9ht45t24VdghfPRd3Ecfg3T1E+ScWvO/RcGw4pWC7F9AAxUiu0D7tKkGD5ctEWPdnaJhqLFdkH912fpWJd+ODR8aJf0CD5gpMotuln0OWz4Qih9RwGYi9RWuTdfQb43w+1tpf0ZAkSZIkSZIkSZIkSZIkSZpEP1aWFXQ="};

// Tracés vectoriels « KC » et « KooCars » (Cormorant Garamond Bold, SIL OFL), corps 100.
const BRAND = {"kc":{"d":"M10.3 -8.1L10.3 -54.4Q10.3 -57.3 9.8 -58.75Q9.3 -60.2 7.75 -60.75Q6.2 -61.3 3.2 -61.3Q2.9 -61.3 2.9 -61.9Q2.9 -62.5 3.2 -62.5Q5.8 -62.5 9 -62.35Q12.2 -62.2 15.8 -62.2Q19.6 -62.2 22.8 -62.35Q26 -62.5 28.5 -62.5Q28.8 -62.5 28.8 -61.9Q28.8 -61.3 28.5 -61.3Q25.5 -61.3 24 -60.7Q22.5 -60.1 21.95 -58.6Q21.4 -57.1 21.4 -54.2L21.4 -33L40.2 -52.2Q43.9 -55.9 42.95 -58.6Q42 -61.3 37 -61.3Q36.7 -61.3 36.7 -61.9Q36.7 -62.5 37 -62.5Q39.7 -62.5 42.5 -62.35Q45.3 -62.2 49.9 -62.2Q54.7 -62.2 57.5 -62.35Q60.3 -62.5 62.9 -62.5Q63.2 -62.5 63.2 -61.9Q63.2 -61.3 62.9 -61.3Q58.3 -61.3 52.8 -58.65Q47.3 -56 42.8 -51.6L31.5 -40.1L46.3 -20.1Q50.2 -14.6 52.9 -11.05Q55.6 -7.5 57.45 -5.45Q59.3 -3.4 60.7 -2.5Q62.1 -1.6 63.45 -1.4Q64.8 -1.2 66.4 -1.2Q66.7 -1.2 66.7 -0.6Q66.7 0 66.4 0L55.2 0Q53.7 0 52.6 0.1Q51.5 0.2 50.7 0.2Q49.4 0.2 48.4 -0.3Q47.4 -0.8 46.05 -2.3Q44.7 -3.8 42.5 -6.7Q40.3 -9.6 36.7 -14.5L23.6 -32.1L21.4 -29.9L21.4 -8.1Q21.4 -5.2 21.9 -3.7Q22.4 -2.2 23.9 -1.7Q25.4 -1.2 28.5 -1.2Q28.9 -1.2 28.9 -0.6Q28.9 0 28.5 0Q25.9 0 22.75 -0.1Q19.6 -0.2 15.8 -0.2Q12.2 -0.2 8.9 -0.1Q5.6 0 3 0Q2.8 0 2.8 -0.6Q2.8 -1.2 3 -1.2Q6.1 -1.2 7.65 -1.7Q9.2 -2.2 9.75 -3.7Q10.3 -5.2 10.3 -8.1ZM112.7 -63.6Q115.7 -63.6 118.95 -63.3Q122.2 -63 125.1 -62.4Q128 -61.8 130 -60.9Q130.9 -60.6 131.15 -60.15Q131.4 -59.7 131.5 -58.6L132.8 -44.7Q132.8 -44.4 132.3 -44.3Q131.8 -44.2 131.6 -44.6Q128.8 -52.7 123.65 -57.1Q118.5 -61.5 111.1 -61.5Q104.3 -61.5 98.95 -57.85Q93.6 -54.2 90.55 -47.5Q87.5 -40.8 87.5 -31.5Q87.5 -24.5 89.3 -18.85Q91.1 -13.2 94.4 -9.2Q97.7 -5.2 102.2 -3.05Q106.7 -0.9 112.1 -0.9Q119.2 -0.9 123.85 -4.75Q128.5 -8.6 132.6 -17Q132.8 -17.3 133.25 -17.2Q133.7 -17.1 133.7 -16.8L132.2 -4.4Q132.1 -3.2 131.85 -2.85Q131.6 -2.5 130.7 -2.1Q125.9 -0.4 121.15 0.4Q116.4 1.2 112.1 1.2Q101.3 1.2 92.9 -2.85Q84.5 -6.9 79.7 -14.15Q74.9 -21.4 74.9 -30.8Q74.9 -38 77.75 -44.05Q80.6 -50.1 85.75 -54.45Q90.9 -58.8 97.8 -61.2Q104.7 -63.6 112.7 -63.6Z","x1":2.8,"y1":-63.6,"x2":133.7,"y2":1.2},"name":{"d":"M10.3 -8.1L10.3 -54.4Q10.3 -57.3 9.8 -58.75Q9.3 -60.2 7.75 -60.75Q6.2 -61.3 3.2 -61.3Q2.9 -61.3 2.9 -61.9Q2.9 -62.5 3.2 -62.5Q5.8 -62.5 9 -62.35Q12.2 -62.2 15.8 -62.2Q19.6 -62.2 22.8 -62.35Q26 -62.5 28.5 -62.5Q28.8 -62.5 28.8 -61.9Q28.8 -61.3 28.5 -61.3Q25.5 -61.3 24 -60.7Q22.5 -60.1 21.95 -58.6Q21.4 -57.1 21.4 -54.2L21.4 -33L40.2 -52.2Q43.9 -55.9 42.95 -58.6Q42 -61.3 37 -61.3Q36.7 -61.3 36.7 -61.9Q36.7 -62.5 37 -62.5Q39.7 -62.5 42.5 -62.35Q45.3 -62.2 49.9 -62.2Q54.7 -62.2 57.5 -62.35Q60.3 -62.5 62.9 -62.5Q63.2 -62.5 63.2 -61.9Q63.2 -61.3 62.9 -61.3Q58.3 -61.3 52.8 -58.65Q47.3 -56 42.8 -51.6L31.5 -40.1L46.3 -20.1Q50.2 -14.6 52.9 -11.05Q55.6 -7.5 57.45 -5.45Q59.3 -3.4 60.7 -2.5Q62.1 -1.6 63.45 -1.4Q64.8 -1.2 66.4 -1.2Q66.7 -1.2 66.7 -0.6Q66.7 0 66.4 0L55.2 0Q53.7 0 52.6 0.1Q51.5 0.2 50.7 0.2Q49.4 0.2 48.4 -0.3Q47.4 -0.8 46.05 -2.3Q44.7 -3.8 42.5 -6.7Q40.3 -9.6 36.7 -14.5L23.6 -32.1L21.4 -29.9L21.4 -8.1Q21.4 -5.2 21.9 -3.7Q22.4 -2.2 23.9 -1.7Q25.4 -1.2 28.5 -1.2Q28.9 -1.2 28.9 -0.6Q28.9 0 28.5 0Q25.9 0 22.75 -0.1Q19.6 -0.2 15.8 -0.2Q12.2 -0.2 8.9 -0.1Q5.6 0 3 0Q2.8 0 2.8 -0.6Q2.8 -1.2 3 -1.2Q6.1 -1.2 7.65 -1.7Q9.2 -2.2 9.75 -3.7Q10.3 -5.2 10.3 -8.1ZM93.4 1.3Q87.1 1.3 82.5 -1.6Q77.9 -4.5 75.4 -9.35Q72.9 -14.2 72.9 -19.8Q72.9 -25 74.9 -28.8Q76.9 -32.6 80.2 -35.05Q83.5 -37.5 87.4 -38.7Q91.3 -39.9 95.1 -39.9Q101.5 -39.9 106.05 -36.9Q110.6 -33.9 113 -29.2Q115.4 -24.5 115.4 -19.2Q115.4 -13.1 112.35 -8.45Q109.3 -3.8 104.3 -1.25Q99.3 1.3 93.4 1.3ZM96.4 -0.8Q100.4 -0.8 102.4 -4.7Q104.4 -8.6 104.4 -15.7Q104.4 -23 102.55 -27.9Q100.7 -32.8 97.8 -35.3Q94.9 -37.8 91.7 -37.8Q87.8 -37.8 85.75 -34.3Q83.7 -30.8 83.7 -23.5Q83.7 -16.7 85.4 -11.55Q87.1 -6.4 90 -3.6Q92.9 -0.8 96.4 -0.8ZM148.3 1.3Q142 1.3 137.4 -1.6Q132.8 -4.5 130.3 -9.35Q127.8 -14.2 127.8 -19.8Q127.8 -25 129.8 -28.8Q131.8 -32.6 135.1 -35.05Q138.4 -37.5 142.3 -38.7Q146.2 -39.9 150 -39.9Q156.4 -39.9 160.95 -36.9Q165.5 -33.9 167.9 -29.2Q170.3 -24.5 170.3 -19.2Q170.3 -13.1 167.25 -8.45Q164.2 -3.8 159.2 -1.25Q154.2 1.3 148.3 1.3ZM151.3 -0.8Q155.3 -0.8 157.3 -4.7Q159.3 -8.6 159.3 -15.7Q159.3 -23 157.45 -27.9Q155.6 -32.8 152.7 -35.3Q149.8 -37.8 146.6 -37.8Q142.7 -37.8 140.65 -34.3Q138.6 -30.8 138.6 -23.5Q138.6 -16.7 140.3 -11.55Q142 -6.4 144.9 -3.6Q147.8 -0.8 151.3 -0.8ZM222.2 -63.6Q225.2 -63.6 228.45 -63.3Q231.7 -63 234.6 -62.4Q237.5 -61.8 239.5 -60.9Q240.4 -60.6 240.65 -60.15Q240.9 -59.7 241 -58.6L242.3 -44.7Q242.3 -44.4 241.8 -44.3Q241.3 -44.2 241.1 -44.6Q238.3 -52.7 233.15 -57.1Q228 -61.5 220.6 -61.5Q213.8 -61.5 208.45 -57.85Q203.1 -54.2 200.05 -47.5Q197 -40.8 197 -31.5Q197 -24.5 198.8 -18.85Q200.6 -13.2 203.9 -9.2Q207.2 -5.2 211.7 -3.05Q216.2 -0.9 221.6 -0.9Q228.7 -0.9 233.35 -4.75Q238 -8.6 242.1 -17Q242.3 -17.3 242.75 -17.2Q243.2 -17.1 243.2 -16.8L241.7 -4.4Q241.6 -3.2 241.35 -2.85Q241.1 -2.5 240.2 -2.1Q235.4 -0.4 230.65 0.4Q225.9 1.2 221.6 1.2Q210.8 1.2 202.4 -2.85Q194 -6.9 189.2 -14.15Q184.4 -21.4 184.4 -30.8Q184.4 -38 187.25 -44.05Q190.1 -50.1 195.25 -54.45Q200.4 -58.8 207.3 -61.2Q214.2 -63.6 222.2 -63.6ZM285.5 0.6Q285.1 0.8 284.5 0.8Q282.7 0.8 280.9 -1.6Q279.7 -3.1 279.3 -5.5L275.1 -2.5Q272.9 -0.8 270.9 -0.05Q268.9 0.7 266.3 0.7Q261.9 0.7 259.75 -1.25Q257.6 -3.2 257.6 -6.5Q257.6 -9.8 259.4 -11.55Q261.2 -13.3 264.1 -14.35Q267 -15.4 270.1 -16.5L279.1 -19.8L279.1 -25.5Q279.1 -31.8 278.1 -34.75Q277.1 -37.7 274.5 -37.7Q272 -37.7 270.75 -36.15Q269.5 -34.6 269.05 -32.7Q268.6 -30.8 268.5 -29.5Q268.2 -26.4 266.7 -25.15Q265.2 -23.9 262.7 -23.9Q260.1 -23.9 259 -25Q257.9 -26.1 257.9 -27.7Q257.9 -30.1 260.05 -32.25Q262.2 -34.4 265.5 -36.05Q268.8 -37.7 272.35 -38.65Q275.9 -39.6 278.6 -39.6Q282.7 -39.6 285.6 -37Q288.5 -34.4 288.5 -28.5L288.5 -10.8Q288.5 -7.9 289.55 -6.3Q290.6 -4.7 292.5 -4.7Q293.9 -4.7 295.4 -5.4Q295.5 -5.5 295.7 -5.4Q295.9 -5.4 296.1 -5.1Q296.2 -4.7 296.1 -4.5Q296 -4.4 295.8 -4.3ZM279.1 -7.2Q279.1 -7.8 279.1 -8.5L279.1 -18.1L274.8 -16.1Q274 -15.8 272.5 -15.15Q271 -14.5 269.8 -13.25Q268.6 -12 268.6 -9.7Q268.6 -7.1 270.3 -5.85Q272 -4.6 273.7 -4.6Q274.5 -4.6 275.25 -4.8Q276 -5 277 -5.7ZM305.6 0Q305.3 0 305.3 -0.6Q305.3 -1.2 305.6 -1.2Q308.7 -1.2 309.8 -2.65Q310.9 -4.1 310.9 -8.1L310.9 -26.9Q310.9 -30 310.2 -31.45Q309.5 -32.9 307.8 -32.9Q306.9 -32.9 305.7 -32.55Q304.5 -32.2 303 -31.5Q302.9 -31.4 302.7 -31.5Q302.5 -31.5 302.4 -31.9Q302.2 -32.5 302.4 -32.6L316.3 -39.4Q316.9 -39.6 317 -39.6Q318.1 -39.6 319.2 -37.2Q320.1 -35.3 320.3 -32Q322.1 -34 323.6 -35.3Q326.3 -37.7 328.2 -38.65Q330.1 -39.6 331.6 -39.6Q333.7 -39.6 335.95 -38.05Q338.2 -36.5 338.2 -34Q338.2 -31.9 336.95 -30.55Q335.7 -29.2 333.5 -29.2Q331.4 -29.2 330.35 -30.3Q329.3 -31.4 328.45 -32.45Q327.6 -33.5 326 -33.5Q325.3 -33.5 324.45 -33.05Q323.6 -32.6 322.1 -31.3Q321.3 -30.6 320.3 -29.6L320.3 -8.1Q320.3 -5.5 321.1 -3.95Q321.9 -2.4 323.85 -1.8Q325.8 -1.2 329.2 -1.2Q329.6 -1.2 329.6 -0.6Q329.6 0 329.2 0Q326.5 0 323.05 -0.1Q319.6 -0.2 315.6 -0.2Q312.8 -0.2 310.2 -0.1Q307.6 0 305.6 0ZM357.4 -33.8Q357.4 -31.7 358.55 -30.05Q359.7 -28.4 361.5 -27.05Q363.3 -25.7 365.4 -24.4Q367.9 -23 370.3 -21.45Q372.7 -19.9 374.3 -17.7Q375.9 -15.5 375.9 -12Q375.9 -8.8 374.25 -5.75Q372.6 -2.7 369.3 -0.8Q366 1.1 361 1.1Q358.5 1.1 356 0.55Q353.5 0 350.6 -1.6Q350.4 -1.8 350.2 -2.1Q350 -2.4 350 -2.8L349.8 -12.7Q349.8 -13 350.35 -13.05Q350.9 -13.1 351 -12.9Q352.1 -9.7 354.1 -6.95Q356.1 -4.2 358.65 -2.55Q361.2 -0.9 363.8 -0.9Q365.8 -0.9 367.1 -2.15Q368.4 -3.4 368.4 -6Q368.4 -8.8 367.15 -10.65Q365.9 -12.5 364 -13.85Q362.1 -15.2 360.1 -16.3Q357.8 -17.6 355.5 -19Q353.2 -20.4 351.7 -22.55Q350.2 -24.7 350.2 -28.2Q350.2 -32.4 352.3 -34.9Q354.4 -37.4 357.75 -38.5Q361.1 -39.6 364.7 -39.6Q366.9 -39.6 368.75 -39.3Q370.6 -39 373 -38.1Q373.9 -37.8 373.9 -37Q373.9 -35 373.8 -32.85Q373.7 -30.7 373.7 -28.1Q373.7 -27.8 373.1 -27.8Q372.5 -27.8 372.5 -28.1Q372.5 -30 370.95 -32.2Q369.4 -34.4 366.9 -36.05Q364.4 -37.7 361.5 -37.7Q360.1 -37.7 358.75 -37Q357.4 -36.3 357.4 -33.8Z","x1":2.8,"y1":-63.6,"x2":375.9,"y2":1.3}};

const WIDTH = 640;
const GOLD = '#C9A84C'; // liseré du carré
const GOLD_LIGHT = '#F0CF6E'; // lettres « KC » : doré clair, bien lisible

// ── Bandeau « encar.com » : gabarit fixe calé sur le coin bas-droit ──────────
const TPL_W = BOTTOM_MASK.W;
const TPL_H = BOTTOM_MASK.H;
// gabarit décompressé au premier usage (DecompressionStream : pas de zlib dans le navigateur)
let TPL;

function dilate(mask, w, h, r, ry = r) {
  const tmp = new Uint8Array(w * h);
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!mask[y * w + x]) continue;
      for (let dx = -r; dx <= r; dx++) {
        const nx = x + dx;
        if (nx >= 0 && nx < w) tmp[y * w + nx] = 1;
      }
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!tmp[y * w + x]) continue;
      for (let dy = -ry; dy <= ry; dy++) {
        const ny = y + dy;
        if (ny >= 0 && ny < h) out[ny * w + x] = 1;
      }
    }
  }
  return out;
}

function bottomBanner(rgb, w, h) {
  const ox = w - TPL_W;
  const oy = h - TPL_H;
  let on = 0;
  let hit = 0;
  for (let y = 0; y < TPL_H; y++) {
    for (let x = 0; x < TPL_W; x++) {
      if (!TPL[y * TPL_W + x]) continue;
      on++;
      const i = ((oy + y) * w + ox + x) * 3;
      const luma = 0.3 * rgb[i] + 0.59 * rgb[i + 1] + 0.11 * rgb[i + 2];
      if (luma > 150) hit++;
    }
  }
  if (hit / on < 0.75) return null; // pas de bandeau sur cette photo

  const local = new Uint8Array(TPL_W * TPL_H);
  local.set(TPL);
  // la barre translucide « 신뢰를 더하다 » s'estompe vers la droite : on la couvre en entier
  for (let y = 12; y < 34; y++) for (let x = 28; x < 200; x++) local[y * TPL_W + x] = 1;
  const grown = dilate(local, TPL_W, TPL_H, 4);
  const mask = new Uint8Array(w * h);
  for (let y = 0; y < TPL_H; y++) {
    for (let x = 0; x < TPL_W; x++) {
      if (grown[y * TPL_W + x]) mask[(oy + y) * w + ox + x] = 1;
    }
  }
  return mask;
}

// ── Logo « Trust Encar » : détection par écart au fond ───────────────────────
const SEARCH = { x0: 270, x1: 610, y0: 0, y1: 150 };

function topLogo(rgb, w, h) {
  const { x0, x1, y0, y1 } = SEARCH;
  const rw = x1 - x0;
  const rh = y1 - y0;
  if (h < y1) return null;

  // fond estimé ligne par ligne : interpolation entre les marges gauche et droite
  const bgL = [];
  const bgR = [];
  for (let y = y0; y < y1; y++) {
    const l = [0, 0, 0];
    const r = [0, 0, 0];
    for (let k = 0; k < 6; k++) {
      for (let c = 0; c < 3; c++) {
        l[c] += rgb[(y * w + x0 + k) * 3 + c] / 6;
        r[c] += rgb[(y * w + x1 - 1 - k) * 3 + c] / 6;
      }
    }
    bgL.push(l);
    bgR.push(r);
  }

  // décor de rue / concession (tout à gauche du logo est chargé) : pas de logo « Trust » de studio à retirer
  let clutter = 0;
  for (let y = 0; y < 80; y++) {
    const row = [];
    for (let x = 0; x < x0; x++) row.push(rgb[(y * w + x) * 3 + 1]);
    row.sort((a, b) => a - b);
    const med = row[row.length >> 1];
    for (const v of row) if (Math.abs(v - med) > 34) clutter++;
  }
  if (clutter > 6500) return null;

  // écart au fond (0-255) et teinte rouge (logo rouge sur studio blanc)
  const gap = new Uint8Array(rw * rh);
  const red = new Uint8Array(rw * rh);
  for (let y = 0; y < rh; y++) {
    for (let x = 0; x < rw; x++) {
      const t = x / (rw - 1);
      const i = ((y + y0) * w + x + x0) * 3;
      let d = 0;
      for (let c = 0; c < 3; c++) {
        d = Math.max(d, Math.abs(rgb[i + c] - (bgL[y][c] * (1 - t) + bgR[y][c] * t)));
      }
      gap[y * rw + x] = d;
      if (d > 30 && rgb[i] - rgb[i + 1] > 28 && rgb[i] - rgb[i + 2] > 15) red[y * rw + x] = 1;
    }
  }

  const strong = new Uint8Array(rw * rh);
  for (let i = 0; i < strong.length; i++) if (gap[i] > 34) strong[i] = 1;

  const first = findLogo(strong, gap, rw, rh, w, h);
  if (first && !first.hard) return first;
  const second = findLogo(red, gap, rw, rh, w, h);
  if (second && !second.hard) return second;
  return first || second;
}

// Composantes connexes d'une carte binaire (après dilatation de rayon r).
function components(bin, rw, rh, r, ry = r) {
  const grown = dilate(bin, rw, rh, r, ry);
  const label = new Int32Array(rw * rh).fill(-1);
  const comps = [];
  const stack = [];
  for (let s = 0; s < rw * rh; s++) {
    if (!grown[s] || label[s] !== -1) continue;
    const id = comps.length;
    const comp = { minX: rw, maxX: 0, minY: rh, maxY: 0, area: 0 };
    stack.push(s);
    label[s] = id;
    while (stack.length) {
      const p = stack.pop();
      const px = p % rw;
      const py = (p / rw) | 0;
      comp.area++;
      if (px < comp.minX) comp.minX = px;
      if (px > comp.maxX) comp.maxX = px;
      if (py < comp.minY) comp.minY = py;
      if (py > comp.maxY) comp.maxY = py;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = px + dx;
          const ny = py + dy;
          if (nx < 0 || ny < 0 || nx >= rw || ny >= rh) continue;
          const n = ny * rw + nx;
          if (grown[n] && label[n] === -1) {
            label[n] = id;
            stack.push(n);
          }
        }
      }
    }
    comps.push(comp);
  }
  return { comps, label };
}

// Sans bloc « Encar » exploitable : on isole « Trust » en coupant la carte là où commence la voiture
// (première ligne très remplie), puis on cherche les petits morceaux compacts au-dessus.
function trustPieces(bin, rw, rh, trustLike) {
  const count = (y) => {
    let n = 0;
    for (let x = 0; x < rw; x++) n += bin[y * rw + x];
    return n;
  };
  let cut = rh;
  for (let y = 0; y < rh; y++) {
    if (count(y) > 70) {
      cut = y;
      break;
    }
  }
  // le logo est ce qui dépasse tout en haut, au-dessus de la voiture : on part du premier rang non vide
  let minY = -1;
  for (let y = 0; y < cut; y++) {
    // vrai début du logo : plusieurs rangs de suite remplis (les pixels isolés du haut sont du bruit)
    let block = 0;
    for (let k = y; k < Math.min(cut, y + 8); k++) block += count(k);
    if (count(y) >= 3 && block >= 40) {
      minY = y;
      break;
    }
  }
  if (minY < 0 || cut - minY < 6) return [];
  // centre horizontal du mot « Trust » (les ~22 premiers rangs)
  let sum = 0;
  let n = 0;
  let lo = rw;
  let hi = 0;
  for (let y = minY; y < Math.min(cut - 2, minY + 16); y++) {
    for (let x = 0; x < rw; x++) {
      if (!bin[y * rw + x]) continue;
      sum += x;
      n++;
      if (x < lo) lo = x;
      if (x > hi) hi = x;
    }
  }
  // un vrai « Trust » : petit, compact, sur fond uni ; sinon (décor chargé) on ne touche à rien
  if (n < 25 || n > 900 || hi - lo > 100) return [];
  const cx = Math.round(sum / n);
  // rien d'autre de gros tout à gauche/droite : décor chargé
  const pieces = [{ minX: cx - 45, maxX: cx + 100, minY, maxY: cut - 4, area: n }];
  pieces.extendY = cut - 4;
  pieces.only = pieces[0];
  return pieces;
}

// Cherche la composante « logo » dans une carte binaire de la zone de recherche.
function findLogo(bin, gap, rw, rh, w, h) {
  const { x0, y0 } = SEARCH;
  const { comps, label } = components(bin, rw, rh, 2);

  // composantes « logo » : compactes, sans toucher les marges ni le bas de la zone
  // (sinon c'est la voiture)
  const keep = comps.map(
    (c) =>
      c.area >= 60 &&
      c.minX > 1 &&
      c.maxX < rw - 2 &&
      c.maxY < rh - 2 &&
      c.maxX - c.minX < 200 &&
      c.maxY - c.minY < 80,
  );
  // le logo = la plus grosse composante, plus ses voisines immédiates (« Trust », « with AUTOHUB »)
  let main = -1;
  comps.forEach((c, i) => {
    if (keep[i] && (main < 0 || c.area > comps[main].area)) main = i;
  });
  // morceaux de logo « isolés » (ni la voiture ni les bords) : sert au carré « KC » de secours
  const loose = (c) =>
    c.area >= 25 &&
    c.area <= 900 &&
    c.minX > 1 &&
    c.maxX < rw - 2 &&
    c.maxY < 100 - SEARCH.y0 &&
    c.maxY - c.minY < 45;
  // aucun bloc « Encar » exploitable : on cherche le mot « Trust » (petit script, juste au-dessus de la voiture)
  const trustLike = (c) => {
    const cw = c.maxX - c.minX;
    const ch = c.maxY - c.minY;
    return c.area >= 25 && c.area <= 900 && c.minX > 1 && c.maxX < rw - 2 && cw >= 25 && cw <= 75 && ch >= 8 && ch <= 30 && c.maxY < 122 - SEARCH.y0;
  };
  if (main < 0) {
    // dilatation horizontale seulement : « Trust » ne fusionne plus avec le toit sous lui
    return squareFor(trustPieces(bin, rw, rh, trustLike), rw, w, h);
  }
  const near = (c) =>
    c.maxX > comps[main].minX - 15 &&
    c.minX < comps[main].maxX + 15 &&
    c.maxY > comps[main].minY - 15 &&
    c.minY < comps[main].maxY + 15;
  comps.forEach((c, i) => {
    keep[i] = keep[i] && near(c);
  });
  const kept = comps.filter((_, i) => keep[i]);
  const box = {
    minX: Math.min(...kept.map((c) => c.minX)),
    maxX: Math.max(...kept.map((c) => c.maxX)),
    minY: Math.min(...kept.map((c) => c.minY)),
    maxY: Math.max(...kept.map((c) => c.maxY)),
  };
  const bw = box.maxX - box.minX;
  const bh = box.maxY - box.minY;
  if (bw < 50 || bw > 200 || bh < 14 || bh > 90) {
    return squareFor(trustPieces(bin, rw, rh, trustLike), rw, w, h);
  }
  // reste-t-il des bouts de logo à côté (mal séparés de la voiture) ? alors carré « KC »
  const leftovers = comps.filter(
    (c, i) =>
      !keep[i] &&
      loose(c) &&
      c.maxX > box.minX - 40 &&
      c.minX < box.maxX + 40 &&
      c.maxY <= box.maxY + 6 &&
      c.minY > box.minY - 50,
  );
  const extra = leftovers.length ? squareFor([...kept, ...leftovers], rw, w, h) : null;

  const raw = new Uint8Array(rw * rh);
  for (let y = box.minY; y <= box.maxY; y++) {
    for (let x = box.minX; x <= box.maxX; x++) {
      const l = label[y * rw + x];
      if (l >= 0 && keep[l] && bin[y * rw + x]) raw[y * rw + x] = 1;
    }
  }
  // sous-titre discret (« with AUTOHUB ») sous le logo, tant qu'on ne rejoint pas la voiture
  for (let y = box.maxY + 1; y <= Math.min(rh - 1, box.maxY + 28); y++) {
    const row = [];
    for (let x = Math.max(0, box.minX - 4); x <= Math.min(rw - 1, box.maxX + 4); x++) {
      if (gap[y * rw + x] > 11) row.push(x);
    }
    if (row.length > 70) break;
    for (const x of row) raw[y * rw + x] = 1;
  }

  const grownMask = dilate(raw, rw, rh, 4);
  const mask = new Uint8Array(w * h);
  for (let y = 0; y < rh; y++) {
    for (let x = 0; x < rw; x++) {
      if (grownMask[y * rw + x]) mask[(y + y0) * w + x + x0] = 1;
    }
  }
  if (extra) for (let i = 0; i < mask.length; i++) if (extra.mask[i]) mask[i] = 1;
  return { mask, hard: !!extra };
}

// Restes de logo impossibles à séparer proprement de la voiture : on efface un rectangle serré
// autour d'eux (remplissage avec le fond), sans jamais toucher la voiture en dessous.
function squareFor(pieces, rw, w, h) {
  const { x0, y0 } = SEARCH;
  if (!pieces.length) return null;
  // on part du morceau le plus gros et on ne garde que ses voisins
  const main = pieces.reduce((a, c) => (c.area > a.area ? c : a));
  const group = pieces.only
    ? [pieces.only]
    : pieces.filter(
        (c) =>
          c.maxX > main.minX - 40 &&
          c.minX < main.maxX + 40 &&
          c.maxY > main.minY - 40 &&
          c.minY < main.maxY + 40,
      );
  let minX = Math.min(...group.map((c) => c.minX));
  let maxX = Math.max(...group.map((c) => c.maxX));
  const minY = Math.min(...group.map((c) => c.minY));
  let maxY = Math.max(...group.map((c) => c.maxY));
  if (maxX - minX < 60) {
    // seul « Trust » (et parfois un bout d'« Encar ») est visible
    maxY = Math.max(maxY, pieces.extendY ?? maxY);
    maxX = minX + 140;
    minX -= 6;
  }
  const mask = new Uint8Array(w * h);
  for (let y = Math.max(0, y0 + minY - 4); y <= Math.min(h - 1, y0 + maxY + 3); y++) {
    for (let x = Math.max(0, x0 + minX - 6); x <= Math.min(w - 1, x0 + maxX + 6); x++) mask[y * w + x] = 1;
  }
  return { mask, hard: true };
}

// ── Plaque rouge « Encar » posée sur la voiture ──────────────────────────────
function plateFinder(rgb, w, h) {
  const y0 = 140;
  const y1 = Math.min(h, 345);
  const x0 = 60;
  const x1 = 580;
  const rw = x1 - x0;
  const rh = y1 - y0;
  const red = new Uint8Array(rw * rh);
  for (let y = 0; y < rh; y++) {
    for (let x = 0; x < rw; x++) {
      const i = ((y + y0) * w + x + x0) * 3;
      if (rgb[i] > 110 && rgb[i] - rgb[i + 1] > 70 && rgb[i] - rgb[i + 2] > 55) red[y * rw + x] = 1;
    }
  }
  const grown = dilate(red, rw, rh, 2); // relie les lettres blanches au reste de la plaque
  const seen = new Uint8Array(rw * rh);
  let best = null;
  const stack = [];
  for (let s = 0; s < rw * rh; s++) {
    if (!grown[s] || seen[s]) continue;
    const c = { minX: rw, maxX: 0, minY: rh, maxY: 0, red: 0, area: 0 };
    stack.push(s);
    seen[s] = 1;
    while (stack.length) {
      const p = stack.pop();
      const px = p % rw;
      const py = (p / rw) | 0;
      c.area++;
      if (red[p]) c.red++;
      if (px < c.minX) c.minX = px;
      if (px > c.maxX) c.maxX = px;
      if (py < c.minY) c.minY = py;
      if (py > c.maxY) c.maxY = py;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = px + dx;
          const ny = py + dy;
          if (nx < 0 || ny < 0 || nx >= rw || ny >= rh) continue;
          const n = ny * rw + nx;
          if (grown[n] && !seen[n]) {
            seen[n] = 1;
            stack.push(n);
          }
        }
      }
    }
    // taille et proportions d'une plaque (pas la carrosserie d'une voiture rouge)
    const bw = c.maxX - c.minX - 3;
    const bh = c.maxY - c.minY - 3;
    if (bw < 28 || bw > 100 || bh < 10 || bh > 45) continue;
    const ratio = bw / bh;
    if (ratio < 1.8 || ratio > 4.5) continue;
    if (c.red / (bw * bh) < 0.45) continue;
    if (!best || c.red > best.red) best = { ...c, bw, bh };
  }
  if (!best) return null;

  // texte blanc = pixels non rouges à l'intérieur de la plaque
  const bx = best.minX + 2;
  const by = best.minY + 2;
  const mask = new Uint8Array(w * h);
  let any = 0;
  for (let y = Math.round(best.bh * 0.12); y < best.bh * 0.9; y++) {
    for (let x = Math.round(best.bw * 0.08); x < best.bw * 0.92; x++) {
      const gx = bx + x;
      const gy = by + y;
      if (!red[gy * rw + gx]) {
        mask[(gy + y0) * w + gx + x0] = 1;
        any++;
      }
    }
  }
  if (any < 20) return null;
  const grownMask = dilate(mask, w, h, 1);
  return {
    mask: grownMask,
    cx: x0 + bx + best.bw / 2,
    cy: y0 + by + best.bh / 2,
    size: best.bh * 0.5,
  };
}

// ── Remplissage (push-pull) des zones masquées avec le fond voisin ───────────
function inpaint(rgb, mask, w, h) {
  const levels = [];
  let cw = w;
  let ch = h;
  let color = new Float32Array(w * h * 3);
  let weight = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    if (mask[i]) continue;
    weight[i] = 1;
    for (let c = 0; c < 3; c++) color[i * 3 + c] = rgb[i * 3 + c];
  }
  levels.push({ color, weight, w: cw, h: ch });
  while (cw > 1 && ch > 1) {
    const nw = Math.ceil(cw / 2);
    const nh = Math.ceil(ch / 2);
    const nc = new Float32Array(nw * nh * 3);
    const nwt = new Float32Array(nw * nh);
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        const wi = weight[y * cw + x];
        if (!wi) continue;
        const j = (y >> 1) * nw + (x >> 1);
        nwt[j] += wi;
        for (let c = 0; c < 3; c++) nc[j * 3 + c] += color[(y * cw + x) * 3 + c] * wi;
      }
    }
    for (let j = 0; j < nw * nh; j++) {
      if (nwt[j]) for (let c = 0; c < 3; c++) nc[j * 3 + c] /= nwt[j];
      nwt[j] = Math.min(1, nwt[j]);
    }
    color = nc;
    weight = nwt;
    cw = nw;
    ch = nh;
    levels.push({ color, weight, w: cw, h: ch });
  }
  // remontée : on comble les trous avec le niveau plus grossier
  for (let l = levels.length - 2; l >= 0; l--) {
    const fine = levels[l];
    const coarse = levels[l + 1];
    for (let y = 0; y < fine.h; y++) {
      for (let x = 0; x < fine.w; x++) {
        const i = y * fine.w + x;
        if (fine.weight[i] >= 1) continue;
        const j = (y >> 1) * coarse.w + (x >> 1);
        const a = fine.weight[i];
        for (let c = 0; c < 3; c++) {
          fine.color[i * 3 + c] = fine.color[i * 3 + c] * a + coarse.color[j * 3 + c] * (1 - a);
        }
        fine.weight[i] = 1;
      }
    }
  }
  const out = levels[0].color;

  // diffusion (Gauss-Seidel) limitée à la zone remplie : raccorde proprement au fond
  const idx = [];
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) if (mask[y * w + x]) idx.push(y * w + x);
  for (let it = 0; it < 120; it++) {
    for (const i of idx) {
      for (let c = 0; c < 3; c++) {
        out[i * 3 + c] =
          (out[(i - 1) * 3 + c] + out[(i + 1) * 3 + c] + out[(i - w) * 3 + c] + out[(i + w) * 3 + c]) / 4;
      }
    }
  }
  // léger grain pour ne pas laisser d'aplat parfaitement lisse
  let seed = 1234567;
  for (const i of idx) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const n = ((seed >>> 24) / 255 - 0.5) * 5;
    for (let c = 0; c < 3; c++) out[i * 3 + c] += n;
  }
  return out;
}

async function loadTemplate() {
  if (TPL) return;
  const bytes = Uint8Array.from(atob(BOTTOM_MASK.data), (c) => c.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));
  TPL = new Uint8Array(await new Response(stream).arrayBuffer());
}

// ── « KC » tracé sur la plaque (contour sombre discret pour rester net sur tout fond) ──
function drawKc(ctx, cx, cy, size, color, weight) {
  const s = size / 28;
  const gw = 26 * s; // largeur d'une lettre
  const gap = 8 * s;
  const left = cx - (gw * 2 + gap) / 2;
  const top = cy - size / 2;
  const k =
    `M${left} ${top} V${top + size} ` +
    `M${left + gw} ${top} L${left + 1.5 * s} ${top + size * 0.56} ` +
    `M${left + 7 * s} ${top + size * 0.42} L${left + gw} ${top + size}`;
  const cLeft = left + gw + gap;
  const r = size / 2;
  const c = `M${cLeft + gw} ${cy - r * 0.62} A${r * 0.98} ${r} 0 1 0 ${cLeft + gw} ${cy + r * 0.62}`;
  const glyph = new Path2D(k + ' ' + c);
  ctx.save();
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = (weight + 3) * s;
  ctx.stroke(glyph);
  ctx.strokeStyle = color;
  ctx.lineWidth = weight * s;
  ctx.stroke(glyph);
  ctx.restore();
}

// Badge : carré noir, « KC » puis « KooCars » juste en dessous.
function drawBadge(ctx, x, y, side) {
  const fit = (g, width) => {
    const k = width / (g.x2 - g.x1);
    return { k, w: width, h: (g.y2 - g.y1) * k };
  };
  const kc = fit(BRAND.kc, side * 0.56);
  const name = fit(BRAND.name, side * 0.74);
  const gap = side * 0.09;
  const top = y + (side - (kc.h + gap + name.h)) / 2;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x + 0.5, y + 0.5, side - 1, side - 1, 3);
  ctx.fillStyle = '#0b0b0b';
  ctx.fill();
  ctx.globalAlpha = 0.6;
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  const place = (g, m, t, color) => {
    ctx.save();
    ctx.translate(x + (side - m.w) / 2 - g.x1 * m.k, t - g.y1 * m.k);
    ctx.scale(m.k, m.k);
    ctx.fillStyle = color;
    ctx.fill(new Path2D(g.d));
    ctx.restore();
  };
  place(BRAND.kc, kc, top, GOLD_LIGHT);
  place(BRAND.name, name, top + kc.h + gap, '#D9B95F');
}

/**
 * Nettoie l'image dessinée sur `ctx` (w × h) en place.
 * `studio` : seules les premières photos (extérieur, en studio) portent « Trust Encar » et la plaque.
 */
export async function cleanCanvas(ctx, w, h, studio) {
  await loadTemplate();
  const image = ctx.getImageData(0, 0, w, h);
  const rgba = image.data;
  const data = new Uint8Array(w * h * 3);
  for (let i = 0, j = 0; i < w * h; i++, j += 4) {
    data[i * 3] = rgba[j];
    data[i * 3 + 1] = rgba[j + 1];
    data[i * 3 + 2] = rgba[j + 2];
  }

  // le nettoyage est calé sur le format des photos Encar (640 px de large) ;
  // les photos studio font 640×360 (ou 366), les autres (concessionnaires) n'ont pas de logo « Trust »
  const encarSize = w === WIDTH;
  const isStudio = studio !== false && encarSize && h >= 355 && h <= 370;
  const bottom = encarSize ? bottomBanner(data, w, h) : null;
  const top = isStudio ? topLogo(data, w, h) : null;
  const plate = isStudio ? plateFinder(data, w, h) : null;

  const masks = [bottom, top && top.mask, plate && plate.mask].filter(Boolean);
  if (masks.length) {
    const mask = new Uint8Array(w * h);
    for (const m of masks) for (let i = 0; i < mask.length; i++) if (m[i]) mask[i] = 1;
    const filled = inpaint(data, mask, w, h);
    for (let i = 0; i < w * h; i++) {
      if (!mask[i]) continue;
      for (let c = 0; c < 3; c++) {
        rgba[i * 4 + c] = Math.round(Math.max(0, Math.min(255, filled[i * 3 + c])));
      }
    }
    ctx.putImageData(image, 0, 0);
  }

  // Badge « KC / KooCars » sur TOUTES les photos, en petit dans le coin haut droit
  const side = Math.round(w * 0.125); // 80 px pour une photo de 640 px
  drawBadge(ctx, w - side - Math.round(w * 0.012), Math.round(w * 0.012), side);
  if (plate) drawKc(ctx, plate.cx, plate.cy, plate.size, '#ffffff', 6);
}
