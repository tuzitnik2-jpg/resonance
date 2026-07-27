import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import { json } from "express";
import { AppModule } from "./app.module";
import { ProblemDetailsExceptionFilter } from "./common/filters/problem-details.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api/v1");
  app.use(json({ limit: "15mb" })); // CSV import bodies can be a few MB for a large personal library
  app.use(cookieParser());
  app.useGlobalFilters(new ProblemDetailsExceptionFilter());
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
    credentials: true,
  });

  const port = process.env.API_PORT ? Number(process.env.API_PORT) : 3001;
  await app.listen(port);
  console.log(`Resonance API listening on port ${port}`);
}

bootstrap();
