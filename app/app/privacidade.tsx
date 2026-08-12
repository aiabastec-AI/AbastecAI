import { useMemo } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../src/lib/ThemeProvider";
import { tipografia } from "../src/typography";
import { BotaoVoltar } from "../src/components/BotaoVoltar";
import type { ThemeColors } from "../src/theme";

const EMAIL_CONTATO = "aiabastec@gmail.com";
const ATUALIZADO_EM = "11 de agosto de 2026";

export default function PoliticaDePrivacidade() {
  const { colors } = useTheme();
  const styles = useMemo(() => criarEstilos(colors), [colors]);

  return (
    <View style={styles.container}>
      <View style={styles.cabecalho}>
        <BotaoVoltar />
        <Text style={styles.titulo}>Política de Privacidade</Text>
      </View>

      <ScrollView contentContainerStyle={styles.conteudo}>
        <Text style={styles.atualizado}>Última atualização: {ATUALIZADO_EM}</Text>

        <Secao estilos={styles} titulo="1. Quem somos">
          <Paragrafo estilos={styles}>
            O AbastecAI é operado por Digital Educação LTDA (CNPJ 32.295.497/0001-09), controladora dos
            dados pessoais tratados através do aplicativo e do site (juntos, o "AbastecAI" ou "nós").
            Esta política explica quais dados coletamos, por quê, e quais direitos você tem sobre eles,
            nos termos da Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).
          </Paragrafo>
        </Secao>

        <Secao estilos={styles} titulo="2. Que dados coletamos">
          <Subtitulo estilos={styles}>Conta (login com Google)</Subtitulo>
          <Paragrafo estilos={styles}>
            O login é opcional e feito exclusivamente via "Continuar com Google". Quando você entra,
            recebemos seu e-mail do Google (usado para identificar sua conta) através do Supabase Auth,
            nosso provedor de autenticação. Não temos acesso à sua senha do Google em nenhum momento.
          </Paragrafo>
          <Subtitulo estilos={styles}>Localização do dispositivo</Subtitulo>
          <Paragrafo estilos={styles}>
            Com sua permissão, usamos a localização do seu dispositivo para mostrar postos e pontos de
            recarga próximos e para traçar rotas. Essa localização é usada apenas no momento da consulta —
            não guardamos um histórico da sua localização em nenhum banco de dados.
          </Paragrafo>
          <Subtitulo estilos={styles}>Dados que você cria</Subtitulo>
          <Paragrafo estilos={styles}>
            Se você estiver logado, pode favoritar postos/pontos de recarga (visível só pra você),
            avaliar um local com nota e comentário (visível publicamente a outros usuários do app,
            associado a um identificador interno, não ao seu nome ou e-mail) e reportar o preço de um
            combustível (também público, sem exibir quem reportou). Essas ações são sempre uma escolha
            sua — nada disso é obrigatório para usar o mapa.
          </Paragrafo>
          <Subtitulo estilos={styles}>Notificações push</Subtitulo>
          <Paragrafo estilos={styles}>
            Se você logar, o app tenta registrar um identificador do dispositivo (token de notificação)
            para eventualmente enviar avisos sobre lugares que você favoritou. Esse recurso ainda não
            está totalmente ativo em produção.
          </Paragrafo>
        </Secao>

        <Secao estilos={styles} titulo="3. Com quem compartilhamos dados">
          <Paragrafo estilos={styles}>
            Usamos prestadores de serviço que processam dados em nosso nome, sob contrato, e nunca os
            usam para fins próprios: Supabase (banco de dados e autenticação), Google (login,
            mapas e cálculo de rotas) e Vercel (hospedagem da versão web). Não vendemos seus dados
            pessoais a terceiros, nem os usamos para publicidade de terceiros.
          </Paragrafo>
          <Paragrafo estilos={styles}>
            Os dados sobre postos e pontos de recarga (nome, endereço, histórico de fiscalização da ANP,
            conectores) vêm de fontes públicas — Agência Nacional do Petróleo (ANP) e Open Charge Map —
            e não são dados pessoais seus.
          </Paragrafo>
        </Secao>

        <Secao estilos={styles} titulo="4. Por quanto tempo guardamos seus dados">
          <Paragrafo estilos={styles}>
            Guardamos os dados da sua conta enquanto ela existir. Avaliações e preços que você reportou
            permanecem visíveis publicamente (fazem parte do histórico colaborativo do local) até você
            excluí-los individualmente ou excluir sua conta, quando tudo isso é apagado de uma vez.
          </Paragrafo>
        </Secao>

        <Secao estilos={styles} titulo="5. Seus direitos e como excluir sua conta">
          <Paragrafo estilos={styles}>
            Você pode, a qualquer momento: acessar os dados da sua conta, corrigi-los, ou excluir tudo
            de uma vez. A forma mais rápida é dentro do próprio app — abra{" "}
            <Text style={styles.destaque}>Configurações → Excluir minha conta</Text>. Isso apaga
            imediatamente sua conta, favoritos, avaliações e preços reportados, e não pode ser desfeito.
          </Paragrafo>
          <Paragrafo estilos={styles}>
            Se preferir, ou se tiver qualquer outra dúvida ou pedido sobre seus dados, escreva pra{" "}
            <Text style={styles.destaque} onPress={() => Linking.openURL(`mailto:${EMAIL_CONTATO}`)}>
              {EMAIL_CONTATO}
            </Text>
            .
          </Paragrafo>
        </Secao>

        <Secao estilos={styles} titulo="6. Segurança">
          <Paragrafo estilos={styles}>
            Seus dados ficam protegidos por controle de acesso (cada pessoa só acessa os próprios dados
            de conta, favoritos e preferências) e trafegam sempre por conexão criptografada (HTTPS).
          </Paragrafo>
        </Secao>

        <Secao estilos={styles} titulo="7. Crianças">
          <Paragrafo estilos={styles}>
            O AbastecAI não é direcionado a menores de 18 anos e não coletamos intencionalmente dados de
            crianças.
          </Paragrafo>
        </Secao>

        <Secao estilos={styles} titulo="8. Mudanças nesta política">
          <Paragrafo estilos={styles}>
            Podemos atualizar esta política de tempos em tempos. Mudanças relevantes serão refletidas na
            data no topo desta página.
          </Paragrafo>
        </Secao>

        <Secao estilos={styles} titulo="9. Contato">
          <Paragrafo estilos={styles}>
            Digital Educação LTDA — CNPJ 32.295.497/0001-09{"\n"}
            <Text style={styles.destaque} onPress={() => Linking.openURL(`mailto:${EMAIL_CONTATO}`)}>
              {EMAIL_CONTATO}
            </Text>
          </Paragrafo>
        </Secao>
      </ScrollView>
    </View>
  );
}

