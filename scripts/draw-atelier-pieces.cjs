// SPDX-License-Identifier: MPL-2.0
const fs = require('node:fs')
const path = require('node:path')

const directory = path.join(__dirname, '..', 'assets', 'pieces', 'atelier')
fs.mkdirSync(directory, { recursive: true })

function draw(color, piece) {
  const fill = color === 'w' ? '#eeede9' : '#68635e'
  const edge = color === 'w' ? '#45433f' : '#282623'
  const shadowOpacity = color === 'w' ? 0.13 : 0.22
  const shineOpacity = color === 'w' ? 0.8 : 0.2
  let surface = 0
  const solid = (d, shadow = '', shine = '') => {
    const id = `surface-${surface++}`
    const contours = `<path d="${d}" fill="${fill}" stroke="${edge}" stroke-width="2.2"/>`
    if (!shadow && !shine) return contours
    return `<defs><clipPath id="${id}"><path d="${d}"/></clipPath></defs>${contours}`
      + `<g clip-path="url(#${id})">`
      + (shadow ? `<path d="${shadow}" fill="#000" opacity="${shadowOpacity}"/>` : '')
      + (shine ? `<path d="${shine}" fill="none" stroke="#fff" stroke-width="1.5" opacity="${shineOpacity}"/>` : '')
      + '</g>'
  }
  const line = (d, width = 1.6) => `<path d="${d}" fill="none" stroke="${edge}" stroke-width="${width}" opacity=".75"/>`
  const dot = (cx, cy, rx, ry) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${edge}" opacity=".8"/>`
  const base = (width) => {
    const left = 48 - width / 2
    const right = 48 + width / 2
    return solid(
      `M${left} 85V82C${left} 75 38 73 48 73C58 73 ${right} 75 ${right} 82V85Q${right} 87 ${right - 2} 87H${left + 2}Q${left} 87 ${left} 85Z`,
      `M51 73C66 74 ${right} 78 ${right} 85V88H${right - 9}C${right - 7} 80 62 76 51 73Z`,
      `M${left + 3} 80C${left + 8} 76 38 75 48 75C58 75 ${right - 8} 76 ${right - 3} 80`,
    )
  }
  const drawings = {
    K: () => solid(
      'M44 8H52V15H59V23H52V31H44V23H37V15H44Z',
      'M49 8H53V17H60V24H49Z',
      'M46 11V17H40V20',
    ) + solid(
      'M38 29C38 24 58 24 58 29C58 34 38 34 38 29Z',
      'M50 25C61 26 60 33 49 33Z',
      'M41 28Q46 26 50 28',
    ) + solid(
      'M20 40C18 33 34 31 48 31C62 31 78 33 76 40C73 52 64 66 62 75H34C32 66 23 52 20 40Z',
      'M51 32C78 35 61 55 52 76H63C66 63 74 50 77 39Z',
      'M25 38C25 35 37 34 44 34M25 42Q28 51 32 58',
    ) + base(56),
    Q: () => solid(
      'M48 8C55 8 55 19 48 19C41 19 41 8 48 8Z',
      'M48 8C55 12 50 18 47 20H55V8Z',
      'M45 12Q44 14 45 16',
    ) + solid(
      'M34 34C34 24 39 20 48 20C57 20 62 24 62 34Z',
      'M48 20C63 28 52 32 51 35H64V20Z',
      'M38 29Q40 24 46 23',
    ) + solid(
      'M20 37C18 31 26 35 31 41Q34 46 37 41L42 35Q48 29 54 35L59 41Q62 46 65 41C70 35 78 31 76 37L65 57C62 65 61 70 62 75H34C35 70 34 65 31 57Z',
      'M70 38C61 51 59 62 52 76H63C62 67 67 57 78 33Z',
      'M24 39Q32 51 35 61M44 35Q48 32 52 35',
    ) + base(56),
    R: () => solid(
      'M28 20Q28 18 30 18H38V27H44V18H52V27H58V18H66Q68 18 68 20V35Q68 42 61 44C61 55 64 65 67 75H29C32 65 35 55 35 44Q28 42 28 35Z',
      'M62 18C67 38 56 37 54 42C57 57 56 64 57 76H69C65 64 62 52 62 44C72 41 71 31 69 18Z',
      'M31 22V32M47 21V25M38 46L34 66',
    ) + line('M31 39Q48 43 65 39')
      + base(56),
    B: () => solid(
      'M48 11C55 11 55 18 48 18C41 18 41 11 48 11Z',
      'M48 11C55 15 48 18 48 18H55V11Z',
      'M45 14Q46 13 48 13',
    ) + solid(
      'M48 18C31 31 25 43 29 57C31 64 34 68 35 75H61C62 68 65 64 67 57C71 43 65 31 48 18Z',
      'M50 24C65 43 58 61 49 76H62C63 68 66 64 68 57C72 44 66 32 50 24Z',
      'M44 25C33 35 29 46 32 55',
    ) + line('M54 33L45 46', 3.3)
      + base(54),
    N: () => solid(
      'M34 75C32 64 43 60 49 50C42 53 38 57 31 58L22 55Q17 52 21 47L33 33L38 24L40 16L49 22C67 25 80 42 74 58L69 75Z',
      'M49 22C68 33 69 44 65 57L57 76H70L75 58C81 43 69 27 49 22Z',
      'M42 20L41 25L35 34L24 48M37 67Q41 61 46 58',
    ) + line('M49 50Q55 44 52 38M22 52L29 53', 1.4)
      + dot(38, 34, 1.8, 1.3)
      + dot(25, 47, 1.2, 1)
      + base(56),
    P: () => solid(
      'M42 49H54C54 62 61 67 65 75H31C35 67 42 62 42 49Z',
      'M48 49C51 63 54 69 58 76H67C61 67 54 62 54 49Z',
      'M44 54Q42 64 37 70',
    ) + solid(
      'M38 46Q48 44 58 46Q61 47 60 51Q48 54 36 51Q35 47 38 46Z',
      'M51 45L61 46V53H53Z',
      'M39 48Q43 47 46 47',
    ) + solid(
      'M48 22C64 22 64 46 48 46C32 46 32 22 48 22Z',
      'M49 22C60 31 53 42 46 46C65 47 65 23 49 22Z',
      'M43 26Q36 31 40 38',
    ) + base(50),
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" fill="none" stroke-linecap="round" stroke-linejoin="round">${drawings[piece]()}</svg>\n`
}

for (const color of ['w', 'b']) {
  for (const piece of ['K', 'Q', 'R', 'B', 'N', 'P']) {
    fs.writeFileSync(path.join(directory, `${color}${piece}.svg`), draw(color, piece))
  }
}
