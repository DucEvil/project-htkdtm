import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { LocationProvider } from "../../contexts/LocationContext";
import RouteErrorBoundary from "../common/RouteErrorBoundary";

export default function AppShell() {
  return (
    <LocationProvider>
      <div className="app-shell">
        <a className="skip-link" href="#main-content">
          Đến nội dung chính
        </a>
        <Navbar />
        <main id="main-content" tabIndex={-1}>
          <RouteErrorBoundary>
            <Outlet />
          </RouteErrorBoundary>
        </main>
        <Footer />
      </div>
    </LocationProvider>
  );
}
