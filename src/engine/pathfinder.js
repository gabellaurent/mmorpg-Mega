export class Pathfinder {
  // Algoritmo BFS (Breadth-First Search) para busca do menor caminho no grid 2D
  static findPath(startX, startY, targetX, targetY, isWalkableFn, maxDepth = 100) {
    if (startX === targetX && startY === targetY) return [];

    // Se o destino final não for caminhável, procurar um vizinho caminhável mais próximo
    let finalTargetX = targetX;
    let finalTargetY = targetY;

    if (!isWalkableFn(targetX, targetY)) {
      const neighbors = [
        { x: targetX, y: targetY - 1 },
        { x: targetX, y: targetY + 1 },
        { x: targetX - 1, y: targetY },
        { x: targetX + 1, y: targetY }
      ];
      const validNeighbor = neighbors.find(n => isWalkableFn(n.x, n.y));
      if (!validNeighbor) return [];
      finalTargetX = validNeighbor.x;
      finalTargetY = validNeighbor.y;
    }

    const queue = [{ x: startX, y: startY, path: [] }];
    const visited = new Set();
    visited.add(`${startX},${startY}`);

    const directions = [
      { x: 0, y: -1 }, // north
      { x: 0, y: 1 },  // south
      { x: -1, y: 0 }, // west
      { x: 1, y: 0 }   // east
    ];

    let depth = 0;

    while (queue.length > 0 && depth < maxDepth) {
      depth++;
      const current = queue.shift();

      if (current.x === finalTargetX && current.y === finalTargetY) {
        return current.path;
      }

      for (const dir of directions) {
        const nx = current.x + dir.x;
        const ny = current.y + dir.y;
        const key = `${nx},${ny}`;

        if (!visited.has(key) && isWalkableFn(nx, ny)) {
          visited.add(key);
          queue.push({
            x: nx,
            y: ny,
            path: [...current.path, { x: nx, y: ny }]
          });
        }
      }
    }

    return []; // Nenhum caminho encontrado
  }

  // Determina a direção ('north', 'south', 'east', 'west') entre duas quadrículas adjacentes
  static getDirectionBetween(fromX, fromY, toX, toY) {
    const dx = toX - fromX;
    const dy = toY - fromY;

    if (dy < 0) return 'north';
    if (dy > 0) return 'south';
    if (dx < 0) return 'west';
    if (dx > 0) return 'east';
    return 'south';
  }
}
