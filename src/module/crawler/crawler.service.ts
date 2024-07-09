import OpenAI from "openai";
import * as cheerio from "cheerio";
import * as tough from "tough-cookie";
import { ConfigType } from "@nestjs/config";
import envConfig from "src/config/env.config";
import { wrapper } from "axios-cookiejar-support";
import { Inject, Injectable } from "@nestjs/common";
import axios, { AxiosInstance, AxiosResponse } from "axios";

@Injectable()
export default class CrawlerService {
  private axiosInstance: AxiosInstance;
  private openai: OpenAI;

  constructor(
    @Inject(envConfig.KEY)
    private readonly envConfigService: ConfigType<typeof envConfig>,
  ) {
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

    this.openai = new OpenAI({ apiKey: envConfigService.OPENAI_API_KEY });
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

      const companyLink = primaryParentEl
        .find("div.company_profile > p > a")
        .attr("href");
      const applyLink = primaryParentEl
        .find(`a.button.action-apply[data-job-id="${dataID}"]`)
        .attr("href");
      const views = primaryParentEl.find('p:contains("👀")').text().trim();
      const applied = primaryParentEl.find('p:contains("✅")').text().trim();

      try {
        const data = await this.openai.chat.completions.create({
          messages: [
            {
              role: "user",
              content: `${secondaryParentEl.text()}\n\nExtract the following details from this markup: 1. Job Description\n2. Responsibilities\n3. Requirements\n4. Tech Stack\n5. Benefits\n6. Salary`,
            },
          ],
          model: "gpt-3.5-turbo",
        });

        console.log(data.choices[0]);
      } catch (error) {
        console.log(error);
      }

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
        applyLink: `https://remoteok.com/${applyLink}`,
      };
    } catch (error) {
      console.error(`Error fetching job details from ${url}:`, error);
      return {};
    }
  }
}
