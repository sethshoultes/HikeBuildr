import { Loader } from "@googlemaps/js-api-loader";

// Create a single loader instance with all required libraries
export const mapLoader = new Loader({
  apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  version: "weekly",
  libraries: ["drawing"],
  id: "__googleMapsScriptId",
});
