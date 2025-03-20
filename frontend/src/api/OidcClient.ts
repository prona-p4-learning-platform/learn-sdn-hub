import { UserManager} from "oidc-client-ts";
import config from "./Config.ts"; // Import OIDC client library

const oidcClient = new UserManager({
    authority: config.oidcConfig.authority,
    client_id: config.oidcConfig.clientId,
    redirect_uri: config.oidcConfig.redirectUri,
    post_logout_redirect_uri: config.oidcConfig.postLogoutRedirectUri,
    automaticSilentRenew: false
});

export default oidcClient;
