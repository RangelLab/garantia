import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const paths = {
  pkg: resolve(root, "package.json"),
  history: resolve(root, "version-history.json"),
  markdown: resolve(root, "VERSION_HISTORY.md"),
};
const ARTIFACTS = new Set(["version-history.json", "VERSION_HISTORY.md"]);
const RANK = { patch: 0, minor: 1, major: 2 };
const SKIP = /\[(skip ci|sem-versao|auto-versao)\]/i;
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" });
const read = (path) => JSON.parse(readFileSync(path, "utf8"));
const parse = (value) => {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(value ?? ""));
  return match ? match.slice(1).map(Number) : null;
};
const fail = (message) => { console.error("Erro: " + message); process.exit(1); };
const skip = (message) => { console.log("Sem nova versão: " + message); process.exit(0); };
const next = (value, kind) => {
  const parsed = parse(value);
  if (!parsed) throw new Error("Versão SemVer inválida.");
  let [major, minor, patch] = parsed;
  if (kind === "major") [major, minor, patch] = [major + 1, 0, 0];
  else if (kind === "minor") [minor, patch] = [minor + 1, 0];
  else if (kind === "patch") patch += 1;
  else throw new Error("Tipo de incremento inválido.");
  return `${major}.${minor}.${patch}`;
};
function markdown(history) {
  const lines = ["# Histórico de versões do Garantia", "", "Registro das versões do Garantia by Borges & Rangel. O versionamento segue SemVer (MAJOR.MINOR.PATCH), independente dos demais aplicativos.", ""];
  for (const entry of history) {
    lines.push(`## v${entry.version} (${entry.date})`, "", `**${entry.title || entry.changes[0]}**`, "");
    for (const change of entry.changes) lines.push("- " + change);
    lines.push("");
  }
  lines.push("## Regras de versionamento", "", "- Correções e ajustes: PATCH.", "- Novas funcionalidades compatíveis: MINOR.", "- Mudanças incompatíveis: MAJOR.", "- Quando houver mais de um tipo, prevalece o incremento de maior impacto.", "");
  return lines.join("\n");
}
function load() {
  const pkg = read(paths.pkg), history = read(paths.history);
  const errors = [];
  if (!parse(pkg.version)) errors.push("package.json tem versão inválida.");
  if ("revision" in pkg) errors.push('package.json não deve conter "revision".');
  if (!Array.isArray(history) || !history.length) errors.push("Histórico vazio ou inválido.");
  if (Array.isArray(history)) {
    const seen = new Set();
    history.forEach((entry) => {
      if (!parse(entry.version)) errors.push("Versão inválida no histórico.");
      if ("revision" in entry) errors.push('O histórico não deve conter "revision".');
      if (!Array.isArray(entry.changes) || !entry.changes.length) errors.push("Entrada sem alterações.");
      if (seen.has(entry.version)) errors.push("Versão duplicada: " + entry.version);
      seen.add(entry.version);
    });
    if (history[0]?.version !== pkg.version) errors.push("package.json diverge da primeira versão do histórico.");
  }
  return { pkg, history, errors };
}
function save(pkg, history) {
  writeFileSync(paths.pkg, JSON.stringify(pkg, null, 2) + "\n");
  writeFileSync(paths.history, JSON.stringify(history, null, 2) + "\n");
  writeFileSync(paths.markdown, markdown(history));
}
function classify(message, sha) {
  const subject = message.trim().split(/\r?\n/)[0] || "";
  const match = /^(\w+)(\([^)]*\))?(!)?:\s*(.+)$/.exec(subject);
  const breaking = Boolean(match?.[3]) || /^BREAKING[ -]CHANGE:/m.test(message);
  const kind = breaking ? "major" : match?.[1]?.toLowerCase() === "feat" ? "minor" : "patch";
  let description = (match?.[4] || subject).trim();
  if (description.length < 12) description = `Alterações registradas no commit ${sha}: ${description}`;
  return { kind, description };
}
function parseOptions(args) {
  const out = { positional: [], before: "", after: "HEAD", message: "" };
  for (let i=0;i<args.length;i++) {
    if (["--before","--after","--message"].includes(args[i])) out[args[i].slice(2)] = args[++i] || "";
    else out.positional.push(args[i]);
  }
  return out;
}
const args = process.argv.slice(2), mode = args.shift(), opts = parseOptions(args);
if (mode === "check" || mode === "regenerate") {
  const { pkg, history, errors } = load();
  if (errors.length) fail(errors.join("\n"));
  if (mode === "regenerate") {
    writeFileSync(paths.markdown, markdown(history));
    console.log("Histórico Markdown regenerado.");
  } else console.log("Versionamento SemVer consistente: " + pkg.version);
} else if (["patch","minor","major"].includes(mode)) {
  const { pkg, history, errors } = load();
  if (errors.length) fail(errors.join("\n"));
  const changes = opts.positional;
  if (!changes.length || changes.some((value) => value.length < 12)) fail("Informe descrições específicas (mínimo de 12 caracteres).");
  const now = new Date();
  const entry = { version: next(pkg.version, mode), date: now.toISOString().slice(0,10), timestamp: now.toISOString(), title: changes[0].slice(0,80), changes };
  save({ ...pkg, version: entry.version }, [entry, ...history]);
  console.log("Garantia atualizado para v" + entry.version);
} else if (mode === "auto") {
  const { pkg, history, errors } = load();
  if (errors.length) fail(errors.join("\n"));
  let commits = [];
  try {
    commits = git("log","--no-merges","--reverse","--format=%H%x1f%B%x00",opts.before+".."+opts.after)
      .split("\0").map((chunk)=>chunk.trim()).filter(Boolean).map((chunk)=>{
        const [sha,...body]=chunk.split("\x1f"); return {sha:sha.trim(),message:body.join("\x1f").trim()};
      }).filter((commit)=>{
        if (SKIP.test(commit.message) || /^Merge /i.test(commit.message)) return false;
        try {
          return git("diff-tree","--no-commit-id","--name-only","-r",commit.sha).split("\n").some((file)=>file && !ARTIFACTS.has(file));
        } catch { return false; }
      });
  } catch {}
  if (!commits.length) skip("nenhum commit de código elegível.");
  const parsed = commits.map((commit)=>classify(commit.message,commit.sha));
  const kind = parsed.reduce((best,item)=>RANK[item.kind]>RANK[best]?item.kind:best,"patch");
  const changes = [...new Set(parsed.map((item)=>item.description))];
  const now = new Date();
  const entry = {version:next(pkg.version,kind),date:now.toISOString().slice(0,10),timestamp:now.toISOString(),title:changes[0].slice(0,80),changes};
  save({...pkg,version:entry.version},[entry,...history]);
  console.log("Garantia atualizado para v"+entry.version);
} else fail("Uso: node scripts/bump-version.mjs check|regenerate|patch|minor|major|auto");
