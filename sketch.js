function make2DArray(cols, rows) {
  let arr = new Array(cols);
  for (let i = 0; i < arr.length; i++) {
    arr[i] = new Array(rows);
  }
  return arr;
}

let grid;
let cols;
let rows;
let resolution = 20;

function setup() {
  createCanvas(600, 600);
  cols = width / resolution;
  rows = height / resolution;

  grid = make2DArray(cols,rows)
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      grid[i][j] = floor(random(2));
    }
  }
}

function draw() {
  background(0);
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      let x = i * resolution;
      let y = j * resolution;
      if (grid[i][j] == 1) {
        fill(255);
        stroke(225);
        rect(x, y, resolution - 1, resolution - 1);
      } else {
        fill(150, 0, 0);
        stroke(225);
        rect(x, y, resolution - 1, resolution - 1);
      }
    }
  }
}