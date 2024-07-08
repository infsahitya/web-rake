import * as cheerio from "cheerio";
import * as tough from "tough-cookie";
import { Injectable } from "@nestjs/common";
import { wrapper } from "axios-cookiejar-support";
import LoggerService from "../logger/logger.service";
import axios, { AxiosInstance, AxiosResponse } from "axios";

@Injectable()
export default class CrawlerService {
  private axiosInstance: AxiosInstance;

  constructor(private readonly logger: LoggerService) {
    this.axiosInstance = wrapper(
      axios.create({
        withCredentials: true,
        jar: new tough.CookieJar(),
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3",
        },
      }),
    );
  }

  async crawl(url: string): Promise<Record<string, JobProps[]>> {
    try {
      const data = await this.fetchWithRedirects(url);
      const $ = cheerio.load(data);

      const result = this.extractData($);
      return result;
    } catch (error) {
      console.error(`Error fetching data from ${url}:`, error);
      throw error;
    }
  }

  private async fetchWithRedirects(
    url: string,
    maxRedirects = 5,
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

  private async extractData(
    $: cheerio.CheerioAPI,
  ): Promise<Record<string, JobProps[]>> {
    const jobs = [];
    const jobElements = $("tr.job");

    for (const elementSource of jobElements.toArray()) {
      const job = this.extractJob($, elementSource);
      if (job) {
        const jobDetails = await this.fetchJobDetails(job);
        jobs.push({ ...job, ...jobDetails });
        // jobs.push(job);
      }
    }

    const jobsByCompany = jobs.reduce((acc, job) => {
      if (!acc[job.companyTitle]) acc[job.companyTitle] = [];

      acc[job.companyTitle].push(job);
      return acc;
    }, {});

    return jobsByCompany;
  }

  private extractJob(
    $: cheerio.CheerioAPI,
    elementSource: cheerio.Element,
  ): PrimaryJobProps {
    const el = $(elementSource);

    const url = el.attr("data-url");
    const dataID = el.attr("data-id");
    const dataSlug = el.attr("data-slug");
    const companyImage = el
      .find("td.image.has-logo > a > img.logo")
      .attr("data-src");
    const jobTitle = el
      .find('td.company > a[itemprop="url"] > h2[itemprop="title"]')
      .text()
      .trim();
    const companyTitle = el
      .find('span[itemprop="hiringOrganization"] > h3[itemprop="name"]')
      .text()
      .trim();
    const tags = el
      .find(".tags .tag")
      .map((_, el) => $(el).text().trim())
      .get();

    if (jobTitle && companyTitle && url) {
      return {
        tags,
        dataID,
        dataSlug,
        jobTitle,
        companyImage,
        companyTitle,
        url: `https://remoteok.com${url}`,
      };
    }
    return null;
  }

  private async fetchJobDetails(
    job: PrimaryJobProps,
  ): Promise<SecondaryJobProps> {
    const { dataID, url } = job;

    try {
      const { data } = await this.axiosInstance.get(url);
      const $ = cheerio.load(data);
      const primaryParentEl = $(
        `tr[class="expand expand-${dataID}"] div[itemprop="description"]`,
      );

      const secondaryParentEl = primaryParentEl.find("div.html");

      const salary = secondaryParentEl
        .find('h1:contains("Salary")')
        .next()
        .next()
        .text()
        .trim();

      const companyLink = $("div.company_profile > p > a").attr("href");
      const applyLink = $(
        `a.button.action-apply[data-job-id="${dataID}"]`,
      ).attr("href");
      const viewsText = $('p:contains("👀")').text().trim();
      const appliedText = $('p:contains("✅")').text().trim();

      const viewsMatch = viewsText.match(/👀\s([\d,]+)\sviews/);
      const appliedMatch = appliedText.match(/✅\s([\d,]+)\sapplied/);
      const views = viewsMatch ? viewsMatch[1] : null;
      const applied = appliedMatch ? appliedMatch[1] : null;

      return {
        description: "",
        responsibilities: [],
        requirements: [],
        techStack: [],
        benefits: [],
        salary,
        companyLink,
        applied,
        views,
        applyLink,
      };
    } catch (error) {
      console.error(`Error fetching job details from ${url}:`, error);
      return {};
    }
  }
}
