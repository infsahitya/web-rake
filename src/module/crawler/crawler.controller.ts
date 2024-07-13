import CsvService from "../csv/csv.service";
import CrawlerService from "./crawler.service";
import { Controller, Get } from "@nestjs/common";

@Controller({
  version: "1",
  path: "crawler",
})
export default class CrawlerController {
  constructor(
    private readonly crawlerService: CrawlerService,
    private readonly csvService: CsvService,
  ) {}

  @Get()
  async crawl() {
    const data = await this.crawlerService.crawl();

    const [jsonFilePath, csvFilePath] = this.csvService.convertToCsv(data);

    return { jsonFilePath, csvFilePath };
  }
}
