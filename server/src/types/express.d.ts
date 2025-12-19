import { Role } from "@prisma/client"; // Import the Role enum from Prisma

declare module "express-serve-static-core" {
  interface Request {
    user?: {
      userId: number;
      role: Role;
    };
  }
}
