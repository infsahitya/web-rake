import envConfig from "./config/env.config";
import { Inject, Module } from "@nestjs/common";
import LoggerModule from "./module/logger/logger.module";
import { ConfigModule, ConfigType } from "@nestjs/config";
import LoggerService from "./module/logger/logger.service";
import CrawlerModule from "./module/crawler/crawler.module";
import ExcelModule from "./module/csv/csv.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: false,
      isGlobal: true,
      load: [envConfig],
    }),
    LoggerModule,
    ExcelModule,
    CrawlerModule,
  ],
})
export class AppModule {
  constructor(
    private readonly logger: LoggerService,
    @Inject(envConfig.KEY)
    private readonly envConfigService: ConfigType<typeof envConfig>,
  ) {
    this.logger.log(this.envConfigService.NODE_ENV, "NODE_ENV");
  }
}
