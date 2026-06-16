const canvas = document.querySelector("#life-canvas");
const ctx = canvas.getContext("2d");

const ui = {
  generation: document.querySelector("#generation-count"),
  live: document.querySelector("#live-count"),
  status: document.querySelector("#status-label"),
  seed: document.querySelector("#seed-select"),
  toggle: document.querySelector("#toggle-run"),
  step: document.querySelector("#step-once"),
  randomize: document.querySelector("#randomize-grid"),
  clear: document.querySelector("#clear-grid"),
  speed: document.querySelector("#speed-slider"),
  speedOutput: document.querySelector("#speed-output"),
  grid: document.querySelector("#grid-slider"),
  gridOutput: document.querySelector("#grid-output"),
};

const patterns = [
  {
    id: "random",
    name: "Random field",
    type: "Stochastic",
  },
  {
    id: "gosper",
    name: "Gosper glider gun",
    type: "Gun",
    rle: "24bo11b$22bobo11b$12b2o6b2o12b2o$11bo3bo4b2o12b2o$2o8bo5bo3b2o14b$2o8bo3bob2o4bobo11b$10bo5bo7bo11b$11bo3bo20b$12b2o!",
  },
  {
    id: "acorn",
    name: "Acorn",
    type: "Methuselah",
    rle: "bo$3bo$2o2b3o!",
  },
  {
    id: "rpentomino",
    name: "R-pentomino",
    type: "Methuselah",
    rle: "b2o$2o$bo!",
  },
  {
    id: "diehard",
    name: "Die hard",
    type: "Methuselah",
    rle: "6bo$2o$bo3b3o!",
  },
  {
    id: "pulsar",
    name: "Pulsar",
    type: "Oscillator",
    rle: "2b3o3b3o$15b$o4bobo4bo$o4bobo4bo$o4bobo4bo$2b3o3b3o$15b$2b3o3b3o$o4bobo4bo$o4bobo4bo$o4bobo4bo$15b$2b3o3b3o!",
  },
  {
    id: "pentadecathlon",
    name: "Pentadecathlon",
    type: "Oscillator",
    rle: "2bo4bo$2ob4ob2o$2bo4bo!",
  },
  {
    id: "lwss",
    name: "Lightweight spaceship",
    type: "Spaceship",
    rle: "bo2bo$o4b$o3bo$4o!",
  },
  {
    id: "glider",
    name: "Glider",
    type: "Spaceship",
    rle: "bo$2bo$3o!",
  },
  {
    id: "beacon",
    name: "Beacon",
    type: "Oscillator",
    rle: "2o2b$2o2b$2b2o$2b2o!",
  },
  {
    id: "toad",
    name: "Toad",
    type: "Oscillator",
    rle: "b3o$3o!",
  },
];

const state = {
  cols: 0,
  rows: 0,
  cellSize: 12,
  gridSize: Number(ui.grid.value),
  generation: 0,
  liveCells: 0,
  running: true,
  speed: Number(ui.speed.value),
  accumulator: 0,
  lastTime: 0,
  drawing: false,
  paintMode: 1,
  patternId: "random",
  cells: [],
  ages: [],
  trails: [],
};

function makeGrid(fill = 0) {
  return Array.from({ length: state.cols }, () =>
    Array.from({ length: state.rows }, () => fill)
  );
}

