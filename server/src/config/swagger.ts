import swaggerJsdoc from "swagger-jsdoc";
import { readFileSync } from "fs";
import { join } from "path";

// Load Prisma-generated JSON schemas
const jsonSchemaPath = join(
  __dirname,
  "../generated/json-schema/json-schema.json"
);
const prismaSchemas = JSON.parse(readFileSync(jsonSchemaPath, "utf-8"));

// Convert JSON Schema $ref paths to OpenAPI format
// Replace "#/definitions/" with "#/components/schemas/"
const convertRefs = (obj: any): any => {
  if (typeof obj !== "object" || obj === null) return obj;

  if (Array.isArray(obj)) {
    return obj.map(convertRefs);
  }

  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key === "$ref" && typeof value === "string") {
      result[key] = value.replace("#/definitions/", "#/components/schemas/");
    } else {
      result[key] = convertRefs(value);
    }
  }
  return result;
};

const convertedSchemas = convertRefs(prismaSchemas.definitions || {});

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "PeerSpace API",
      version: "1.0.0",
      description: "API documentation for PeerSpace application",
      contact: {
        name: "PeerSpace Team",
      },
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Development server",
      },
    ],
    components: {
      schemas: convertedSchemas,
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: ["./src/**/*.ts"], // Path to the API routes
};

export const swaggerSpec = swaggerJsdoc(options);
