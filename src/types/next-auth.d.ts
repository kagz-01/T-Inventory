import { Role } from "@/types/dbEnums";
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: Role;
      organizationId: string | null;
    };
  }
}
