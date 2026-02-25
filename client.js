const term = new Terminal({
  cursorBlink: true,
  fontSize: 16,
  fontFamily: 'JetBrains Mono',
  fontWeight: '500',
  // the below two prevent random spacing, important
  convertEol: true,
  tabStopWidth: 2,
  //
  theme: {
    background: "rgba(0, 0, 0, 0)",
    black: "#000000",
    red: "#ff3b3b",
    green: "#00d84a",
    yellow: "#fadf2f",
    blue: "#3b82ff",
    magenta: "#ff2fd6",
    cyan: "#00e5ff",
    white: "#e6e6e6",
  },
  allowTransparency: true
});

let inputBuffer = "";

document.addEventListener("DOMContentLoaded", async () => {
  await document.fonts.load("16px 'JetBrains Mono'");
  await document.fonts.ready;

  const fit = new FitAddon.FitAddon();
  term.loadAddon(fit);
  term.open(document.getElementById("terminal"));

  setTimeout(() => {
    fit.fit();
    term.focus();
  }, 100);

  window.addEventListener("resize", () => {
    setTimeout(() => fit.fit(), 50);
  });

  document.getElementById("terminal").style.height = "97%";

  const playerHpBar = document.getElementById("playerHpBar");
  const enemyHpBar = document.getElementById("enemyHpBar");
  const playerParent = playerHpBar.parentElement;
  const enemyParent = enemyHpBar.parentElement;

  playerParent.dataset.inactive = "true";
  enemyParent.dataset.inactive = "true";

  playerHpBar.style.width = "100%";
  playerParent.dataset.label = "YOUR HP";

  enemyHpBar.style.width = "100%";
  enemyParent.dataset.label = "ENEMY HP";

  const expBar = document.getElementById("expBar");
  const expBarParent = expBar.parentElement;

  expBar.style.width = `0%`;
  expBarParent.dataset.label = "YOUR EXP";
});

const socket = new WebSocket("wss://forlorn.snxhit.me/ws");

socket.onopen = () => {
  term.writeln("Connected to Forlorn server!");
};

socket.onclose = () => {
  term.writeln("\r\nDisconnected from server.");
};

window.addEventListener("beforeunload", () => {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send("quit\n");
  }
});

socket.onmessage = (ev) => {
  let text = typeof ev.data === "string" ? ev.data : new TextDecoder().decode(ev.data);

  if (text[0] === "{") {
    try {
      const state = JSON.parse(text);
      handleUIMessage(state);
      return;
    } catch {}
  }

  term.write(text);
};

term.onData(data => {
  const code = data.charCodeAt(0);

  if (code == 13) {
    term.write("\r\n");
    if (socket.readyState == WebSocket.OPEN) socket.send(inputBuffer + "\n");
    inputBuffer = "";
    return;
  }

  if (code == 127) {
    if (inputBuffer.length > 0) {
      inputBuffer = inputBuffer.slice(0, -1);
      term.write("\b \b");
    }
    return;
  }

  inputBuffer += data;
  term.write(data);
});

function handleUIMessage(state) {
  if (state.type === "exits") {
    const dirs = ["north","south","east","west"];
    for (const d of dirs) document.getElementById(d+"Exit").style.backgroundColor = "#000000";

    const list = state.data.split(" ").slice(0,4);
    for (const dir of list) {
      const x = dir.split(":");
      if (parseInt(x[1]) != -1)
        document.getElementById(x[0]+"Exit").style.backgroundColor = "#454545";
    }
  }
  else if (state.type === "combat") {
    const tokens = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < state.data.length; i++) {
      if (state.data[i] === '"') { inQuotes = !inQuotes; continue; }
      if (state.data[i] === " " && !inQuotes) { tokens.push(current); current = ""; }
      else current += state.data[i];
    }
    if (current) tokens.push(current);

    const playerHpBar = document.getElementById("playerHpBar");
    const enemyHpBar = document.getElementById("enemyHpBar");
    const playerParent = playerHpBar.parentElement;
    const enemyParent = enemyHpBar.parentElement;

    const hp = parseInt(tokens[1].split(":")[1]);
    const maxHp = parseInt(tokens[2].split(":")[1]);
    const enemyHp = parseInt(tokens[4].split(":")[1]);
    const enemyMaxHp = parseInt(tokens[5].split(":")[1]);

    if (enemyHp == 0 && enemyMaxHp == 0) {
      playerParent.dataset.inactive = "true";
      enemyParent.dataset.inactive = "true";

      playerHpBar.style.width = "100%";
      playerParent.dataset.label = "YOUR HP";

      enemyHpBar.style.width = "100%";
      enemyParent.dataset.label = "ENEMY HP";
      return;
    } else {
      playerParent.dataset.inactive = "false";
      enemyParent.dataset.inactive = "false";
    }

    const pWidth = maxHp > 0 ? Math.max(0, (hp / maxHp) * 100) : 0;
    const eWidth = enemyMaxHp > 0 ? Math.max(0, (enemyHp / enemyMaxHp) * 100) : 0;

    playerHpBar.style.width = pWidth + "%";
    playerParent.dataset.label = hp + " / " + maxHp;

    enemyHpBar.style.width = eWidth + "%";
    enemyParent.dataset.label = enemyHp + " / " + enemyMaxHp;
  }
  else if (state.type === "exp") {
    const tokens = state.data.split(" ");
    const exp = parseInt(tokens[0].split(":")[1]);
    const expBar = document.getElementById("expBar");
    const expBarParent = expBar.parentElement;

    expBar.style.width = `${exp % 100}%`;
    expBarParent.dataset.label = "YOUR EXP";

    document.getElementById("levelValue").textContent = tokens[1].split(":")[1];
    document.getElementById("trainsValue").textContent = tokens[2].split(":")[1];
  } else if (state.type === "selfdata") {
    const tokens = state.data.split(" ");
    document.getElementById("coinsValue").textContent = tokens[0].split(":")[1];
  }
}

