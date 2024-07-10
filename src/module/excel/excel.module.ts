import { Module } from "@nestjs/common";
import ExcelService from "./excel.service";

@Module({
  exports: [ExcelService],
  providers: [ExcelService],
})
export default class ExcelModule {}
