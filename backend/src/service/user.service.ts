import jwt from "jsonwebtoken";
import { Persister, UserAccount, UserExternalId } from "../database/Persister";
import { randomUUID } from "crypto";
import { jwtService } from "./jwt.service";
import { AuthenticationProvider } from "../authentication/AuthenticationProvider";
import { CollisionStrategy, config } from "../Config";

export class LoginError extends Error {}

export interface UserLoginResponse extends UserResponse {
  token: string;
}

export interface UserResponse {
  username: string;
  groupNumber: number;
  role?: string;
  sessionId: string;
}

export class UserService {
  /**
   * Login a user via a token
   * @param token
   * @param persister
   * @throws {LoginError} If authentication fails.
   */
  async loginOidc(
    token: string,
    persister: Persister,
  ): Promise<UserLoginResponse> {
    const payload = await jwtService.decodeToken(token);
    // Check if token and necessary claims are available
    if (!payload || !payload.iss || !payload.sub) {
      throw new LoginError("Invalid Token");
    }
    // Get correct local IdP id from config
    const idpId = this.getIdpIdFromIssuer(payload.iss);
    // If the oidc provider couldn't find a local corresponding IdP, throw error
    if (!idpId) {
      throw new LoginError("Issuer is not allowed");
    }
    // From here the user is correctly authenticated against the IdP but not for our backend
    const userExternalId = {
      externalId: payload.sub,
      authProvider: idpId,
    } as UserExternalId;

    try {
      // Check if user with the correctly external ID is available
      const user = await persister.GetUserAccountByExternalId(userExternalId);
      // After successful hit, return login response
      return this.createUserLogin(user);
    } catch (error) {
      console.error(error);
    }

    // Stop propagating
    if (
      !this.isRegistrationEnabledForIdp(idpId) ||
      this.getCollisionStrategyForIdp(idpId) === CollisionStrategy.SKIP
    ) {
      throw new LoginError("Not authenticated");
    }

    const username = jwtService.getUsernameFromPayload(payload);
    if (!username) {
      throw new LoginError("Invalid Token");
    }
    // Test if an account with the same username exists
    let user: UserAccount | undefined;
    try {
      user = await persister.GetUserAccount(username);
    } catch (error) {
      console.error(error);
    }
    // User with same username doesn't exist
    if (!user) {
      // Create account if registration is enabled
      if (!this.isRegistrationEnabledForIdp(idpId)) {
        throw new LoginError("Not authenticated");
      }
      try {
        const user = await this.createUserAccount(
            username,
            userExternalId,
            this.getDefaultGroupIdForIdp(idpId),
            persister,
        );
        // Give token out
        return this.createUserLogin(user);
      } catch (error) {
        console.error(error);
        throw new LoginError("Not authenticated");
      }
    }
    // User exists but has not a corresponding external ID


    if (this.getCollisionStrategyForIdp(idpId) === CollisionStrategy.APPEND) {
      try {
        const user = await this.addExternalIdToUser(username, userExternalId, persister);
        return this.createUserLogin(user);
      } catch (error) {
        console.error(error);
        throw new LoginError("Not authenticated");
      }
    }

    throw new LoginError("Not authenticated");
  }

  /**
   * Login a user via basic auth (username + password)
   * @param username
   * @param password
   * @param authProviders
   * @throws {LoginError} If authentication fails.
   */
  async loginBasic(
    username: string,
    password: string,
    authProviders: AuthenticationProvider[],
  ): Promise<UserLoginResponse> {
    for (const authProvider of authProviders) {
      try {
        const result = await authProvider.authenticateUser(username, password);

        // Give token out
        return this.createUserLogin({
          username: result.username,
          groupNumber: result.groupNumber,
          role: result.role,
        } as UserAccount);
      } catch (error) {
        console.error(error);
      }
    }
    throw new LoginError("Couldn't authenticate user");
  }

  /**
   * Generate the authentication token and create the login response
   * @param user
   * @private
   */
  private createUserLogin(user: UserAccount): UserLoginResponse {
    // Give token out
    const sessionId = randomUUID();

    const userResponse = {
      username: user.username,
      groupNumber: user.groupNumber,
      role: user.role,
      sessionId: sessionId,
    } as UserResponse;

    const token = jwt.sign(
      userResponse,
      process.env.JWT_TOKENSECRET ?? "some-secret",
    );

    console.log(
      "Handled login for user: " +
        user.username +
        " token: " +
        token.substring(0, 8) +
        "..." +
        " session:" +
        sessionId +
        " groupNumber: " +
        user.groupNumber +
        " role: " +
        user.role,
    );

    return {
      token: token,
      ...userResponse,
    } as UserLoginResponse;
  }

  private async createUserAccount(
    username: string,
    externalId: UserExternalId,
    groupId: number,
    persister: Persister,
  ): Promise<UserAccount> {
    // Create
    try {
      await persister.CreateUserAccount({
        username: username,
        groupNumber: groupId,
        environments: [],
        externalIds: [externalId],
      });
      return await persister.GetUserAccountByExternalId(externalId);
    } catch (error) {
      console.error(error);
      throw new Error("Couldn't create account");
    }
  }

  private async addExternalIdToUser(username: string,
                                    externalId: UserExternalId,
                                    persister: Persister,): Promise<UserAccount> {
    try {
      await persister.AddUserExternalId(username, externalId);
      return persister.GetUserAccountByExternalId(externalId);
    } catch (error) {
      console.error(error);
      throw new Error("Couldn't add external id to account");
    }

  }

  getIdpIdFromIssuer(issuer: string): string | undefined {
    return config.oidcProviders.find(
      (oidcProvider) => oidcProvider.issuer === issuer,
    )?.id;
  }

  isRegistrationEnabledForIdp(id: string): boolean {
    return (
      config.oidcProviders.find((oidcProvider) => oidcProvider.id === id)
        ?.options.createOnAuth ?? false
    );
  }

  getCollisionStrategyForIdp(id: string): CollisionStrategy {
    return (
      config.oidcProviders.find((oidcProvider) => oidcProvider.id === id)
        ?.options.collisionStrategy ?? CollisionStrategy.SKIP
    );
  }

  getDefaultGroupIdForIdp(id: string): number {
    return (
        config.oidcProviders.find((oidcProvider) => oidcProvider.id === id)
            ?.options.defaultGroupId ?? 0
    );
  }
}

export const userService = new UserService();
