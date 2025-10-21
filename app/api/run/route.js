// app/api/run/route.js
export async function POST(req) {
  try {
    const { action = "run", code = "", input = "", plaintext = "", maxSteps = 1_000_000 } =
      await req.json();

    // --- Phrase mappings ---
    const mapping = [
      ["never gonna give you up", "+"],
      ["never gonna let you down", "-"],
      ["never gonna run around and desert you", ">"],
      ["never gonna make you cry", "<"],
      ["never gonna say goodbye", "."],
      ["never gonna tell a lie and hurt you", ","],
      ["we are no strangers to love", "["],
      ["you know the rules and so do i (do i)", "]"],
    ];

    const phraseToCmd = Object.fromEntries(mapping);
    const bfToPhrase = Object.fromEntries(mapping.map(([p, c]) => [c, p]));

    // Helpers
    const normalize = (s = "") => s.replace(/\r/g, "").toLowerCase();
    const collapseWhitespace = (s = "") => s.replace(/\s+/g, " ").trim();

    // --- Lyrics → Brainfuck ---
    function lyricsToBF(rawCode) {
      const collapsed = collapseWhitespace(normalize(rawCode));
      const sorted = mapping.slice().sort((a, b) => b[0].length - a[0].length);
      let i = 0;
      const out = [];
      while (i < collapsed.length) {
        let matched = false;
        for (const [phrase, cmd] of sorted) {
          if (collapsed.startsWith(phrase, i)) {
            out.push(cmd);
            i += phrase.length;
            if (collapsed[i] === " ") i++;
            matched = true;
            break;
          }
        }
        if (!matched) {
          const nextSpace = collapsed.indexOf(" ", i);
          if (nextSpace === -1) break;
          i = nextSpace + 1;
        }
      }
      return out.join("");
    }

    // --- Reverse: Brainfuck → NGFYU ---
    function bfToLyrics(bf) {
      return bf
        .split("")
        .map((c) => bfToPhrase[c] || "")
        .filter(Boolean)
        .join(" ");
    }

    // --- Plaintext → Brainfuck (prints given text) ---
    function plaintextToBF(text) {
      let current = 0;
      let bf = "";
      for (let i = 0; i < text.length; i++) {
        const target = text.charCodeAt(i) & 255;
        const diff = (target - current + 256) % 256;
        if (diff <= 128) bf += "+".repeat(diff);
        else bf += "-".repeat(256 - diff);
        bf += ".";
        current = target;
      }
      return bf;
    }

    function plaintextToLyrics(text) {
      return bfToLyrics(plaintextToBF(text));
    }

    // --- Brainfuck interpreter ---
    function runBF(bf, input, maxSteps = 1_000_000) {
      const TAPE_SIZE = 30_000;
      const tape = new Uint8Array(TAPE_SIZE);
      let ptr = 0;
      let ip = 0;
      let inputPtr = 0;
      let output = "";
      let steps = 0;

      // Precompute bracket map
      const stack = [];
      const bracketMap = {};
      for (let j = 0; j < bf.length; j++) {
        if (bf[j] === "[") stack.push(j);
        else if (bf[j] === "]") {
          const start = stack.pop();
          if (start !== undefined) {
            bracketMap[start] = j;
            bracketMap[j] = start;
          }
        }
      }

      while (ip < bf.length && steps < maxSteps) {
        steps++;
        const cmd = bf[ip];
        switch (cmd) {
          case ">": ptr = (ptr + 1) % TAPE_SIZE; break;
          case "<": ptr = (ptr - 1 + TAPE_SIZE) % TAPE_SIZE; break;
          case "+": tape[ptr] = (tape[ptr] + 1) & 255; break;
          case "-": tape[ptr] = (tape[ptr] - 1 + 256) & 255; break;
          case ".": output += String.fromCharCode(tape[ptr]); break;
          case ",": tape[ptr] = inputPtr < input.length ? input.charCodeAt(inputPtr++) : 0; break;
          case "[": if (tape[ptr] === 0) ip = bracketMap[ip]; break;
          case "]": if (tape[ptr] !== 0) ip = bracketMap[ip]; break;
        }
        ip++;
      }

      return { success: true, output, steps, truncated: steps >= maxSteps };
    }

    // --- Actions ---
    if (action === "reverse") {
      const lyrics = plaintextToLyrics(plaintext);
      return Response.json({ success: true, lyrics });
    }

    if (action === "run") {
      const bf = lyricsToBF(code);
      const result = runBF(bf, input, maxSteps);
      return Response.json(result);
    }

    return Response.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return Response.json({ success: false, error: String(err) }, { status: 500 });
  }
}
