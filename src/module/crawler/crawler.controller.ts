import { Response } from "express";
import CsvService from "../csv/csv.service";
import CrawlerService from "./crawler.service";
import { Controller, Get, Res } from "@nestjs/common";

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
  async crawl(@Res() res: Response) {
    const data = await this.crawlerService.crawl();

    const filePath = this.csvService.convertToCsv(data);

    return res.download(filePath, (err) => {
      if (err) {
        res.status(500).send({ message: "Could not download the file." });
      }
    });
  }
}
