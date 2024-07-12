import * as fs from "fs";
import * as path from "path";
import { Parser } from "json2csv";
import { Injectable } from "@nestjs/common";

@Injectable()
export default class CsvService {
  private dirPath: string;

  constructor() {
    const tempDirPath = path.join(__dirname, "../../..", "docs");

    this.dirPath = tempDirPath;

    if (!fs.existsSync(tempDirPath)) {
      fs.mkdirSync(tempDirPath, { recursive: true });
    }
  }

  convertToCsv(data: JobProps[]): string {
    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(data);

    const filePath = path.join(this.dirPath, `${Date.now()}-jobs.csv`);

    fs.writeFileSync(filePath, csv);
    return filePath;
  }
}
