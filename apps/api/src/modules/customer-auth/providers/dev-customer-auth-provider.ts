import { Injectable } from "@nestjs/common";
import type {
  VerifiedCustomerIdentity,
} from "../types/customer-identity.types";
import type {
  CustomerAuthProvider,
} from "./customer-auth-provider";

@Injectable()
export class DevCustomerAuthProvider
  implements CustomerAuthProvider
{
  readonly providerName = "DEV";

  async verifyIdentity(
    credential: string,
  ): Promise<VerifiedCustomerIdentity> {
    if (!credential.trim()) {
      throw new Error(
        "Development authentication credential is required",
      );
    }

    return {
      provider: this.providerName,
      externalAuthId: credential.trim(),
      identifierType: "EMAIL",
      identifierValue: `${credential.trim()}@example.invalid`,
      firstName: "Dev",
      lastName: "Customer",
      email: `${credential.trim()}@example.invalid`,
      phone: null,
      metadata: {
        source: "local-development",
      },
    };
  }
}