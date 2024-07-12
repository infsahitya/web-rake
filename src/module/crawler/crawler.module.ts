import { Module } from "@nestjs/common";
import CsvModule from "../csv/csv.module";
import CrawlerService from "./crawler.service";
import CrawlerController from "./crawler.controller";

@Module({
  imports: [CsvModule],
  providers: [CrawlerService],
  controllers: [CrawlerController],
})
export default class CrawlerModule {}