function Secao({
  estilos,
  titulo,
  children,
}: {
  estilos: ReturnType<typeof criarEstilos>;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <View style={estilos.secao}>
      <Text style={estilos.tituloSecao}>{titulo}</Text>
      {children}
    </View>
  );
}

function Subtitulo({ estilos, children }: { estilos: ReturnType<typeof criarEstilos>; children: React.ReactNode }) {
  return <Text style={estilos.subtitulo}>{children}</Text>;
}

function Paragrafo({ estilos, children }: { estilos: ReturnType<typeof criarEstilos>; children: React.ReactNode }) {
  return <Text style={estilos.paragrafo}>{children}</Text>;
}

function criarEstilos(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    cabecalho: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 24,
      paddingBottom: 12,
    },
    titulo: { ...tipografia.headlineMd, color: colors.textPrimary },
    conteudo: { paddingHorizontal: 24, paddingBottom: 48, gap: 24, maxWidth: 720 },
    atualizado: { ...tipografia.bodySm, color: colors.textSecondary },
    secao: { gap: 8 },
    tituloSecao: { ...tipografia.headlineMd, fontSize: 17, color: colors.textPrimary },
    subtitulo: {
      ...tipografia.bodyMdSemiBold,
      color: colors.textPrimary,
      marginTop: 8,
    },
    paragrafo: { ...tipografia.bodyMd, color: colors.textSecondary, lineHeight: 22 },
    destaque: { color: colors.eletrico, fontFamily: "Inter_600SemiBold" },
  });
}
