import { Controller, Get, Query } from "@nestjs/common";
import CrawlerService from "./crawler.service";

@Controller({
  version: "1",
  path: "crawler",
})
export default class CrawlerController {
  constructor(private readonly crawlerService: CrawlerService) {}

  @Get()
  async crawl(@Query("url") url: string): Promise<any> {
    if (!url) {
      return { error: "URL query parameter is required" };
    }
    return await this.crawlerService.crawl(url);
  }
}
