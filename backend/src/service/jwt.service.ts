import jsonwebtoken, { Jwt, JwtHeader, JwtPayload } from "jsonwebtoken";
import axios from "axios";
import { OidcMetadata } from "oidc-client-ts";
import JwksRsa, { JwksClient, SigningKey } from "jwks-rsa";
import { config } from "../Config";

export class JwtService {
  // Variable for caching jwks uris to accelerate lookup time
  readonly jwksUriCache: Map<string, { jwksUri: string; time: number }> =
    new Map<
      string,
      {
        jwksUri: string;
        time: number;
      }
    >();

  /**
   * Fetch jwks (JSON Web Key Sets) uris from cache or remote issuer
   * @param issuer The issuer url of the oidc provider
   * @return Promise containing the jwks uri or null if an error occurred.
   * @private
   */
  private async fetchJwksUri(issuer: string): Promise<string | null> {
    // Try getting from cache to improve performance. Local test: 250ms -> 25ms. Factor 10 faster.
    const cachedJwksUri = this.jwksUriCache.get(issuer);
    if (cachedJwksUri && Date.now() - cachedJwksUri.time < 28800000) {
      // 8h = 28800000ms
      return cachedJwksUri.jwksUri;
    }

    // Fetch openid config from issuer if cache has no valid entry.
    // Fetch the well-know oidc configuration for the endpoint specification
    const response = await axios.get(
      `${issuer}/.well-known/openid-configuration`,
    );
    const oidcMetadata: OidcMetadata = (await response.data) as OidcMetadata;

    // Error handling if oidc config couldn't be fetched
    if (!oidcMetadata) {
      console.error("Could not load openid config from %s", issuer);
      return null;
    }
    // Error handling if oidc config doesn't contain jwks uris
    if (!oidcMetadata.jwks_uri) {
      console.error("Could not load jwks_uris from %s", issuer);
      return null;
    }

    // Cache jwksUri for later use
    this.jwksUriCache.set(issuer, {
      jwksUri: oidcMetadata.jwks_uri,
      time: Date.now(),
    });
    console.debug("Using fetched jwks uri");
    return oidcMetadata.jwks_uri;
  }

  /**
   * Get signing key from jwks uri and key id for validating a token
   * @param jwksUri The jwks uri where the singing key for the {@link kid} should be looked up.
   * @param kid The key id of the jwt token.
   * @return Promise containing the singing key of the {@link kid} from the jwks uri or a reject if an error occurred.
   * @private
   */
  private getSigningKey(jwksUri: string, kid: string): Promise<SigningKey> {
    // Get jwksClient from jwks uri for gathering the signing key later
    const jwksClient: JwksClient = new JwksClient({
      jwksUri: jwksUri,
    } as JwksRsa.Options);

    // Workaround: Remap callback function to async promise for better use later on, because getSigningKey method propagates the result to a callback function
    return new Promise((resolve, reject) => {
      jwksClient.getSigningKey(
        kid,
        (err: Error | null, key: SigningKey | undefined) => {
          // Reject the promise if an error occurred or no key could be gathered
          if (err) {
            reject(err);
            return;
          }
          if (!key) {
            reject(new Error("Couldn't get signing key"));
            return;
          }
          // Otherwise resolve promise with the key as the value
          resolve(key);
          return;
        },
      );
    });
  }

  /**
   * Decodes and validates token, against the configured oidc providers. This method should be used for authenticating the clients
   * @param token The base64 encoded token that should be decoded.
   * @return The payload of the {@link token} on success otherwise null as a Promise
   */
  async decodeToken(token: string): Promise<JwtPayload | null> {
    // Decode the token to a readable object
    const jwt: Jwt | null = jsonwebtoken.decode(token, { complete: true });
    // Split the jwt object into the header and payload if available
    const jwtHeader: JwtHeader = jwt?.header as JwtHeader;
    const jwtPayload: JwtPayload = jwt?.payload as JwtPayload;
    // If no issuer is available, the token cant be decoded
    if (!jwtPayload?.iss) {
      return null;
    }

    // Check if the issuer is registered and available
    const oidcProvider = config.oidcProviders.find(
      (provider) => provider.issuer === jwtPayload.iss,
    );
    if (!oidcProvider) {
      return null;
    }

    // Fetch jwksUri for the token issuer
    const jwksUri: string | null = await this.fetchJwksUri(jwtPayload.iss);
    // Cant decode if jwksUri or key id is not available
    if (!jwksUri || !jwtHeader?.kid) {
      return null;
    }

    // Get the signing key from the jwksUri and kid for decoding the token
    return this.getSigningKey(jwksUri, jwtHeader.kid).then(
      (signingKey: SigningKey) => {
        const verifyOptions = {
          issuer: oidcProvider.issuer,
        };
        const payload = this.decodeTokenRaw(
          token,
          signingKey.getPublicKey(),
          verifyOptions,
        );
        if (!payload) {
          return null;
        }
        // Test for other claims and return null if not valid
        if (payload.azp && payload.azp !== oidcProvider.clientId) {
          return null;
        }
        // Otherwise return verified jwt payload
        return payload;
      },
    );
  }

  /**
   * TODO Migrate authorization to use complete jwt tokens with expiration, etc or even oidc/oauth2.0 tokens. https://www.rfc-editor.org/info/rfc7519
   * Decodes and validates token.
   * @param token The base64 encoded token that should be decoded.
   * @param secretOrPublicKey Key that will be used to verify the signature
   * @param options Additional verification options
   * @return The payload of the {@link token} on success otherwise null as a Promise
   */
  decodeTokenRaw(
    token: string,
    secretOrPublicKey: string,
    options: jsonwebtoken.VerifyOptions,
  ): JwtPayload | null {
    try {
      // Otherwise return verified jwt payload
      return jsonwebtoken.verify(
        token,
        secretOrPublicKey,
        options,
      ) as JwtPayload;
    } catch (err) {
      console.error(err);
      // Otherwise return null if an error occurred while verifying
      return null;
    }
  }

  getUsernameFromPayload(payload: JwtPayload): string | undefined {
    return payload?.preferred_username as string
  }
}

export const jwtService = new JwtService();
