import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    role: "parent" | "kid";
    childId?: string;
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      role: "parent" | "kid";
      childId?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "parent" | "kid";
    childId?: string;
  }
}
