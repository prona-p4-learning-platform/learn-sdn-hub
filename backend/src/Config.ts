import dotenv from "dotenv";
import {Joi} from "celebrate";

export enum CollisionStrategy {
  SKIP = "SKIP", // Skip if user collision is detected
  APPEND = "APPEND", // Append external id to user if user collision is detected
}

export interface OidcProvider {
  id: string;
  name: string;
  issuer: string;
  clientId: string;
  // None functional variables
  options: {
    createOnAuth: boolean; // Should a valid auth create a user?
    collisionStrategy: CollisionStrategy;
    defaultGroupId: number; // default group id on create
  };
}
// Define the schema
const OidcProviderSchema = Joi.object({
  id: Joi.string().required(),
  name: Joi.string().required(),
  issuer: Joi.string().required(),
  clientId: Joi.string().required(),
  options: Joi.object({
    createOnAuth: Joi.boolean().required().default(false),
    collisionStrategy: Joi.string().optional().default(CollisionStrategy.SKIP),
    defaultGroupId: Joi.number().integer().required().default(0),
  }).required(),
});


export interface Config {
  oidcProviders: OidcProvider[];
}

/**
 * Parse whole config
 */
function parseConfig(): Config {
  // Load environment variables from .env file
  dotenv.config();

  // Return whole config
  return {
    oidcProviders: parseOidcProviders(),
  };
}

/**
 * Parse oidc providers from env variables
 */
function parseOidcProviders(): OidcProvider[] {

  // Search all configure oidc providers by index
  const oidcProviderIndices: number[] = [];
  Object.keys(process.env)
      .filter((key) => key.startsWith("OIDC_PROVIDER"))
      .forEach((key) => {
        const index = Number.parseInt(
            key.replace("OIDC_PROVIDER_", "").split("_")[0],
        );
        // Create object if not already created
        if (oidcProviderIndices.includes(index)) {
          return;
        }
        oidcProviderIndices.push(index);
      });

  // Parse actual values from env
  let oidcProviders: OidcProvider[] = [];
  try {
    oidcProviders = oidcProviderIndices.map((index) => {
      const provider = {
        id: process.env[`OIDC_PROVIDER_${index}_ID`],
        name: process.env[`OIDC_PROVIDER_${index}_NAME`],
        issuer: process.env[`OIDC_PROVIDER_${index}_ISSUER`],
        clientId: process.env[`OIDC_PROVIDER_${index}_CLIENT_ID`],
        options: {
          createOnAuth:
              process.env[`OIDC_PROVIDER_${index}_OPTIONS_CREATE_ON_AUTH`]?.toLowerCase() === "true",
          collisionStrategy:
              process.env[`OIDC_PROVIDER_${index}_OPTIONS_COLLISION_STRATEGY`],
          defaultGroupId:
              Number.parseInt(process.env[`OIDC_PROVIDER_${index}_OPTIONS_DEFAULT_GROUP_ID`] ?? '0'),
        },
      } as OidcProvider;

      // Validate the provider
      const { error } = OidcProviderSchema.validate(provider);

      if (error) {
        console.error("Validation failed:", error.details);
        throw new Error("Invalid OidcProvider");
      }

      return provider;
    });
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
  return oidcProviders;
}

export const config = parseConfig();
