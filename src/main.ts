import {
  VersioningType,
  ValidationPipe,
  VERSION_NEUTRAL,
} from "@nestjs/common";
import { AppModule } from "./app.module";
import { NestFactory } from "@nestjs/core";
import * as cookieParser from "cookie-parser";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ["error", "debug", "fatal", "log", "verbose", "warn"],
  });

  app.enableCors();
  app.use(cookieParser());

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: VERSION_NEUTRAL,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
    }),
  );

  await app.listen(3000);
}
bootstrap();
