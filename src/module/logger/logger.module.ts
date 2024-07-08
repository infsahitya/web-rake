import LoggerService from "./logger.service";
import { Global, Module } from "@nestjs/common";

@Global()
@Module({
  exports: [LoggerService],
  providers: [LoggerService],
})
export default class LoggerModule {}
