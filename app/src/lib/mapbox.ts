import Constants from "expo-constants";
import Mapbox from "@rnmapbox/maps";

const mapboxAccessToken = Constants.expoConfig?.extra?.mapboxAccessToken;

if (!mapboxAccessToken) {
  throw new Error(
    "Mapbox não configurado: verifique MAPBOX_ACCESS_TOKEN em .env.local na raiz do projeto."
  );
}

Mapbox.setAccessToken(mapboxAccessToken);

export { Mapbox };
