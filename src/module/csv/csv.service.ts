import path from "path";
import * as fs from "fs";
import { Parser } from "json2csv";
import { Injectable } from "@nestjs/common";

@Injectable()
export default class CsvService {
  convertToCsv(data: JobProps[]): string {
    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(data);

    const dirPath = path.join(__dirname, "../../", "docs");
    const filePath = path.join(dirPath, `${Date.now()}-jobs.csv`);

    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    fs.writeFileSync(filePath, csv);
    return filePath;
  }
}
