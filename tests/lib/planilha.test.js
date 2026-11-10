import { describe, it, expect } from "vitest";
import { COLUNAS, interpretarPlanilha, modeloCSV, produtosParaLinhas, lerCSV } from "../../src/lib/planilha";

const cab = COLUNAS.join(";");

describe("planilha de produtos: teor alcoólico e IBU", () => {
  it("o modelo e a exportação têm o mesmo número de colunas do cabeçalho", () => {
    const modelo = lerCSV(modeloCSV());
    expect(modelo[0]).toHaveLength(COLUNAS.length);
    expect(modelo[1]).toHaveLength(COLUNAS.length);
    const linha = produtosParaLinhas([{ produto: "X", categoria: "cervejas-importadas", valor: 10, imagens: [], ativo: true, peso_kg: 1, altura_cm: 1, largura_cm: 1, comprimento_cm: 1, teor_alcoolico: 8.5, ibu: 25 }]);
    expect(linha[0]).toHaveLength(COLUNAS.length);
    expect(linha[0][COLUNAS.indexOf("teor_alcoolico")]).toBe("8,5");
    expect(linha[0][COLUNAS.indexOf("ibu")]).toBe("25");
  });

  it("lê teor com vírgula e IBU da planilha; inválido ou vazio vira null", () => {
    const csv = [
      cab,
      "Cerveja A;Cervejas Importadas;10,00;;;;5,5;30;;;sim;;;;",
      "Cerveja B;Cervejas Importadas;10,00;;;;abc;;;;sim;;;;",
    ].join("\n");
    const r = interpretarPlanilha(csv, []);
    expect(r.erroGeral).toBeNull();
    expect(r.linhas[0]).toMatchObject({ teor_alcoolico: 5.5, ibu: 30 });
    expect(r.linhas[1]).toMatchObject({ teor_alcoolico: null, ibu: null });
  });

  it("planilha antiga, sem as colunas novas, continua importando", () => {
    const antigo = "nome;categoria;preco\nCerveja C;Cervejas Importadas;12,00";
    const r = interpretarPlanilha(antigo, []);
    expect(r.erroGeral).toBeNull();
    expect(r.linhas[0]).toMatchObject({ teor_alcoolico: null, ibu: null });
  });
});
