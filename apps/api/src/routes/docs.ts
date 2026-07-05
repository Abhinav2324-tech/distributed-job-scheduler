import { readFileSync } from "fs";
import path from "path";
import { Router } from "express";
import swaggerUi from "swagger-ui-express";
import { parse } from "yaml";

// openapi.yaml lives at the repo root; apps/api/{src,dist}/routes are both
// three levels below it, so this resolves the same way in dev (tsx, from
// src/) and in production (compiled, from dist/).
const openApiPath = path.join(__dirname, "../../../../openapi.yaml");
const openApiDocument = parse(readFileSync(openApiPath, "utf-8"));

export const docsRouter = Router();
docsRouter.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));
