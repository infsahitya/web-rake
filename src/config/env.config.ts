import { registerAs } from "@nestjs/config";
import { EnvKeys } from "src/constant/env.constant";
import { ConfigTokens } from "src/constant/token.constant";

export default registerAs(
  ConfigTokens.ENV,
  (): EnvConfigProps => ({
    NODE_ENV: process.env[EnvKeys.NODE_ENV] as EnvConfigProps["NODE_ENV"],
  }),
);
