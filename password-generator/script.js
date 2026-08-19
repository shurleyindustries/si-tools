const lengthInput = document.getElementById('password-length');
const lengthNumber = document.getElementById('password-length-number');
const uppercaseCheckbox = document.getElementById('include-uppercase');
const numbersCheckbox = document.getElementById('include-numbers');
const symbolsCheckbox = document.getElementById('include-symbols');
const output = document.getElementById('password-output');
const status = document.getElementById('password-status');

const lowercase = 'abcdefghijklmnopqrstuvwxyz';
const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const numbers = '0123456789';
const symbols = '!@#$%^&*()-_=+[]{};:,.<>/?';

function setLength(value) {
  const safeValue = Math.min(64, Math.max(6, Number(value) || 6));
  lengthInput.value = String(safeValue);
  lengthNumber.value = String(safeValue);
}

lengthInput.addEventListener('input', (event) => setLength(event.target.value));
lengthNumber.addEventListener('input', (event) => setLength(event.target.value));

function getRandomIndex(max) {
  const array = new Uint32Array(1);
  window.crypto.getRandomValues(array);
  return array[0] % max;
}

function generatePassword() {
  const length = Number(lengthInput.value);
  const charPool = [lowercase];

  if (uppercaseCheckbox.checked) {
    charPool.push(uppercase);
  }

  if (numbersCheckbox.checked) {
    charPool.push(numbers);
  }

  if (symbolsCheckbox.checked) {
    charPool.push(symbols);
  }

  if (charPool.length === 0) {
    charPool.push(lowercase);
  }

  const pool = charPool.join('');
  let password = '';

  for (let index = 0; index < length; index += 1) {
    password += pool[getRandomIndex(pool.length)];
  }

  output.value = password;
  status.textContent = 'Password generated successfully.';
}

async function copyPassword() {
  const textToCopy = output.value.trim();

  if (!textToCopy) {
    status.textContent = 'Generate a password before copying.';
    return;
  }

  try {
    await navigator.clipboard.writeText(textToCopy);
    status.textContent = 'Copied to clipboard.';
  } catch (error) {
    status.textContent = 'Copy failed. You can still select and copy manually.';
  }
}

document.getElementById('generate-password').addEventListener('click', generatePassword);
document.getElementById('copy-password').addEventListener('click', copyPassword);

setLength(16);
generatePassword();
