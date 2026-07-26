/**
 * Mulberry32 PRNG.
 *
 * The seed is hashed before the stream starts so that sequential seeds — an
 * incrementing period index, say — produce unrelated sequences instead of
 * near-identical ones.
 */
export function mulberry32(seed: number): () => number {
  let a = seed;
  a = (a + 0x9e3779b9) | 0;
  let h = a ^ (a >>> 16);
  h = Math.imul(h, 0x21f0aaad);
  h = h ^ (h >>> 15);
  h = Math.imul(h, 0x735a2d97);
  a = h ^ (h >>> 15);

  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
