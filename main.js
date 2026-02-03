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

socket.onmessage = (ev) => {
  if (typeof ev.data == "string") {
    term.write(ev.data);
  } else {
    const data = new Uint8Array(ev.data);
    term.write(new TextDecoder().decode(data));
  }
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
