// Equivalente aos estilos de tile "mapbox://styles/mapbox/light-v11"/"dark-v11" que o
// app usava — o Google Maps não aceita URL de estilo hospedada, e sim um array de regras
// JSON (customMapStyle) aplicado sobre os tiles padrão. POIs de negócio ficam escondidos
// de propósito (o app já mostra os próprios pins de posto/recarga por cima — POI nativo
// do Google só competiria visualmente, sem ajudar).
export const estiloMapaEscuro = [
  { elementType: "geometry", stylers: [{ color: "#0D0F12" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8A9099" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0D0F12" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#262B33" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#14181A" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1E2126" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#171A1F" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#282A2D" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#1E2126" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#08090B" }] },
];

export const estiloMapaClaro = [
  { elementType: "geometry", stylers: [{ color: "#F7F8FA" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#5B626D" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#F7F8FA" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#E2E5EA" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#E9EEE9" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#FFFFFF" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#E2E5EA" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#EEF0F3" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#FFFFFF" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#D6E5EA" }] },
];
