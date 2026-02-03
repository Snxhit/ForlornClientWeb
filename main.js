const term = new Terminal({
  cursorBlink: true,
  fontSize: 14,
  // the below two prevent random spacing, important
  convertEol: true,
  tabStopWidth: 1,
  theme: {
    background: "#000000"
  }
});

let inputBuffer = "";

term.open(document.getElementById("terminal"));
term.focus();

const socket = new WebSocket("wss://forlorn.snxhit.me/ws");
socket.binaryType = "arraybuffer";

socket.onopen = () => {
  term.writeln("Connected to Forlorn server!");
};

//BUG: doesnt work for all rooms
const decoder = new TextDecoder();

socket.onmessage = (ev) => {
  let text;

  if (ev.data instanceof ArrayBuffer) {
    text = decoder.decode(ev.data);
  } else {
    text = ev.data;
  }

  if (text.startsWith("{")) {
    try {
      const state = JSON.parse(text);
      if (state.type === "state") {
        handleUIMessage(state);
        return;
      }
    } catch {
    }
  }

  if (text.startsWith("STATE ")) {
    handleUIMessage({
      type: "state",
      data: text.slice(6)
    });
    return;
  }

  term.write(text);
};

term.onData(data => {
  const code = data.charCodeAt(0);

  // code 13 is Enter
  if (code == 13) {
    term.write("\r\n");

    if (socket.readyState == WebSocket.OPEN) {
      socket.send(inputBuffer + "\n");
    }

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
  console.log(state)
}
