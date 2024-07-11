// import OpenAI from "openai";
import * as cheerio from "cheerio";
import * as tough from "tough-cookie";
import { Injectable } from "@nestjs/common";
import { wrapper } from "axios-cookiejar-support";
import axios, { AxiosInstance, AxiosResponse } from "axios";

type PrimaryJobProps = Omit<JobProps, "applyLink" | "views" | "applied">;
type SecondaryJobProps = Omit<JobProps, keyof PrimaryJobProps>;

@Injectable()
export default class CrawlerService {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = wrapper(
      axios.create({
        withCredentials: true,
        jar: new tough.CookieJar(),
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
      }),
    );
  }

  private async fetchWithRedirects(
    url: string,
    maxRedirects = 10,
  ): Promise<string> {
    let redirects = 0;
    let response: AxiosResponse<any>;

    while (redirects < maxRedirects) {
      response = await this.axiosInstance.get(url, {
        validateStatus: (status) => status < 400 || status === 302,
      });

      if (response.status === 302) {
        url = response.headers.location;
        redirects++;
      } else {
        return response.data;
      }
    }

    throw new Error("Maximum number of redirects exceeded");
  }

  async crawl(): Promise<JobProps[]> {
    const result: JobProps[] = [];

    let offsetValue: number = 15;
    const offsetJump: number = 15;
    const maxOffset: number = 500;

    try {
      while (offsetValue <= maxOffset) {
        console.log(`Current Offset - ${offsetValue}`);

        const data = await this.fetchWithRedirects(
          `https://remoteok.com/?&action=get_jobs&offset=${offsetValue}`,
        );

        const $ = cheerio.load(`<table>${data.trim()}</table>`);

        const extractedData = await this.extractData($);
        if (extractedData.length === 0) break;

        result.push(...extractedData);
        offsetValue += offsetJump;

        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error(`Error fetching data:`, error);
      throw error;
    }

    return result;
  }

  private async extractData($: cheerio.CheerioAPI): Promise<JobProps[]> {
    const jobs: JobProps[] = [];
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
  ): PrimaryJobProps | null {
    const el = $(elementSource);

    const scriptTag = el.find('script[type="application/ld+json"]').html();
    if (!scriptTag) {
      console.log("No script tag found");
      return null;
    }

    const jobData = JSON.parse(scriptTag);

    return {
      datePosted: jobData.datePosted,
      validThrough: jobData.validThrough || null,
      dataID: el.attr("data-id") || null,
      jobTitle: jobData.title || null,
      jobLocation: jobData.jobLocation || null,
      dataSlug: el.attr("data-slug") || null,
      dataURL: `https://remoteok.com${el.attr("data-url")}` || null,
      dataSearch: el.attr("data-search") || null,
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
      const views = $(parentEl).find(`p:contains("👀")`).text().trim() || null;
      const applied =
        $(parentEl).find(`p:contains("✅")`).text().trim() || null;

      return {
        views,
        applied,
        applyLink: `https://remoteok.com${applyLink}`,
      };
    } catch (error) {
      console.error(`Error fetching job details from ${dataURL}:`, error);
      return {
        views: null,
        applied: null,
        applyLink: null,
      };
    }
  }
}
