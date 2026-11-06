// Supabase falso em memória, só com o que as rotas do projeto usam:
// from().select/insert/update/delete + eq/neq/in/single/maybeSingle, rpc() e auth.
import { randomUUID } from "node:crypto";

class Consulta {
  constructor(banco, tabela) {
    this.banco = banco;
    this.tabela = tabela;
    this.op = "select";
    this.filtros = [];
    this.retorna = false;
    this.unico = null;
  }
  select() { if (this.op !== "select") this.retorna = true; return this; }
  insert(p) { this.op = "insert"; this.payload = p; return this; }
  update(p) { this.op = "update"; this.payload = p; return this; }
  delete() { this.op = "delete"; return this; }
  eq(c, v) { this.filtros.push((r) => r[c] === v); return this; }
  neq(c, v) { this.filtros.push((r) => r[c] !== v); return this; }
  in(c, vs) { this.filtros.push((r) => vs.includes(r[c])); return this; }
  order() { return this; }
  limit() { return this; }
  single() { this.unico = "single"; return this; }
  maybeSingle() { this.unico = "maybe"; return this; }
  then(ok, falha) { return Promise.resolve(this.executar()).then(ok, falha); }

  executar() {
    const t = this.banco.tabelas;
    const linhas = (t[this.tabela] ??= []);
    const casa = (r) => this.filtros.every((f) => f(r));
    let afetadas;

    if (this.op === "insert") {
      afetadas = (Array.isArray(this.payload) ? this.payload : [this.payload]).map((r) => ({ id: randomUUID(), ...r }));
      linhas.push(...afetadas);
    } else if (this.op === "update") {
      afetadas = linhas.filter(casa);
      afetadas.forEach((r) => Object.assign(r, this.payload));
    } else if (this.op === "delete") {
      afetadas = linhas.filter(casa);
      t[this.tabela] = linhas.filter((r) => !casa(r));
    } else {
      afetadas = linhas.filter(casa);
    }

    if (this.op !== "select" && !this.retorna) return { data: null, error: null };
    if (this.unico === "single") {
      return afetadas.length === 1
        ? { data: afetadas[0], error: null }
        : { data: null, error: { code: "PGRST116", message: "esperava 1 linha" } };
    }
    if (this.unico === "maybe") return { data: afetadas[0] ?? null, error: null };
    return { data: afetadas, error: null };
  }
}

// tabelas: { nome: [linhas] } · tokens: { "tok-x": { id, email } } · rpc: { nome: (args) => linhas }
export function criarBanco({ tabelas = {}, tokens = {}, rpc = {} } = {}) {
  const banco = { tabelas: structuredClone(tabelas), chamadasRpc: [] };
  banco.from = (nome) => new Consulta(banco, nome);
  banco.rpc = async (nome, args) => {
    banco.chamadasRpc.push({ nome, args });
    const fn = rpc[nome];
    const r = fn ? fn(args) : null;
    if (r && r.__erro) return { data: null, error: { message: r.__erro } };
    return { data: r, error: null };
  };
  banco.auth = {
    getUser: async (token) => ({ data: { user: tokens[token] ?? null } }),
    admin: {
      getUserById: async (id) => {
        const u = Object.values(tokens).find((x) => x.id === id);
        return { data: { user: u ? { email: u.email ?? `${id}@teste.com` } : null } };
      },
    },
  };
  return banco;
}

export function requisicao(url, { token, body, headers = {} } = {}) {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: JSON.stringify(body ?? {}),
  });
}

export async function resposta(res) {
  return { status: res.status, json: await res.json() };
}
