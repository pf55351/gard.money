import { Provider } from "react-redux";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AlgoGovernanceContent from "../pages/AlgoGovernanceContent";
import AuctionsContent from "../pages/AuctionsContent";
import DaoContent from "../pages/DaoContent";
import DashboardContent from "../pages/DashboardContent";
import HomeContent from "../pages/HomeContent";
import Main from "./Main";
import MintContent from "../pages/MintContent";
import RepayContent from "../pages/RepayContent";
import ActionsContent from "../pages/ActionsContent";
import AccountContent from "../pages/AccountContent";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={Main(HomeContent, "Home")} />
        <Route
          path="/dashboard"
          element={Main(DashboardContent, "Dashboard")}
        />
        <Route path="/account" element={Main(AccountContent, "Wallet")} />
        <Route path="/new-cdp" element={Main(MintContent, "New CDP")} />
        <Route path="/manage" element={Main(RepayContent, "Manage CDPs")} />
        <Route path="/auctions" element={Main(AuctionsContent, "Auctions")} />
        <Route path="/actions" element={Main(ActionsContent, "Actions")} />
        <Route path="/dao" element={Main(DaoContent, "DAO")} />
        <Route
          path="/algo-governance"
          element={Main(AlgoGovernanceContent, "Algo Governance")}
        />
      </Routes>
    </BrowserRouter>
  );
}