function setupCanvas() {
  const rect = canvas.parentElement.getBoundingClientRect();
  const cssSize = Math.floor(rect.width);
  const dpr = window.devicePixelRatio || 1;

  canvas.width = Math.floor(cssSize * dpr);
  canvas.height = Math.floor(cssSize * dpr);
  canvas.style.width = `${cssSize}px`;
  canvas.style.height = `${cssSize}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  state.cols = state.gridSize;
  state.rows = state.gridSize;
  state.cellSize = cssSize / state.gridSize;
  canvas.parentElement.style.setProperty("--cell-size", `${state.cellSize}px`);
  loadPattern(state.patternId);
}

function seedRandom() {
  state.cells = makeGrid();
  state.ages = makeGrid();
  state.trails = makeGrid();
  state.generation = 0;

  for (let col = 0; col < state.cols; col += 1) {
    for (let row = 0; row < state.rows; row += 1) {
      const distanceFromCenter =
        Math.hypot(col - state.cols / 2, row - state.rows / 2) /
        Math.hypot(state.cols / 2, state.rows / 2);
      const probability = 0.34 - distanceFromCenter * 0.13;
      state.cells[col][row] = Math.random() < probability ? 1 : 0;
      state.ages[col][row] = state.cells[col][row] ? 1 : 0;
    }
  }

  updateStats();
}

function loadPattern(patternId) {
  state.patternId = patternId;

  if (patternId === "random") {
    seedRandom();
    return;
  }

  const pattern = patterns.find((item) => item.id === patternId);
  if (!pattern) {
    seedRandom();
    return;
  }

  const cells = parseRle(pattern.rle);
  state.cells = makeGrid();
  state.ages = makeGrid();
  state.trails = makeGrid();
  state.generation = 0;
  state.running = false;

  const maxCol = Math.max(...cells.map(([col]) => col));
  const maxRow = Math.max(...cells.map(([, row]) => row));
  const offsetCol = Math.max(0, Math.floor((state.cols - maxCol - 1) / 2));
  const offsetRow = Math.max(0, Math.floor((state.rows - maxRow - 1) / 2));

  cells.forEach(([col, row]) => {
    const targetCol = col + offsetCol;
    const targetRow = row + offsetRow;

    if (targetCol < state.cols && targetRow < state.rows) {
      state.cells[targetCol][targetRow] = 1;
      state.ages[targetCol][targetRow] = 1;
    }
  });

  updateStats();
}

function parseRle(rle) {
  const body = rle.replace(/^x\s*=.*$/gm, "").replace(/\s/g, "");
  const cells = [];
  let col = 0;
  let row = 0;
  let run = "";

  for (const token of body) {
    if (/\d/.test(token)) {
      run += token;
      continue;
    }

    const count = run ? Number(run) : 1;
    run = "";

    if (token === "o") {
      for (let index = 0; index < count; index += 1) {
        cells.push([col + index, row]);
      }
      col += count;
    }

    if (token === "b") {
      col += count;
    }

    if (token === "$") {
      row += count;
      col = 0;
    }

    if (token === "!") {
      break;
    }
  }

  return cells;
}

function clearGrid() {
  state.cells = makeGrid();
  state.ages = makeGrid();
  state.trails = makeGrid();
  state.running = false;
  state.generation = 0;
  updateStats();
}

function step() {
  const next = makeGrid();
  const nextAges = makeGrid();
  const nextTrails = makeGrid();

  for (let col = 0; col < state.cols; col += 1) {
    for (let row = 0; row < state.rows; row += 1) {
      const alive = state.cells[col][row] === 1;
      const neighbors = countNeighbors(col, row);
      const survives = alive && (neighbors === 2 || neighbors === 3);
      const born = !alive && neighbors === 3;
      const nextAlive = survives || born;

      next[col][row] = nextAlive ? 1 : 0;
      nextAges[col][row] = nextAlive ? (born ? 1 : state.ages[col][row] + 1) : 0;
      nextTrails[col][row] = nextAlive
        ? 0
        : Math.max(state.trails[col][row] * 0.72, alive ? 1 : 0);
    }
  }

  state.cells = next;
  state.ages = nextAges;
  state.trails = nextTrails;
  state.generation += 1;
  updateStats();
}

function countNeighbors(originCol, originRow) {
  let total = 0;

  for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
    for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
      if (colOffset === 0 && rowOffset === 0) {
        continue;
      }

      const col = originCol + colOffset;
      const row = originRow + rowOffset;

      if (col >= 0 && col < state.cols && row >= 0 && row < state.rows) {
        total += state.cells[col][row];
      }
    }
  }

  return total;
}

function render() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#060916";
  ctx.fillRect(0, 0, width, height);

  ctx.globalCompositeOperation = "lighter";

  for (let col = 0; col < state.cols; col += 1) {
    for (let row = 0; row < state.rows; row += 1) {
      const x = col * state.cellSize;
      const y = row * state.cellSize;
      const age = state.ages[col][row];
      const trail = state.trails[col][row];

      if (trail > 0.02) {
        ctx.fillStyle = `rgba(75, 243, 255, ${0.2 * trail})`;
        ctx.fillRect(x + 1, y + 1, state.cellSize - 2, state.cellSize - 2);
      }

      if (state.cells[col][row]) {
        const isNew = age <= 2;
        const mature = Math.min(age / 18, 1);
        const pulse = isNew ? 1 : 0.36 + mature * 0.32;

        ctx.shadowBlur = isNew ? 13 : 8;
        ctx.shadowColor = isNew ? "rgba(255, 117, 95, 0.8)" : "rgba(75, 243, 255, 0.5)";
        ctx.fillStyle = isNew
          ? "#ff755f"
          : `rgb(${Math.round(75 + mature * 98)}, ${Math.round(
              243 - mature * 28
            )}, ${Math.round(255 - mature * 8)})`;
        ctx.fillRect(x + 2, y + 2, state.cellSize - 4, state.cellSize - 4);

        ctx.shadowBlur = 0;
        ctx.fillStyle = `rgba(247, 246, 241, ${0.18 * pulse})`;
        ctx.fillRect(x + 4, y + 4, state.cellSize - 8, state.cellSize - 8);

        if (isNew) {
          ctx.strokeStyle = "rgba(255, 117, 95, 0.34)";
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 0.5, y + 0.5, state.cellSize - 1, state.cellSize - 1);
        }
      }
    }
  }

  ctx.shadowBlur = 0;
  ctx.globalCompositeOperation = "source-over";

  const scanlineGap = 18;
  ctx.fillStyle = "rgba(255, 255, 255, 0.025)";
  for (let y = 0; y < height; y += scanlineGap) {
    ctx.fillRect(0, y, width, 1);
  }
}

function loop(timestamp = 0) {
  const delta = timestamp - state.lastTime;
  state.lastTime = timestamp;

  if (state.running) {
    state.accumulator += delta;
    const interval = 1000 / state.speed;

    while (state.accumulator >= interval) {
      step();
      state.accumulator -= interval;
    }
  }

  render();
  requestAnimationFrame(loop);
}

function updateStats() {
  state.liveCells = state.cells.reduce(
    (sum, column) => sum + column.reduce((columnSum, cell) => columnSum + cell, 0),
    0
  );
  ui.generation.textContent = state.generation.toLocaleString();
  ui.live.textContent = state.liveCells.toLocaleString();
  ui.status.textContent = state.running ? "Running" : "Paused";
  ui.toggle.querySelector(".icon").textContent = state.running ? "Ⅱ" : "▶";
  ui.toggle.querySelector(".button-label").textContent = state.running ? "Pause" : "Run";
  ui.speedOutput.value = state.speed;
  ui.gridOutput.value = state.gridSize;
}

function getCellFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  return {
    col: Math.floor(x / state.cellSize),
    row: Math.floor(y / state.cellSize),
  };
}

function paintCell(event) {
  const { col, row } = getCellFromEvent(event);

  if (col < 0 || col >= state.cols || row < 0 || row >= state.rows) {
    return;
  }

  state.cells[col][row] = state.paintMode;
  state.ages[col][row] = state.paintMode ? Math.max(state.ages[col][row], 1) : 0;
  state.trails[col][row] = state.paintMode ? 0 : 1;
  updateStats();
}

ui.toggle.addEventListener("click", () => {
  state.running = !state.running;
  updateStats();
});

ui.step.addEventListener("click", () => {
  state.running = false;
  step();
});

ui.randomize.addEventListener("click", seedRandom);
ui.clear.addEventListener("click", clearGrid);

ui.seed.addEventListener("change", (event) => {
  loadPattern(event.target.value);
});

ui.speed.addEventListener("input", (event) => {
  state.speed = Number(event.target.value);
  updateStats();
});

ui.grid.addEventListener("input", (event) => {
  state.gridSize = Number(event.target.value);
  setupCanvas();
});

canvas.addEventListener("pointerdown", (event) => {
  canvas.setPointerCapture(event.pointerId);
  const { col, row } = getCellFromEvent(event);
  state.paintMode = state.cells[col]?.[row] ? 0 : 1;
  state.drawing = true;
  paintCell(event);
});

canvas.addEventListener("pointermove", (event) => {
  if (state.drawing) {
    paintCell(event);
  }
});

canvas.addEventListener("pointerup", () => {
  state.drawing = false;
});

canvas.addEventListener("pointercancel", () => {
  state.drawing = false;
});

window.addEventListener("resize", setupCanvas);

patterns.forEach((pattern) => {
  const option = document.createElement("option");
  option.value = pattern.id;
  option.textContent = pattern.id === "random" ? pattern.name : `${pattern.name} · ${pattern.type}`;
  ui.seed.append(option);
});

setupCanvas();
requestAnimationFrame(loop);
