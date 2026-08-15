const byId = (id) => document.getElementById(id);

const tracker = {
  ownerName: "",
  items: [],
  unimportantSaleEstimate: null
};

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value || 0);
}

function parsePriceFromText(text) {
  if (!text) return null;
  const match = text.match(/\$?\s?(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/);
  if (!match) return null;
  const parsed = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

async function searchEstimatedPrice(itemName) {
  const query = encodeURIComponent(`${itemName} price`);
  const ddgUrl = `https://api.duckduckgo.com/?q=${query}&format=json&no_redirect=1&no_html=1`;
  let response;
  try {
    response = await fetch(ddgUrl);
  } catch {
    response = null;
  }
  if ((!response || !response.ok) && byId("allow-proxy-search")?.checked) {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(ddgUrl)}`;
    try {
      response = await fetch(proxyUrl);
    } catch {
      response = null;
    }
  }
  if (!response || !response.ok) throw new Error("Search unavailable");
  const data = await response.json();
  const textCandidates = [
    data.AbstractText,
    data.Answer,
    data.Heading,
    ...(data.RelatedTopics || []).map((entry) => entry?.Text || "")
  ];
  for (const text of textCandidates) {
    const parsed = parsePriceFromText(text);
    if (parsed !== null) return parsed;
  }
  throw new Error("No web price estimate found");
}

function tokenizeExpression(expression) {
  const tokens = [];
  const regex = /\s*([A-Za-z]+|\d+(?:\.\d+)?|[()+\-*/^,])\s*/g;
  let match;
  let lastIndex = 0;
  while ((match = regex.exec(expression)) !== null) {
    if (match.index !== lastIndex) {
      throw new Error("Invalid token");
    }
    tokens.push(match[1]);
    lastIndex = regex.lastIndex;
  }
  if (lastIndex !== expression.length) {
    throw new Error("Invalid expression");
  }
  return tokens;
}

function evaluateMathExpression(expression, xValue = 0) {
  const operators = {
    "+": { precedence: 2, assoc: "left" },
    "-": { precedence: 2, assoc: "left" },
    "*": { precedence: 3, assoc: "left" },
    "/": { precedence: 3, assoc: "left" },
    "^": { precedence: 4, assoc: "right" }
  };
  const functions = {
    sin: Math.sin,
    cos: Math.cos,
    tan: Math.tan,
    abs: Math.abs,
    sqrt: Math.sqrt,
    log: Math.log,
    exp: Math.exp,
    floor: Math.floor,
    ceil: Math.ceil,
    round: Math.round
  };
  const constants = { pi: Math.PI, e: Math.E };
  const tokens = tokenizeExpression(expression);
  const normalizedTokens = [];

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    const prev = normalizedTokens[normalizedTokens.length - 1];
    const isUnaryMinus =
      token === "-" &&
      (i === 0 || prev === "(" || prev === "," || operators[prev]);
    if (isUnaryMinus) {
      normalizedTokens.push("0");
      normalizedTokens.push("-");
    } else {
      normalizedTokens.push(token);
    }
  }

  const output = [];
  const stack = [];
  for (const rawToken of normalizedTokens) {
    const token = rawToken.toLowerCase();
    if (/^\d+(\.\d+)?$/.test(token)) {
      output.push(Number(token));
      continue;
    }
    if (token === "x") {
      output.push(Number(xValue));
      continue;
    }
    if (constants[token] !== undefined) {
      output.push(constants[token]);
      continue;
    }
    if (functions[token]) {
      stack.push(token);
      continue;
    }
    if (operators[token]) {
      while (stack.length) {
        const top = stack[stack.length - 1];
        if (!operators[top]) break;
        const topOp = operators[top];
        const currOp = operators[token];
        const shouldPop =
          currOp.assoc === "left"
            ? currOp.precedence <= topOp.precedence
            : currOp.precedence < topOp.precedence;
        if (!shouldPop) break;
        output.push(stack.pop());
      }
      stack.push(token);
      continue;
    }
    if (token === "(") {
      stack.push(token);
      continue;
    }
    if (token === ")") {
      while (stack.length && stack[stack.length - 1] !== "(") {
        output.push(stack.pop());
      }
      if (!stack.length) throw new Error("Mismatched parentheses");
      stack.pop();
      if (stack.length && functions[stack[stack.length - 1]]) {
        output.push(stack.pop());
      }
      continue;
    }
    if (token === ",") {
      while (stack.length && stack[stack.length - 1] !== "(") {
        output.push(stack.pop());
      }
      continue;
    }
    throw new Error("Unsupported expression");
  }

  while (stack.length) {
    const token = stack.pop();
    if (token === "(" || token === ")") throw new Error("Mismatched parentheses");
    output.push(token);
  }

  const valueStack = [];
  for (const token of output) {
    if (typeof token === "number") {
      valueStack.push(token);
    } else if (operators[token]) {
      const b = valueStack.pop();
      const a = valueStack.pop();
      if (!Number.isFinite(a) || !Number.isFinite(b)) throw new Error("Invalid operands");
      switch (token) {
        case "+":
          valueStack.push(a + b);
          break;
        case "-":
          valueStack.push(a - b);
          break;
        case "*":
          valueStack.push(a * b);
          break;
        case "/":
          valueStack.push(a / b);
          break;
        case "^":
          valueStack.push(a ** b);
          break;
        default:
          throw new Error("Unsupported operator");
      }
    } else if (functions[token]) {
      const a = valueStack.pop();
      if (!Number.isFinite(a)) throw new Error("Invalid function operand");
      valueStack.push(functions[token](a));
    } else {
      throw new Error("Invalid expression");
    }
  }
  if (valueStack.length !== 1) return null;
  return valueStack[0];
}

function setActiveTab(tabName) {
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabName);
  });
  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === tabName);
  });
}

function setTrackerStep(stepId) {
  document.querySelectorAll(".tracker-step").forEach((step) => {
    step.classList.toggle("active", step.id === stepId);
  });
}

function renderItems() {
  const list = byId("item-list");
  list.innerHTML = "";
  tracker.items.forEach((item, index) => {
    const li = document.createElement("li");
    li.textContent = `${index + 1}. ${item.name} | ${item.condition} | buy ${formatCurrency(item.buyPrice)} | value ${formatCurrency(item.value)} | ${item.important ? "Important" : "Unimportant"}`;
    list.appendChild(li);
  });
}

function getSummaryStats() {
  const totalCount = tracker.items.length;
  const totalValue = tracker.items.reduce((sum, item) => sum + item.value, 0);
  const importantItems = tracker.items.filter((item) => item.important);
  const unimportantItems = tracker.items.filter((item) => !item.important);
  const importantValue = importantItems.reduce((sum, item) => sum + item.value, 0);
  const unimportantValue = unimportantItems.reduce((sum, item) => sum + item.value, 0);

  return {
    totalCount,
    totalValue,
    importantCount: importantItems.length,
    unimportantCount: unimportantItems.length,
    importantValue,
    unimportantValue
  };
}

function renderSummary() {
  const summary = byId("summary-content");
  const stats = getSummaryStats();
  if (tracker.unimportantSaleEstimate === null) {
    tracker.unimportantSaleEstimate = stats.unimportantValue;
  }
  summary.innerHTML = `
    <p><strong>Total possessions:</strong> ${stats.totalCount} (${formatCurrency(stats.totalValue)})</p>
    <p><strong>Important:</strong> ${stats.importantCount} (${formatCurrency(stats.importantValue)})</p>
    <p><strong>Unimportant:</strong> ${stats.unimportantCount} (${formatCurrency(stats.unimportantValue)})</p>
    <p><strong>Estimated sale value of unimportant possessions:</strong> ${formatCurrency(tracker.unimportantSaleEstimate)}</p>
    <table>
      <thead>
        <tr><th>Possession</th><th>Condition</th><th>Value (USD)</th></tr>
      </thead>
      <tbody>
        ${tracker.items.map((item) => `<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.condition)}</td><td>${item.value.toFixed(2)}</td></tr>`).join("")}
      </tbody>
    </table>
  `;
}

async function refreshUnimportantEstimate() {
  const message = byId("tracker-message");
  const unimportantItems = tracker.items.filter((item) => !item.important);
  if (!unimportantItems.length) {
    tracker.unimportantSaleEstimate = 0;
    message.textContent = "No unimportant possessions to estimate.";
    renderSummary();
    return;
  }

  message.textContent = "Refreshing unimportant sale estimate...";
  let total = 0;
  for (const item of unimportantItems) {
    try {
      const estimate = await searchEstimatedPrice(item.name);
      total += estimate;
    } catch {
      total += item.value;
    }
  }
  tracker.unimportantSaleEstimate = total;
  message.textContent = "Unimportant sale estimate updated.";
  renderSummary();
}

function downloadCsv() {
  const rows = [
    ["Possession", "Condition", "Value (USD)"],
    ...tracker.items.map((item) => [item.name, item.condition, item.value.toFixed(2)])
  ];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, "\"\"")}"`).join(",")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${tracker.ownerName || "si"}-possessions.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function exportSummaryPdf() {
  const stats = getSummaryStats();
  const estimateValue = tracker.unimportantSaleEstimate === null ? stats.unimportantValue : tracker.unimportantSaleEstimate;
  const safeOwnerName = escapeHtml(tracker.ownerName || "User");
  const summaryRows = tracker.items
    .map((item) => `<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.condition)}</td><td>${item.value.toFixed(2)}</td></tr>`)
    .join("");

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.title = "SIPT Summary";
  const style = win.document.createElement("style");
  style.textContent = `
    body { font-family: Arial, sans-serif; color: #10223d; padding: 20px; }
    h1 { border-bottom: 2px solid #10223d; padding-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { border: 1px solid #8ea8d9; padding: 8px; text-align: left; }
    th { background: #e9eff9; }
  `;
  win.document.head.appendChild(style);

  const container = win.document.createElement("div");
  container.innerHTML = `
    <h1>SI Possession Tracker Summary - ${safeOwnerName}</h1>
    <p>Total possessions: ${stats.totalCount} (${formatCurrency(stats.totalValue)})</p>
    <p>Important possessions: ${stats.importantCount} (${formatCurrency(stats.importantValue)})</p>
    <p>Unimportant possessions: ${stats.unimportantCount} (${formatCurrency(stats.unimportantValue)})</p>
    <p>Estimated sale value of unimportant possessions: ${formatCurrency(estimateValue)}</p>
    <table>
      <thead><tr><th>Possession</th><th>Condition</th><th>Value (USD)</th></tr></thead>
      <tbody>${summaryRows}</tbody>
    </table>
  `;
  win.document.body.innerHTML = "";
  win.document.body.appendChild(container);
  window.setTimeout(() => {
    win.focus();
    win.print();
  }, 250);
}

document.querySelectorAll(".tab-button").forEach((button) => {
  button.addEventListener("click", () => setActiveTab(button.dataset.tab));
});

byId("calc-evaluate").addEventListener("click", () => {
  const expression = byId("calc-expression").value.trim();
  const resultNode = byId("calc-result");
  if (!expression) {
    resultNode.textContent = "Enter an expression.";
    return;
  }
  try {
    const result = evaluateMathExpression(expression, 0);
    resultNode.textContent = result === null || Number.isNaN(result) ? "Invalid numeric result." : `Result: ${result}`;
  } catch {
    resultNode.textContent = "Invalid expression.";
  }
});

byId("graph-draw").addEventListener("click", () => {
  const expression = byId("graph-expression").value.trim();
  const canvas = byId("graph-canvas");
  const context = canvas.getContext("2d");
  const { width, height } = canvas;
  const centerX = width / 2;
  const centerY = height / 2;
  const scaleX = 24;
  const scaleY = 24;

  context.clearRect(0, 0, width, height);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.strokeStyle = "#9ab0db";
  context.beginPath();
  context.moveTo(0, centerY);
  context.lineTo(width, centerY);
  context.moveTo(centerX, 0);
  context.lineTo(centerX, height);
  context.stroke();

  context.strokeStyle = "#10223d";
  context.beginPath();
  let started = false;
  for (let px = 0; px <= width; px += 1) {
    const x = (px - centerX) / scaleX;
    let y = null;
    try {
      y = evaluateMathExpression(expression, x);
    } catch {
      y = null;
    }
    if (y === null || !Number.isFinite(y)) {
      started = false;
      continue;
    }
    const py = centerY - (y * scaleY);
    if (!started) {
      context.moveTo(px, py);
      started = true;
    } else {
      context.lineTo(px, py);
    }
  }
  context.stroke();
});

byId("start-tracker").addEventListener("click", () => {
  const name = byId("owner-name").value.trim();
  if (!name) return;
  tracker.ownerName = name;
  byId("summary-title").textContent = `${name}'s SI Possession Tracker Summary`;
  byId("tracker-message").textContent = "";
  setTrackerStep("tracker-step-possessions");
});

byId("autofill-value").addEventListener("click", async () => {
  const itemName = byId("item-name").value.trim();
  const message = byId("tracker-message");
  if (!itemName) {
    message.textContent = "Enter an item first.";
    return;
  }
  message.textContent = "Searching for estimated price...";
  try {
    const estimate = await searchEstimatedPrice(itemName);
    byId("item-value").value = estimate.toFixed(2);
    message.textContent = `Estimated value set to ${formatCurrency(estimate)}.`;
  } catch {
    message.textContent = "Could not auto-estimate from web search. Enter value manually.";
  }
});

byId("add-item").addEventListener("click", () => {
  const name = byId("item-name").value.trim();
  const condition = byId("item-condition").value.trim();
  const buyPrice = Number(byId("item-buy-price").value || 0);
  const value = Number(byId("item-value").value || 0);
  const important = byId("item-important").checked;
  const message = byId("tracker-message");

  if (!name || !condition) {
    message.textContent = "Item and condition are required.";
    return;
  }
  if (buyPrice < 0 || value < 0 || !Number.isFinite(buyPrice) || !Number.isFinite(value)) {
    message.textContent = "Enter valid non-negative prices.";
    return;
  }

  tracker.items.push({ name, condition, buyPrice, value, important });
  tracker.unimportantSaleEstimate = null;
  renderItems();

  byId("item-name").value = "";
  byId("item-condition").value = "";
  byId("item-buy-price").value = "";
  byId("item-value").value = "";
  byId("item-important").checked = false;
  message.textContent = "Possession added.";
});

byId("finish-items").addEventListener("click", () => {
  const message = byId("tracker-message");
  if (!tracker.items.length) {
    message.textContent = "Add at least one possession.";
    return;
  }
  tracker.unimportantSaleEstimate = null;
  renderSummary();
  setTrackerStep("tracker-step-summary");
});

byId("refresh-unimportant-estimate").addEventListener("click", refreshUnimportantEstimate);
byId("download-csv").addEventListener("click", downloadCsv);
byId("export-pdf").addEventListener("click", exportSummaryPdf);
byId("add-more").addEventListener("click", () => setTrackerStep("tracker-step-possessions"));
