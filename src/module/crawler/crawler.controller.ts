import CrawlerService from "./crawler.service";
import { Controller, Get } from "@nestjs/common";

@Controller({
  version: "1",
  path: "crawler",
})
export default class CrawlerController {
  constructor(private readonly crawlerService: CrawlerService) {}

  @Get()
  async crawl() {
    return await this.crawlerService.crawl();
  }
}
