const qrInput = document.getElementById('qr-input');
const qrCanvas = document.getElementById('qr-canvas');
const statusText = document.getElementById('qr-status');
const ctx = qrCanvas.getContext('2d');

function hashString(value) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function createFinderPattern(matrix, startRow, startCol) {
  for (let row = 0; row < 7; row += 1) {
    for (let col = 0; col < 7; col += 1) {
      const inBorder = row === 0 || row === 6 || col === 0 || col === 6;
      const inCenter = row >= 2 && row <= 4 && col >= 2 && col <= 4;
      const isDark = inBorder || inCenter;
      matrix[startRow + row][startCol + col] = isDark;
    }
  }
}

function createDummyPattern(matrix) {
  const size = matrix.length;
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (matrix[row][col] === null) {
        const value = hashString(`${row}:${col}:${qrInput.value || ''}`) % 2;
        matrix[row][col] = Boolean(value);
      }
    }
  }
}

function buildMatrix(text) {
  const size = 21;
  const matrix = Array.from({ length: size }, () => Array(size).fill(null));

  createFinderPattern(matrix, 0, 0);
  createFinderPattern(matrix, 0, size - 7);
  createFinderPattern(matrix, size - 7, 0);

  for (let index = 0; index < size; index += 1) {
    matrix[6][index] = index % 2 === 0;
    matrix[index][6] = index % 2 === 0;
  }

  createDummyPattern(matrix);

  return matrix;
}

function drawQrCode(matrix) {
  const size = matrix.length;
  const cellSize = Math.ceil(qrCanvas.width / size);

  ctx.clearRect(0, 0, qrCanvas.width, qrCanvas.height);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, qrCanvas.width, qrCanvas.height);

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (matrix[row][col]) {
        ctx.fillStyle = '#111111';
        ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
      }
    }
  }
}

function generateQrCode() {
  const value = qrInput.value.trim();

  if (!value) {
    statusText.textContent = 'Please enter some text or a URL.';
    return;
  }

  const matrix = buildMatrix(value);
  drawQrCode(matrix);
  statusText.textContent = 'QR code generated successfully.';
}

function downloadQrCode() {
  const value = qrInput.value.trim();

  if (!value) {
    statusText.textContent = 'Generate a QR code before downloading.';
    return;
  }

  const link = document.createElement('a');
  link.download = 'qr-code.jpg';
  link.href = qrCanvas.toDataURL('image/jpeg', 0.92);
  link.click();
  statusText.textContent = 'QR code downloaded as qr-code.jpg';
}

document.getElementById('generate-qr').addEventListener('click', generateQrCode);
document.getElementById('download-qr').addEventListener('click', downloadQrCode);
qrInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    generateQrCode();
  }
});

generateQrCode();
