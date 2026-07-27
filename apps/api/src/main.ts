import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import { json } from "express";
import { AppModule } from "./app.module";
import { ProblemDetailsExceptionFilter } from "./common/filters/problem-details.filter";

/** Prepend https:// when a host is given without a scheme (e.g. Render's fromService host). */
function withScheme(value: string | undefined): string | undefined {
  if (!value) return value;
  return /^https?:\/\//.test(value) ? value : `https://${value}`;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api/v1");
  app.use(json({ limit: "15mb" })); // CSV import bodies can be a few MB for a large personal library
  app.use(cookieParser());
  app.useGlobalFilters(new ProblemDetailsExceptionFilter());
  app.enableCors({
    origin: withScheme(process.env.WEB_ORIGIN) ?? "http://localhost:3000",
    credentials: true,
  });

  // Render (and most PaaS) inject the port to bind on via $PORT; fall back to API_PORT for local.
  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 3001);
  await app.listen(port, "0.0.0.0");
  console.log(`Resonance API listening on port ${port}`);
}

bootstrap();
