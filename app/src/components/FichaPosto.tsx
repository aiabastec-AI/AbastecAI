import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { corDaNota, glowDaNota, type ThemeColors } from "../theme";
import { useTheme } from "../lib/ThemeProvider";
import { tipografia } from "../typography";
import {
  buscarHistoricoFiscalizacao,
  buscarPostoPorId,
  type HistoricoFiscalizacao,
  type PostoDetalhe,
} from "../lib/postos";
import { BotaoFavorito } from "./BotaoFavorito";
import { SecaoAvaliacoes } from "./SecaoAvaliacoes";
import { AnelNota } from "./AnelNota";
import { buscarIdsPatrocinados } from "../lib/patrocinios";

const HISTORICO_VAZIO: HistoricoFiscalizacao = { fiscalizacoes: [], amostras: [] };

// Só o conteúdo da ficha (sem ScrollView/BotaoVoltar) — reaproveitado tanto pela rota cheia
// (app/posto/[id].tsx, usada no nativo e em link direto na web) quanto pelo painel lateral
// do mapa web (app/mapa.tsx), que só muda a casca ao redor, não o conteúdo em si.
export function FichaPosto({ id }: { id: string }) {
  const { colors } = useTheme();
  const styles = useMemo(() => criarEstilos(colors), [colors]);
  const [posto, setPosto] = useState<PostoDetalhe | null | undefined>(undefined);
  const [historico, setHistorico] = useState<HistoricoFiscalizacao>(HISTORICO_VAZIO);
  const [patrocinado, setPatrocinado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    setPosto(undefined);
    setHistorico(HISTORICO_VAZIO);
    setPatrocinado(false);
    setErro(null);
    if (!id) return;
    buscarPostoPorId(id)
      .then(setPosto)
      .catch((e) => setErro(e instanceof Error ? e.message : "Falha ao carregar posto."));
    buscarHistoricoFiscalizacao(id)
      .then(setHistorico)
      .catch(() => {
        // não bloqueia a ficha se só o histórico de fiscalização falhar
      });
    buscarIdsPatrocinados([id], [])
      .then((ids) => setPatrocinado(ids.has(id)))
      .catch(() => {});
  }, [id]);

  if (erro) {
    return <Text style={styles.texto}>{erro}</Text>;
  }

  if (posto === undefined) {
    return (
      <View style={styles.centralizado}>
        <ActivityIndicator color={colors.textPrimary} />
      </View>
    );
  }

  if (posto === null) {
    return <Text style={styles.texto}>Posto não encontrado.</Text>;
  }

  const totalInfracoes = historico.fiscalizacoes.reduce((soma, f) => soma + f.infracoes.length, 0);
  const totalAmostrasNaoConformes = historico.amostras.filter((a) => a.conforme === false).length;
  const semHistorico = historico.fiscalizacoes.length === 0 && historico.amostras.length === 0;

  const nome = posto.nome_fantasia || posto.razao_social;
  const endereco = posto.endereco
    ? [posto.endereco, posto.cidade, posto.uf].filter(Boolean).join(", ")
    : null;
  const mapsUrl = endereco
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`
    : null;

  return (
    <View style={styles.conteudo}>
      <View style={styles.header}>
        <Text style={styles.nome}>{nome}</Text>
        {posto.nota_anp != null ? (
          <View style={{ boxShadow: glowDaNota(posto.nota_anp, colors) }}>
            <AnelNota
              nota={posto.nota_anp}
              tamanho={64}
              corProgresso={corDaNota(posto.nota_anp, colors)}
              corTrilho={colors.border}
            >
              <Text style={[styles.notaTexto, { color: colors.textPrimary }]}>
                {posto.nota_anp.toFixed(1)}
              </Text>
            </AnelNota>
          </View>
        ) : (
          // nota_anp só fica null quando não existe nenhuma fiscalização/amostra nos
          // últimos 5 anos (ver recalcular_nota_anp) — texto explícito pra não parecer
          // nota ruim, é ausência de dado mesmo.
          <View style={[styles.notaBadge, { backgroundColor: colors.notaIndisponivel + "33" }]}>
            <Text style={styles.notaIndisponivelTexto}>Ainda não fiscalizado</Text>
          </View>
        )}
      </View>
      {posto.bandeira && <Text style={styles.bandeira}>{posto.bandeira}</Text>}
      {patrocinado && (
        <View style={styles.patrocinadoBadge}>
          <Text style={styles.patrocinadoTexto}>★ Patrocinado</Text>
        </View>
      )}

      <BotaoFavorito alvo={{ tipo: "posto", id: posto.id }} />

      <View style={styles.card}>
        {endereco && <Linha estilos={styles} label="Endereço" valor={endereco} />}
        <Linha estilos={styles} label="CNPJ" valor={posto.cnpj} />
        {posto.distribuidora_atual && (
          <Linha estilos={styles} label="Distribuidora atual" valor={posto.distribuidora_atual} />
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.tituloCard}>Histórico de fiscalização</Text>
        {semHistorico ? (
          <Text style={styles.texto}>
            Ainda não fiscalizado pela ANP — sem fiscalizações ou amostras de qualidade
            registradas nos últimos 5 anos.
          </Text>
        ) : (
          <>
            <Text style={styles.resumoTexto}>
              {historico.fiscalizacoes.length} fiscalizaç{historico.fiscalizacoes.length === 1 ? "ão" : "ões"} ·{" "}
              {totalInfracoes} infraç{totalInfracoes === 1 ? "ão" : "ões"} · {historico.amostras.length} amostra
              {historico.amostras.length === 1 ? "" : "s"}
              {totalAmostrasNaoConformes > 0 ? `, ${totalAmostrasNaoConformes} não conforme${totalAmostrasNaoConformes === 1 ? "" : "s"}` : ""}
            </Text>
            {historico.fiscalizacoes.map((f) => (
              <View key={f.id} style={styles.linha}>
                <Text style={styles.linhaLabel}>
                  {f.data_fiscalizacao ?? "Data não informada"}
                  {f.numero_df ? ` · DF ${f.numero_df}` : ""}
                </Text>
                <Text style={styles.linhaValor}>
                  {f.infracoes.length === 0
                    ? "Sem infração registrada"
                    : f.infracoes.map((i) => i.descricao).join("; ")}
                </Text>
              </View>
            ))}
          </>
        )}
      </View>

      {mapsUrl && (
        <Pressable style={styles.botaoPrimario} onPress={() => Linking.openURL(mapsUrl)}>
          <Text style={styles.botaoPrimarioTexto}>Traçar rota</Text>
        </Pressable>
      )}

      <Pressable
        style={styles.botaoSecundario}
        onPress={() => Linking.openURL("https://www.gov.br/anp/pt-br/canais_atendimento/fale-conosco")}
      >
        <Text style={styles.botaoSecundarioTexto}>Denunciar à ANP</Text>
      </Pressable>

      <SecaoAvaliacoes alvo={{ tipo: "posto", id: posto.id }} />
    </View>
  );
}

function Linha({
  estilos,
  label,
  valor,
}: {
  estilos: ReturnType<typeof criarEstilos>;
  label: string;
  valor: string;
}) {
  return (
    <View style={estilos.linha}>
      <Text style={estilos.linhaLabel}>{label}</Text>
      <Text style={estilos.linhaValor}>{valor}</Text>
    </View>
  );
}

function criarEstilos(colors: ThemeColors) {
  return StyleSheet.create({
    centralizado: { alignItems: "center", justifyContent: "center", padding: 20 },
    conteudo: { gap: 16 },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    nome: { ...tipografia.headlineLgMobile, color: colors.textPrimary, flexShrink: 1 },
    notaBadge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 },
    notaTexto: { fontFamily: "SpaceGrotesk_700Bold", fontSize: 20 },
    notaIndisponivelTexto: { color: colors.textSecondary, fontFamily: "Inter_600SemiBold", fontSize: 12 },
    resumoTexto: { color: colors.textSecondary, fontFamily: "Inter_600SemiBold", fontSize: 12 },
    bandeira: { color: colors.textSecondary, fontFamily: "Inter_400Regular", fontSize: 14 },
    patrocinadoBadge: {
      alignSelf: "flex-start",
      backgroundColor: colors.notaMedia,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
    },
    patrocinadoTexto: { color: colors.background, fontFamily: "Inter_600SemiBold", fontSize: 11 },
    card: { backgroundColor: colors.surfaceElevated, borderRadius: 14, padding: 16, gap: 10 },
    tituloCard: { ...tipografia.headlineMd, color: colors.textPrimary, fontSize: 15, lineHeight: 20 },
    linha: { gap: 2 },
    linhaLabel: { ...tipografia.labelCaps, color: colors.textSecondary, fontSize: 11 },
    linhaValor: { ...tipografia.bodyMd, color: colors.textPrimary, fontSize: 15, lineHeight: 20 },
    texto: { ...tipografia.bodySm, color: colors.textSecondary, padding: 20 },
    botaoPrimario: {
      backgroundColor: colors.combustivel,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: "center",
      boxShadow: colors.glowCombustivel,
    },
    botaoPrimarioTexto: { color: colors.background, fontFamily: "Inter_600SemiBold", fontSize: 15 },
    botaoSecundario: {
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    botaoSecundarioTexto: { color: colors.textSecondary, fontFamily: "Inter_600SemiBold", fontSize: 14 },
  });
}
