import { createContext } from "react";
import type { SearchLocation } from "../utils/locationValidation";

export interface LocationState {
  location: SearchLocation | null;
  locating: boolean;
  error: string;
  choose: (point: SearchLocation) => void;
  locate: () => void;
  clear: () => void;
}
export const LocationContext = createContext<LocationState | null>(null);
