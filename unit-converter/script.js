const conversionMap = {
  length: {
    label: 'Length',
    units: {
      meters: { label: 'Meters', toBase: (value) => value, fromBase: (value) => value },
      kilometers: { label: 'Kilometers', toBase: (value) => value * 1000, fromBase: (value) => value / 1000 },
      miles: { label: 'Miles', toBase: (value) => value * 1609.344, fromBase: (value) => value / 1609.344 },
      feet: { label: 'Feet', toBase: (value) => value * 0.3048, fromBase: (value) => value / 0.3048 },
      inches: { label: 'Inches', toBase: (value) => value * 0.0254, fromBase: (value) => value / 0.0254 }
    }
  },
  weight: {
    label: 'Weight',
    units: {
      kilograms: { label: 'Kilograms', toBase: (value) => value, fromBase: (value) => value },
      grams: { label: 'Grams', toBase: (value) => value / 1000, fromBase: (value) => value * 1000 },
      pounds: { label: 'Pounds', toBase: (value) => value * 0.45359237, fromBase: (value) => value / 0.45359237 },
      ounces: { label: 'Ounces', toBase: (value) => value * 0.0283495231, fromBase: (value) => value / 0.0283495231 }
    }
  },
  temperature: {
    label: 'Temperature',
    units: {
      celsius: { label: 'Celsius', toBase: (value) => value, fromBase: (value) => value },
      fahrenheit: { label: 'Fahrenheit', toBase: (value) => (value - 32) * 5 / 9, fromBase: (value) => (value * 9 / 5) + 32 },
      kelvin: { label: 'Kelvin', toBase: (value) => value - 273.15, fromBase: (value) => value + 273.15 }
    }
  },
  pressure: {
    label: 'Pressure',
    units: {
      pascal: { label: 'Pascal', toBase: (value) => value, fromBase: (value) => value },
      kpa: { label: 'kPa', toBase: (value) => value * 1000, fromBase: (value) => value / 1000 },
      bar: { label: 'Bar', toBase: (value) => value * 100000, fromBase: (value) => value / 100000 },
      psi: { label: 'PSI', toBase: (value) => value * 6894.75729, fromBase: (value) => value / 6894.75729 },
      atm: { label: 'Atmosphere', toBase: (value) => value * 101325, fromBase: (value) => value / 101325 }
    }
  },
  energy: {
    label: 'Energy',
    units: {
      joules: { label: 'Joules', toBase: (value) => value, fromBase: (value) => value },
      kilojoules: { label: 'Kilojoules', toBase: (value) => value * 1000, fromBase: (value) => value / 1000 },
      calories: { label: 'Calories', toBase: (value) => value * 4.184, fromBase: (value) => value / 4.184 },
      kilocalories: { label: 'Kilocalories', toBase: (value) => value * 4184, fromBase: (value) => value / 4184 },
      wattHours: { label: 'Watt-hours', toBase: (value) => value * 3600, fromBase: (value) => value / 3600 }
    }
  },
  volume: {
    label: 'Volume',
    units: {
      liters: { label: 'Liters', toBase: (value) => value, fromBase: (value) => value },
      milliliters: { label: 'Milliliters', toBase: (value) => value / 1000, fromBase: (value) => value * 1000 },
      gallons: { label: 'Gallons', toBase: (value) => value * 3.785411784, fromBase: (value) => value / 3.785411784 },
      cups: { label: 'Cups', toBase: (value) => value * 0.2365882365, fromBase: (value) => value / 0.2365882365 }
    }
  },
  torque: {
    label: 'Torque',
    units: {
      newtonMeters: { label: 'Newton-meters', toBase: (value) => value, fromBase: (value) => value },
      poundFeet: { label: 'Pound-feet', toBase: (value) => value * 1.355817948, fromBase: (value) => value / 1.355817948 },
      kilogramMeters: { label: 'Kilogram-meters', toBase: (value) => value * 9.80665, fromBase: (value) => value / 9.80665 },
      ounceInches: { label: 'Ounce-inches', toBase: (value) => value * 0.0070615518, fromBase: (value) => value / 0.0070615518 }
    }
  },
  work: {
    label: 'Work',
    units: {
      joules: { label: 'Joules', toBase: (value) => value, fromBase: (value) => value },
      kilojoules: { label: 'Kilojoules', toBase: (value) => value * 1000, fromBase: (value) => value / 1000 },
      footPounds: { label: 'Foot-pounds', toBase: (value) => value * 1.355817948, fromBase: (value) => value / 1.355817948 },
      calories: { label: 'Calories', toBase: (value) => value * 4.184, fromBase: (value) => value / 4.184 }
    }
  }
};

const categorySelect = document.getElementById('category');
const fromUnitSelect = document.getElementById('from-unit');
const toUnitSelect = document.getElementById('to-unit');
const inputValue = document.getElementById('input-value');
const resultValue = document.getElementById('result-value');

function populateCategories() {
  Object.entries(conversionMap).forEach(([key, config]) => {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = config.label;
    categorySelect.appendChild(option);
  });

  categorySelect.value = 'length';
  populateUnits();
}

function populateUnits() {
  const categoryKey = categorySelect.value;
  const units = Object.entries(conversionMap[categoryKey].units);

  const fromOptions = units.map(([key, config]) => `<option value="${key}">${config.label}</option>`).join('');
  const toOptions = units.map(([key, config]) => `<option value="${key}">${config.label}</option>`).join('');

  fromUnitSelect.innerHTML = fromOptions;
  toUnitSelect.innerHTML = toOptions;

  if (units.length > 1) {
    fromUnitSelect.value = units[0][0];
    toUnitSelect.value = units[1][0];
  }

  updateConversion();
}

function convertValue(value, categoryKey, sourceUnit, targetUnit) {
  const source = conversionMap[categoryKey].units[sourceUnit];
  const target = conversionMap[categoryKey].units[targetUnit];
  const baseValue = source.toBase(value);
  return target.fromBase(baseValue);
}

function updateConversion() {
  const numericValue = Number.parseFloat(inputValue.value);

  if (!Number.isFinite(numericValue)) {
    resultValue.value = 'Enter a valid number';
    return;
  }

  const categoryKey = categorySelect.value;
  const sourceUnit = fromUnitSelect.value;
  const targetUnit = toUnitSelect.value;

  const converted = convertValue(numericValue, categoryKey, sourceUnit, targetUnit);
  resultValue.value = Number.isFinite(converted) ? converted.toLocaleString(undefined, { maximumFractionDigits: 10 }) : 'Invalid conversion';
}

categorySelect.addEventListener('change', populateUnits);
fromUnitSelect.addEventListener('change', updateConversion);
toUnitSelect.addEventListener('change', updateConversion);
inputValue.addEventListener('input', updateConversion);

populateCategories();
