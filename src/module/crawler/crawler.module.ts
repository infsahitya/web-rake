import { Module } from "@nestjs/common";
import CrawlerService from "./crawler.service";
import CrawlerController from "./crawler.controller";
import ExcelModule from "../excel/excel.module";

@Module({
  imports: [ExcelModule],
  providers: [CrawlerService],
  controllers: [CrawlerController],
})
export default class CrawlerModule {}
