import OpenAI from "openai";
import * as cheerio from "cheerio";
import * as tough from "tough-cookie";
import { ConfigType } from "@nestjs/config";
import envConfig from "src/config/env.config";
import ExcelService from "../excel/excel.service";
import { wrapper } from "axios-cookiejar-support";
import { Inject, Injectable } from "@nestjs/common";
import axios, { AxiosInstance, AxiosResponse } from "axios";

type PrimaryJobProps = Omit<JobProps, "applyLink" | "views" | "applied">;
type SecondaryJobProps = Omit<JobProps, keyof PrimaryJobProps>;

@Injectable()
export default class CrawlerService {
  private openai: OpenAI;
  private axiosInstance: AxiosInstance;
  private userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.864.48 Safari/537.36 Edg/91.0.864.48",
    "Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Mobile Safari/537.36",
  ] as const;

  constructor(
    private readonly excelService: ExcelService,
    @Inject(envConfig.KEY)
    private readonly envConfigService: ConfigType<typeof envConfig>,
  ) {
    this.axiosInstance = wrapper(
      axios.create({
        withCredentials: true,
        jar: new tough.CookieJar(),
      }),
    );

    this.openai = new OpenAI({ apiKey: envConfigService.OPENAI_API_KEY });
  }

  private async fetchWithRedirects(
    url: string,
    maxRedirects = 5,
    retries = 5,
    initialDelay = 1000,
  ): Promise<string> {
    let redirects = 0;
    let response: AxiosResponse<any>;
    let delay = initialDelay;

    while (redirects < maxRedirects) {
      for (let attempt = 0; attempt < retries; attempt++) {
        try {
          response = await this.axiosInstance.get(url, {
            validateStatus: (status) => status < 400 || status === 302,
            headers: {
              "User-Agent":
                this.userAgents[
                  Math.floor(Math.random() * this.userAgents.length)
                ],
            },
          });

          if (response.status === 302) {
            url = response.headers.location;
            redirects++;
            break; // exit retry loop and go to the next redirect
          } else {
            return response.data;
          }
        } catch (error) {
          if (attempt === retries - 1) {
            throw new Error(
              `Request failed after ${retries} retries: ${error.message}`,
            );
          }
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
        }
      }
    }

    throw new Error("Maximum number of redirects exceeded");
  }

  async crawl(): ReturnType<typeof this.extractData> {
    const result: JobProps[] = [];

    let offsetValue: number = 15;
    const maxOffset: number = 30;
    const offsetJump: number = 15;

    try {
      while (result.length >= maxOffset) {
        const data = await this.fetchWithRedirects(
          `https://remoteok.com/?&action=get_jobs&offset=${offsetValue}`,
        );
        const $ = cheerio.load(data);

        const extractedData = await this.extractData($);
        if (extractedData.length === 0) break;

        result.push(...extractedData);
        offsetValue += offsetJump;

        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error(`Error fetching data from:`, error);
      throw error;
    }

    // await this.excelService.generateExcel(result);

    return result;
  }

  private async extractData($: cheerio.CheerioAPI): Promise<JobProps[]> {
    const jobs = [];
    const jobElements = $("tr.job");

    for (const elementSource of jobElements.toArray()) {
      const job = this.extractJob($, elementSource);
      if (job) {
        const jobDetails = await this.fetchOtherDetails(job);
        jobs.push({ ...job, ...jobDetails });
      }
    }

    return jobs;
  }

  private extractJob(
    $: cheerio.CheerioAPI,
    elementSource: cheerio.Element,
  ): PrimaryJobProps {
    const el = $(elementSource);

    const scriptTag = el.find('script[type="application/ld+json"]').html();
    const jobData = JSON.parse(scriptTag);

    return {
      datePosted: jobData.datePosted,
      validThrough: jobData.validThrough || null,
      dataID: $(elementSource).attr("data-id") || null,
      jobTitle: jobData.title || null,
      jobLocation: jobData.jobLocation || null,
      dataSlug: $(elementSource).attr("data-slug") || null,
      dataURL:
        `https://remoteok.com${$(elementSource).attr("data-url")}` || null,
      dataSearch: $(elementSource).attr("data-search") || null,
      salary: jobData.baseSalary || null,
      employmentType: jobData.employmentType || null,
      industry: jobData.industry || null,
      jobLocationType: jobData.jobLocationType || null,
      applicantLocationRequirements:
        jobData.applicantLocationRequirements || null,
      occupationalCategory: jobData.occupationalCategory || null,
      workHours: jobData.workHours || null,
      hiringOrganization: jobData.hiringOrganization || null,
      description: jobData.description || null,
      jobBenefits: jobData.jobBenefits || null,
    };
  }

  private async fetchOtherDetails(
    job: PrimaryJobProps,
  ): Promise<SecondaryJobProps> {
    const { dataURL, dataID } = job;

    try {
      const { data } = await this.axiosInstance.get(dataURL);
      const $ = cheerio.load(data);

      const parentEl = $(`tr.expand.expand-${dataID}.active div.description`);

      const applyLink = $(
        `a.button.action-apply[data-job-id="${dataID}"]`,
      ).attr("href");
      const views = $(parentEl).find(`p:contains("👀")`).text().trim();
      const applied = $(parentEl).find(`p:contains("✅")`).text().trim();

      // const {
      //   choices: [gptResponse],
      // } = await this.openai.chat.completions.create({
      //   messages: [
      //     {
      //       role: "user",
      //       content: `${secondaryParentElHtml}\n\nGo through this HTML markup and output a new HTML markup without any extra text and info with this structure: 1. Job Description (make a <div> with class name as job-description and place a <p> tag inside this div and place all the content about job description inside this <p> tag)\n2. Responsibilities (make a <div> with class name as job-responsibilities and place a <p> tag inside this div and place all the content about job responsibilities inside this <p> tag)\n3. Requirements (make a <div> with class name as job-requirements and place a <p> tag inside this div and place all the content about job requirements inside this <p> tag)\n4. Tech Stack (make a <div> with class name as job-tech-stack and place a <p> tag inside this div and place all the content about job tech stack inside this <p> tag)\n5. Benefits (make a <div> with class name as job-benefits and place a <p> tag inside this div and place all the content about job benefits inside this <p> tag)\n6. Salary (make a <div> with class name as job-salary and place a <p> tag inside this div and place all the content about job salary inside this <p> tag)\n\nPS: If any of the mentioned section is not available in the given markup, then do not produce the its resultant markup, skip it. And do no mention any kind of heading of the section inside <p> tag, just write its content.`,
      //     },
      //   ],
      //   model: "gpt-3.5-turbo",
      // });

      // const $details = cheerio.load(gptResponse.message.content);

      // const description = $details("div.job-description > p").text().trim();
      // const responsibilities = $details("div.job-responsibilities > p")
      //   .text()
      //   .trim();
      // const requirements = $details("div.job-requirements > p").text().trim();
      // const techStack = $details("div.job-tech-stack > p").text().trim();
      // const benefits = $details("div.job-benefits > p").text().trim();
      // const salary = $details("div.job-salary > p").text().trim();

      return {
        // description,
        // responsibilities,
        // requirements,
        // techStack,
        // benefits,
        // salary,
        // companyLink,
        applied,
        views,
        applyLink: `https://remoteok.com${applyLink}`,
      };
    } catch (error) {
      console.error(`Error fetching job details from ${dataURL}:`, error);
    }
  }
}
