import * as fs from "fs";
import * as path from "path";
import { Parser } from "json2csv";
import { Injectable } from "@nestjs/common";

@Injectable()
export default class CsvService {
  private dirPath: string;

  constructor() {
    const tempDirPath = path.join(__dirname, "../../..", "data");
    this.dirPath = tempDirPath;

    if (!fs.existsSync(tempDirPath)) {
      fs.mkdirSync(tempDirPath, { recursive: true });
    }
  }

  convertToCsv(data: JobProps[]): [string, string] {
    const uniqueData = [...new Map(data.map(job => [job.data_id, job])).values()];
    uniqueData.sort((a, b) => new Date(b.datePosted).getTime() - new Date(a.datePosted).getTime())

    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(uniqueData);

    const filePrefix = Date.now().toString();
    const folderPath = path.join(this.dirPath, filePrefix);

    fs.mkdirSync(folderPath, { recursive: true });

    const csvFilePath = path.join(folderPath, `${filePrefix}_jobs.csv`);
    const jsonFilePath = path.join(folderPath, `${filePrefix}_jobs.json`);

    fs.writeFileSync(jsonFilePath, JSON.stringify(uniqueData, null, 2));
    fs.writeFileSync(csvFilePath, csv);

    return [jsonFilePath, csvFilePath];
  }
}
