import swaggerJsdoc from "swagger-jsdoc";

// Load Prisma-generated JSON schemas with error handling
let prismaSchemas: any = { definitions: {} };
try {
  // Use require for dynamic loading and easy try-catch
  // @ts-ignore - Ignore missing file during build
  prismaSchemas = require("../generated/json-schema/json-schema.json");
} catch (error) {
  console.warn("[Swagger] Prisma JSON schema not found. Documentation schemas may be missing.");
}

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
