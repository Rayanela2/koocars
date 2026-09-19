// Retire les marques Encar des photos (logo « Trust Encar » en haut, bandeau
// « encar.com » en bas à droite) et dessine « KC » à la place du logo.
const zlib = require('zlib');
const sharp = require('sharp');
const bottomMask = require('./_bottom_mask');
const brand = require('./_brand');

const WIDTH = 640;
const GOLD = '#C9A84C'; // liseré du carré
const GOLD_LIGHT = '#F0CF6E'; // lettres « KC » : doré clair, bien lisible

// ── Bandeau « encar.com » : gabarit fixe calé sur le coin bas-droit ──────────
const TPL_W = bottomMask.W;
const TPL_H = bottomMask.H;
const TPL = zlib.inflateSync(Buffer.from(bottomMask.data, 'base64'));

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

// ── « KC » tracé en vectoriel (pas de police nécessaire côté serveur) ────────
function kcPaths(cx, cy, size, color, weight) {
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
  const c =
    `M${cLeft + gw} ${cy - r * 0.62} ` + `A${r * 0.98} ${r} 0 1 0 ${cLeft + gw} ${cy + r * 0.62}`;
  // contour sombre discret sous les lettres : « KC » reste net sur fond blanc comme sur fond noir
  const glyph = `<path d="${k}"/><path d="${c}"/>`;
  return (
    `<g fill="none" stroke-linecap="butt" stroke-linejoin="miter">` +
    `<g stroke="rgba(0,0,0,0.55)" stroke-width="${(weight + 3) * s}">${glyph}</g>` +
    `<g stroke="${color}" stroke-width="${weight * s}">${glyph}</g></g>`
  );
}

// Badge : carré noir, « KC » puis « KooCars » juste en dessous (tracés de _brand.js).
function badge(x, y, side) {
  const fit = (g, width) => {
    const k = width / (g.x2 - g.x1);
    return { k, w: width, h: (g.y2 - g.y1) * k };
  };
  const kc = fit(brand.kc, side * 0.56);
  const name = fit(brand.name, side * 0.74);
  const gap = side * 0.09;
  const top = y + (side - (kc.h + gap + name.h)) / 2;
  const place = (g, m, t) =>
    `<path transform="translate(${x + (side - m.w) / 2 - g.x1 * m.k} ${t - g.y1 * m.k}) scale(${m.k})" d="${g.d}"/>`;
  return (
    `<rect x="${x + 0.5}" y="${y + 0.5}" width="${side - 1}" height="${side - 1}" rx="3" fill="#0b0b0b" ` +
    `stroke="${GOLD}" stroke-opacity="0.6" stroke-width="1"/>` +
    `<g fill="${GOLD_LIGHT}">${place(brand.kc, kc, top)}</g>` +
    `<g fill="#D9B95F">${place(brand.name, name, top + kc.h + gap)}</g>`
  );
}

async function cleanPhoto(input) {
  const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;

  // le nettoyage est calé sur le format des photos Encar (640 px de large) ;
  // les photos studio font 640×360 (ou 366), les autres (concessionnaires) n'ont pas de logo « Trust »
  const encarSize = w === WIDTH;
  const studio = encarSize && h >= 355 && h <= 370;
  const bottom = encarSize ? bottomBanner(data, w, h) : null;
  const top = studio ? topLogo(data, w, h) : null;
  const plate = studio ? plateFinder(data, w, h) : null;

  let out = data;
  const masks = [bottom, top && top.mask, plate && plate.mask].filter(Boolean);
  if (masks.length) {
    const mask = new Uint8Array(w * h);
    for (const m of masks) for (let i = 0; i < mask.length; i++) if (m[i]) mask[i] = 1;
    const filled = inpaint(data, mask, w, h);
    out = Buffer.alloc(w * h * 3);
    for (let i = 0; i < w * h; i++) {
      for (let c = 0; c < 3; c++) {
        out[i * 3 + c] = mask[i] ? Math.round(Math.max(0, Math.min(255, filled[i * 3 + c]))) : data[i * 3 + c];
      }
    }
  }

  // Badge « KC / KooCars » sur TOUTES les photos, en petit dans le coin haut droit
  // (le véhicule reste bien visible) ; le logo Encar, lui, est effacé plus haut.
  const side = Math.round(w * 0.125); // 80 px pour une photo de 640 px
  const x = w - side - Math.round(w * 0.012);
  const y = Math.round(w * 0.012);
  let marks = badge(x, y, side);
  if (plate) marks += kcPaths(plate.cx, plate.cy, plate.size, '#ffffff', 6);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${marks}</svg>`;
  return sharp(out, { raw: { width: w, height: h, channels: 3 } })
    .composite([{ input: Buffer.from(svg) }])
    .jpeg({ quality: 88 })
    .toBuffer();
}

module.exports = { cleanPhoto };
