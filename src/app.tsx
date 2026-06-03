import { Router, Route } from "preact-router";
import { Home } from "./pages/Home";
import { Services } from "./pages/Services";
import { Premium } from "./pages/Premium";
import { NotFound } from "./pages/NotFound";
import { Auth } from "./pages/Auth";
import { Link } from "./pages/Link";
import { Me } from "./pages/me/Me";
import { Transactions } from "./pages/me/Transactions";
import { Profile } from "./pages/Profile";
import { TermsOfService } from "./pages/TermsOfService";
import { InventoryManager } from "./pages/InventoryManager";
import { KeyManager } from "./pages/KeyManager";
import { TokenManager } from "./pages/TokenManager";
import { PrivacyPolicy } from "./pages/PrivacyPolicy";
import { Shop } from "./pages/Shop";
import { Notifications } from "./pages/Notifications";
import { Groups } from "./pages/groups/Groups";
import { GroupDetail } from "./pages/groups/GroupDetail";
import { StarField } from "./components/StarField";

export function App() {
  return (
    <>
      <StarField />
      <Router>
        <Route path="/" component={Home} />
        <Route path="/services" component={Services} />
        <Route path="/premium" component={Premium} />
        <Route path="/inventory-manager" component={InventoryManager} />
        <Route path="/key-manager" component={KeyManager} />
        <Route path="/token-manager" component={TokenManager} />
        <Route path="/shop" component={Shop} />
        <Route path="/notifications" component={Notifications} />
        <Route path="/groups" component={Groups} />
        <Route path="/groups/:grouptag" component={GroupDetail} />
        <Route path="/me" component={Me} />
        <Route path="/me/transactions" component={Transactions} />
        <Route path="/profile" component={Profile} />
        <Route path="/profile/:username" component={Profile} />
        <Route path="/privacy-policy" component={PrivacyPolicy} />
        <Route path="/terms-of-service" component={TermsOfService} />
        <Route path="/auth" component={Auth} />
        <Route path="/link" component={Link} />
        <Route default component={NotFound} />
      </Router>
    </>
  );
}
