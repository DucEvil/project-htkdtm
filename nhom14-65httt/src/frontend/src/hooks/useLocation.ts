import { useContext } from "react";
import { LocationContext } from "../contexts/locationState";

export function useLocation() {
  const value = useContext(LocationContext);
  if (!value) throw new Error("useLocation cần nằm trong LocationProvider.");
  return value;
}
