import path from "node:path";
import { defineConfig } from "prisma/config";

export default defineConfig({
  earlyAccess: true,
  schema: path.join(__dirname, "prisma", "schema.prisma"),
  datasource: {
    async url() {
      // dotenv doesn't auto-load in prisma cli context;
      // load .env.local manually if needed
      if (!process.env.DIRECT_DATABASE_URL) {
        const { config } = await import("dotenv");
        config({ path: ".env.local" });
      }
      return process.env.DIRECT_DATABASE_URL!;
    },
  },
});
