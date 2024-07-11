import { registerAs } from "@nestjs/config";
import { EnvKeys } from "src/constant/env.constant";
import { ConfigTokens } from "src/constant/token.constant";

export default registerAs(
  ConfigTokens.ENV,
  (): EnvConfigProps => ({
    CRAWL_URLS: process.env[EnvKeys.CRAWL_URLS],
    OPENAI_API_KEY: process.env[EnvKeys.OPENAI_API_KEY],
    NODE_ENV: process.env[EnvKeys.NODE_ENV] as EnvConfigProps["NODE_ENV"],
  }),
);
