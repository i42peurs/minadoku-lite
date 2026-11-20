// ============================================================================
// ACADEMIA / TUTORIAL PROGRESIVO
// 4 niveles guiados paso a paso explicando patrones esenciales (ceros, líneas
// llenas, esquinas contra tope, restas) + 2 niveles muy fáciles SIN guía.
// ============================================================================

import { computeNeighborMines } from './generator';
import type { AcademyLesson, GridSize, PuzzleBoard } from './types';

function buildCuratedBoard(
  id: string,
  label: string,
  minePattern: string[], // '#' = mina, '.' = segura
  revealCoords: [number, number][]
): PuzzleBoard {
  const size = minePattern.length as GridSize;
  const solution: boolean[][] = minePattern.map((row) =>
    row.split('').map((ch) => ch === '#')
  );
  const rowClues = solution.map((row) => row.filter(Boolean).length);
  const colClues = Array.from({ length: size }, (_, c) => {
    let sum = 0;
    for (let r = 0; r < size; r++) if (solution[r][c]) sum++;
    return sum;
  });
  const revealedHints: (number | null)[][] = Array.from({ length: size }, () =>
    Array<number | null>(size).fill(null)
  );

  for (const [r, c] of revealCoords) {
    if (!solution[r][c]) {
      revealedHints[r][c] = computeNeighborMines(solution, r, c, size);
    }
  }

  return {
    id,
    size,
    rowClues,
    colClues,
    revealedHints,
    solution,
    totalMines: rowClues.reduce((a, b) => a + b, 0),
    label,
  };
}

export const ACADEMY_LESSONS: AcademyLesson[] = [
  {
    id: 'acad-1-zeros',
    index: 1,
    title: '1. La regla del cero',
    patternTag: 'Guiado · Ceros',
    guided: true,
    introText:
      'Un 0 exterior significa que toda esa fila o columna no tiene minas. Un 0 interior despeja automáticamente sus 8 casillas vecinas.',
    steps: [
      'Marca con X toda la fila 1 (su pista exterior es 0) y la columna 1 (también es 0).',
      'Observa el 0 interior en (F4, C2): ninguna de sus 8 vecinas puede tener mina.',
      'Con esas X colocadas, los huecos libres que quedan en las filas 2, 4 y 5 encajan exactos con las 4 minas.',
    ],
    puzzle: buildCuratedBoard(
      'acad-1-zeros',
      'Academia 1 · Regla del cero',
      ['.....', '..##.', '.....', '...#.', '....#'],
      [
        [1, 1],
        [3, 1], // 0 interior
        [2, 2],
        [4, 2],
        [3, 4],
      ]
    ),
  },
  {
    id: 'acad-2-full-lines',
    index: 2,
    title: '2. Líneas llenas y conteo exacto',
    patternTag: 'Guiado · Líneas llenas',
    guided: true,
    introText:
      'Cuando las minas que faltan en una fila o columna coinciden con el número de huecos sin marcar, todos esos huecos son minas seguras.',
    steps: [
      'La fila 3 exige 4 minas y su casilla central ya es un número seguro: ¡las 4 casillas ocultas de la fila 3 son Bandera!',
      'Después tacha con X las columnas 2 y 4 (ya tienen 1 de 1) y la fila 2 y 4 (su pista exterior es 0).',
      'Usa las pistas de las columnas 1, 3 y 5 para colocar las últimas 3 banderas.',
    ],
    puzzle: buildCuratedBoard(
      'acad-2-full-lines',
      'Academia 2 · Líneas llenas',
      ['#...#', '.....', '##.##', '.....', '..#..'],
      [
        [0, 2],
        [1, 1],
        [1, 3],
        [2, 2],
        [3, 2],
        [4, 0],
        [4, 4],
      ]
    ),
  },
  {
    id: 'acad-3-corners',
    index: 3,
    title: '3. Esquinas contra tope',
    patternTag: 'Guiado · Esquinas',
    guided: true,
    introText:
      'Las casillas en esquinas y bordes tienen menos vecinas. Un 3 en una esquina solo toca 3 casillas: ¡todas ellas son minas!',
    steps: [
      'El 3 de la esquina superior izquierda (F1, C1) solo tiene 3 vecinas adyacentes: pon Bandera en las tres.',
      'Con eso la fila 2 (2 minas) y la fila 1 (1 mina) quedan completas: tacha el resto con X.',
      'Usa el 0 de la esquina inferior izquierda (F5, C1) y las columnas 4 y 5 para terminar.',
    ],
    puzzle: buildCuratedBoard(
      'acad-3-corners',
      'Academia 3 · Esquinas contra tope',
      ['.#...', '##...', '...#.', '....#', '...#.'],
      [
        [0, 0], // Esquina con 3
        [0, 3],
        [2, 2],
        [4, 0], // Esquina con 0
        [4, 2],
        [2, 4],
      ]
    ),
  },
  {
    id: 'acad-4-subtraction',
    index: 4,
    title: '4. Restas entre pistas',
    patternTag: 'Guiado · Restas',
    guided: true,
    introText:
      'Si las minas de un grupo pequeño deben estar dentro de otro más grande, puedes restarlas para despejar o forzar las casillas que quedan fuera.',
    steps: [
      'Despeja primero los ceros de la fila 5 y la columna 5.',
      'Compara las pistas interiores del centro con los totales de columna 1 y fila 1 para deducir qué casillas sobran.',
      'Recuerda: puedes usar "?" para anotar dudas sin penalización o pulsar "Pista" (gratis en Academia guiada) para ver el patrón coloreado.',
    ],
    puzzle: buildCuratedBoard(
      'acad-4-subtraction',
      'Academia 4 · Restas lógicas',
      ['#.#..', '.#...', '#..#.', '..#..', '.....'],
      [
        [0, 1],
        [1, 2],
        [2, 1],
        [2, 2],
        [3, 0],
        [3, 3],
        [4, 2],
      ]
    ),
  },
  {
    id: 'acad-5-practice-1',
    index: 5,
    title: '5. Práctica libre I',
    patternTag: 'Sin guía · Muy fácil',
    guided: false,
    introText:
      'Ahora sin guía paso a paso. Aplica ceros, líneas completas y conteo de vecinos en este tablero muy accesible.',
    puzzle: buildCuratedBoard(
      'acad-5-practice-1',
      'Práctica libre I',
      ['..#..', '.#.#.', '.....', '#...#', '..#..'],
      [
        [0, 0],
        [0, 4],
        [1, 2],
        [2, 0],
        [2, 4],
        [3, 2],
        [4, 0],
        [4, 4],
      ]
    ),
  },
  {
    id: 'acad-6-practice-2',
    index: 6,
    title: '6. Práctica libre II',
    patternTag: 'Sin guía · Muy fácil',
    guided: false,
    introText:
      'Segundo y último tablero de práctica libre. Resuélvelo a tu ritmo antes de saltar a Zen, Vidas o el Diario.',
    puzzle: buildCuratedBoard(
      'acad-6-practice-2',
      'Práctica libre II',
      ['##...', '...#.', '.#...', '...##', '.#...'],
      [
        [0, 2],
        [0, 4],
        [1, 1],
        [2, 2],
        [2, 4],
        [3, 0],
        [4, 2],
        [4, 4],
      ]
    ),
  },
];
