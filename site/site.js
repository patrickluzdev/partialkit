const COPY_RESET_MS = 1600;

function dedent(source) {
  const lines = source.replace(/\t/g, "  ").split("\n");
  while (lines.length > 0 && lines[0].trim() === "") lines.shift();
  while (lines.length > 0 && lines[lines.length - 1].trim() === "") lines.pop();

  const indents = lines.filter((line) => line.trim() !== "").map((line) => line.match(/^ */)[0].length);
  const shortest = indents.length > 0 ? Math.min(...indents) : 0;
  return lines.map((line) => line.slice(shortest)).join("\n");
}

function showPanel(example, name) {
  for (const tab of example.querySelectorAll("[data-tab]")) {
    tab.setAttribute("aria-pressed", String(tab.dataset.tab === name));
  }
  for (const panel of example.querySelectorAll("[data-panel]")) {
    panel.hidden = panel.dataset.panel !== name;
  }
}

async function copy(button, text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    document.body.append(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }

  const original = button.textContent;
  button.textContent = "Copied";
  setTimeout(() => {
    button.textContent = original;
  }, COPY_RESET_MS);
}

for (const example of document.querySelectorAll("[data-example]")) {
  const preview = example.querySelector("[data-panel='preview']");
  const code = example.querySelector("[data-panel='code'] code");
  const source = dedent(preview.innerHTML);

  code.textContent = source;
  showPanel(example, "preview");

  for (const tab of example.querySelectorAll("[data-tab]")) {
    tab.addEventListener("click", () => showPanel(example, tab.dataset.tab));
  }

  example.querySelector("[data-copy]")?.addEventListener("click", (event) => {
    copy(event.currentTarget, source);
  });
}

for (const button of document.querySelectorAll("[data-copy-text]")) {
  button.addEventListener("click", (event) => copy(event.currentTarget, button.dataset.copyText));
}
