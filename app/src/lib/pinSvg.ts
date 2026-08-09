/// <reference types="google.maps" />
// Equivalente web do PinMapa.tsx (que usa uma View React, só válido em React Native).
// O Marker clássico do Google Maps JS (google.maps.Marker, usado em vez do AdvancedMarker
// de propósito — AdvancedMarker exige criar um "Map ID" à parte no Cloud Console, setup
// extra que não vale a pena só pra colorir um pin) só aceita imagem/ícone, não JSX — então
// geramos o mesmo squircle como SVG embutido em data URI.
export function criarIconePin(cor: string, patrocinado: boolean, tamanho = 34): google.maps.Icon {
  const raio = tamanho * 0.32;
  const corBorda = patrocinado ? "#F5A623" : "#FFFFFF";
  const larguraBorda = patrocinado ? 3 : 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${tamanho}" height="${tamanho}">
    <rect x="${larguraBorda / 2}" y="${larguraBorda / 2}" width="${tamanho - larguraBorda}" height="${tamanho - larguraBorda}"
      rx="${raio}" ry="${raio}" fill="${cor}" stroke="${corBorda}" stroke-width="${larguraBorda}" />
  </svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(tamanho, tamanho),
    anchor: new google.maps.Point(tamanho / 2, tamanho / 2),
  };
}
