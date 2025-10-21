"use client";
import { useState } from "react";

export default function Page() {
  const [code, setCode] = useState("");
  const [stdin, setStdin] = useState("");
  const [output, setOutput] = useState("");
  const [plaintext, setPlaintext] = useState("");
  const [loading, setLoading] = useState(false);

  async function runCode() {
    setLoading(true);
    setOutput("");
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run", code, input: stdin }),
      });
      const data = await res.json();
      if (data.success) setOutput(data.output);
      else setOutput("Error: " + data.error);
    } catch (e) {
      setOutput("Network error: " + e.message);
    }
    setLoading(false);
  }

  async function reverseTranslate() {
    setLoading(true);
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reverse", plaintext }),
      });
      const data = await res.json();
      if (data.success) setCode(data.lyrics);
      else setOutput("Error: " + data.error);
    } catch (e) {
      setOutput("Network error: " + e.message);
    }
    setLoading(false);
  }

  return (
    <main style={{ maxWidth: 900, margin: "30px auto", fontFamily: "system-ui", padding: 20 }}>
      <h1>🎵 Never Gonna Fuck You Up — Interpreter</h1>

      <label><strong>Code (NGFYU)</strong></label>
      <textarea
        rows={8}
        style={{ width: "100%" }}
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />

      <label><strong>Input (stdin)</strong></label>
      <input
        style={{ width: "100%", marginBottom: 10 }}
        value={stdin}
        onChange={(e) => setStdin(e.target.value)}
      />

      <button onClick={runCode} disabled={loading}>
        {loading ? "Running..." : "Run"}
      </button>

      <h3>Output</h3>
      <pre
        style={{
          background: "#111",
          color: "#0f0",
          padding: 10,
          minHeight: 100,
          whiteSpace: "pre-wrap",
        }}
      >
        {output}
      </pre>

      <hr style={{ margin: "30px 0" }} />

      <h3>Translate plaintext → NGFYU</h3>
      <input
        style={{ width: "100%" }}
        placeholder="Enter text to translate"
        value={plaintext}
        onChange={(e) => setPlaintext(e.target.value)}
      />
      <button onClick={reverseTranslate} disabled={loading} style={{ marginTop: 10 }}>
        {loading ? "..." : "Translate"}
      </button>
    </main>
  );
}
