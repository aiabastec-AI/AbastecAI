/// <reference types="google.maps" />
// Equivalente web do PinMapa.tsx (que usa Views React, só válido em React Native): mesmo
// desenho — anel colorido, fundo escuro, nota (ou "⚡" pro elétrico) na cor, com uma
// hastezinha embaixo apontando pro ponto exato — igual um pin de localização do Google Maps,
// só que redondo em vez do balão clássico. O Marker clássico do Google Maps JS
// (google.maps.Marker, usado em vez do AdvancedMarker de propósito — AdvancedMarker exige
// criar um "Map ID" à parte no Cloud Console, setup extra que não vale a pena só pra colorir
// um pin) só aceita imagem/ícone, não JSX — então geramos esse desenho como SVG em data URI.
const COR_FUNDO = "#171A1F";

export function criarIconePin(
  cor: string,
  patrocinado: boolean,
  texto?: string,
  diametro = 28
): google.maps.Icon {
  const corBorda = patrocinado ? "#F5A623" : cor;
  const larguraBorda = patrocinado ? 3.5 : 3;
  const raio = (diametro - larguraBorda) / 2;
  const centro = diametro / 2;
  const alturaHaste = 9;
  const larguraHaste = 5;
  const altura = diametro + alturaHaste;
  const fontSize = texto && texto.length > 2 ? diametro * 0.32 : diametro * 0.4;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${diametro}" height="${altura}">
    <rect x="${centro - larguraHaste / 2}" y="${diametro - 3}" width="${larguraHaste}" height="${alturaHaste}"
      rx="${larguraHaste / 2}" fill="${cor}" />
    <circle cx="${centro}" cy="${centro}" r="${raio}" fill="${COR_FUNDO}" stroke="${corBorda}" stroke-width="${larguraBorda}" />
    ${
      texto
        ? `<text x="${centro}" y="${centro + fontSize * 0.36}" text-anchor="middle" fill="${cor}"
            font-family="Arial, sans-serif" font-weight="700" font-size="${fontSize}">${texto}</text>`
        : ""
    }
  </svg>`;
  // Objeto literal em vez de `new google.maps.Size/Point(...)` de propósito: com o loader
  // assíncrono da Maps JS API (@vis.gl/react-google-maps usa `loading=async`), essas classes
  // só viram construtores de verdade depois de `importLibrary("core")` — chamá-las direto
  // pode disparar "google.maps.Size is not a constructor" dependendo da ordem de carregamento.
  // O SDK só lê as propriedades width/height/x/y, então o literal funciona igual.
  // Âncora na ponta da haste (embaixo, centralizado) — é ali que fica a coordenada real,
  // não no centro do círculo, senão o pin "flutua" deslocado do ponto de verdade.
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: { width: diametro, height: altura } as google.maps.Size,
    anchor: { x: centro, y: altura } as google.maps.Point,
  };
}
