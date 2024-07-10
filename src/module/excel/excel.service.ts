import * as ExcelJS from "exceljs";
import { Injectable } from "@nestjs/common";
import path from "path";

@Injectable()
export default class ExcelService {
  async generateExcel(data: PrimaryJobProps[]): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Sheet 1");

    const headers = Object.keys(data[0]);
    worksheet.addRow(headers);

    data.forEach((item) => {
      const row = headers.map((header) => item[header]);
      worksheet.addRow(row);
    });

    const filePath = path.join(
      __dirname,
      "..",
      "..",
      "doc",
      "sheets",
      `${Date.now()}.xlsx`,
    );

    await workbook.xlsx.writeFile(filePath);
  }
}
