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
    const jobs: JobProps[] = [];
    const jobElements = $("tr.job");

    for (const elementSource of jobElements.toArray()) {
      const job = this.extractJob($, elementSource);
      if (job) {
        const jobDetails = await this.fetchJobDetails(job.url);
        jobs.push({ ...job, ...jobDetails });
      }
    }

    const jobsByCompany = jobs.reduce((acc, job) => {
      if (!acc[job.company]) acc[job.company] = [];

      acc[job.company].push(job);
      return acc;
    }, {});

    return jobsByCompany;
  }

  private extractJob(
    $: cheerio.CheerioAPI,
    elementSource: cheerio.Element,
  ): JobProps {
    const el = $(elementSource);

    const jobTitle = el.find('h2[itemprop="title"]').text().trim();
    const company = el.find('h3[itemprop="name"]').text().trim();
    const location = el.find(".location").first().text().trim();
    const salary = el.find(".location").last().text().trim();
    const tags = el
      .find(".tags .tag")
      .map((_, el) => $(el).text().trim())
      .get();
    const url = el.find('a[itemprop="url"]').attr("href");

    if (jobTitle && company && url) {
      return {
        jobTitle,
        company,
        location,
        salary,
        tags,
        url: `https://remoteok.com${url}`,
      };
    }
    return null;
  }

  private async fetchJobDetails(url: string): Promise<Partial<JobProps>> {
    try {
      const { data } = await this.axiosInstance.get(url);
      const $ = cheerio.load(data);

      const description = $("#job-description").text().trim();
      const responsibilities = $(
        "#job-description strong:contains('Key Responsibilities')",
      )
        .next("ul")
        .find("li")
        .map((_, el) => $(el).text().trim())
        .get();
      const requirements = $("#job-description strong:contains('Requirements')")
        .next("ul")
        .find("li")
        .map((_, el) => $(el).text().trim())
        .get();
      const techStack = $("#job-description strong:contains('Our Stack')")
        .next("p")
        .text()
        .split(",")
        .map((tech) => tech.trim());
      const benefits = $("#job-description strong:contains('Benefits')")
        .next("div")
        .find("li")
        .map((_, el) => $(el).text().trim())
        .get();
      const salaryMatch = data.match(
        /baseSalary":{"@type":"MonetaryAmount","currency":"USD","value":{.*?"minValue":(\d+),"maxValue":(\d+)/,
      );
      const salary = salaryMatch
        ? `$${salaryMatch[1]} - $${salaryMatch[2]}`
        : "";

      return {
        description,
        responsibilities,
        requirements,
        techStack,
        benefits,
        salary,
      };
    } catch (error) {
      console.error(`Error fetching job details from ${url}:`, error);
      return {};
    }
  }
}
