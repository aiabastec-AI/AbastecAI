// PostgREST usa vírgula e parênteses como delimitadores na sintaxe do `.or()`,
// e "%"/"_" são coringas do próprio ILIKE — sem escapar isso, um termo digitado
// pelo usuário (ex.: "posto (av. principal)") quebraria o filtro ou casaria com tudo.
export function termoParaIlike(termo: string): string {
  return termo.trim().replace(/[,()%_]/g, " ").replace(/\s+/g, " ").trim();
}
