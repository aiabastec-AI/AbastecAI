/// <reference types="google.maps" />
// Equivalente web do PinMapa.tsx (que usa uma View React, só válido em React Native).
// O Marker clássico do Google Maps JS (google.maps.Marker, usado em vez do AdvancedMarker
// de propósito — AdvancedMarker exige criar um "Map ID" à parte no Cloud Console, setup
// extra que não vale a pena só pra colorir um pin) só aceita imagem/ícone, não JSX — então
// geramos o mesmo squircle como SVG embutido em data URI, com a nota (ou "⚡" pro elétrico)
// escrita dentro — só a cor não deixava claro o valor, o usuário só via a cor no mapa.
export function criarIconePin(
  cor: string,
  patrocinado: boolean,
  texto?: string,
  tamanho = 40
): google.maps.Icon {
  const raio = tamanho * 0.32;
  const corBorda = patrocinado ? "#F5A623" : "#FFFFFF";
  const larguraBorda = patrocinado ? 3 : 2;
  const fontSize = texto && texto.length > 2 ? tamanho * 0.34 : tamanho * 0.4;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${tamanho}" height="${tamanho}">
    <rect x="${larguraBorda / 2}" y="${larguraBorda / 2}" width="${tamanho - larguraBorda}" height="${tamanho - larguraBorda}"
      rx="${raio}" ry="${raio}" fill="${cor}" stroke="${corBorda}" stroke-width="${larguraBorda}" />
    ${
      texto
        ? `<text x="50%" y="53%" text-anchor="middle" dominant-baseline="middle" fill="#0D0F12"
            font-family="Arial, sans-serif" font-weight="700" font-size="${fontSize}">${texto}</text>`
        : ""
    }
  </svg>`;
  // Objeto literal em vez de `new google.maps.Size/Point(...)` de propósito: com o loader
  // assíncrono da Maps JS API (@vis.gl/react-google-maps usa `loading=async`), essas classes
  // só viram construtores de verdade depois de `importLibrary("core")` — chamá-las direto
  // pode disparar "google.maps.Size is not a constructor" dependendo da ordem de carregamento.
  // O SDK só lê as propriedades width/height/x/y, então o literal funciona igual.
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: { width: tamanho, height: tamanho } as google.maps.Size,
    anchor: { x: tamanho / 2, y: tamanho / 2 } as google.maps.Point,
  };
}
