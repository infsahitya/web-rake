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

  async crawl(url: string): ReturnType<typeof this.extractData> {
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

  private async extractData($: cheerio.CheerioAPI): Promise<JobProps[]> {
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

    // const jobsByCompany = jobs.reduce((acc, job) => {
    //   if (!acc[job.companyTitle]) acc[job.companyTitle] = [];

    //   acc[job.companyTitle].push(job);
    //   return acc;
    // }, {});

    return jobs;
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
      // const primaryParentEl = $(
      //   `tr.expand.expand-${dataID} div.description`,
      // );

      const secondaryParentEl = $(
        `tr.expand.expand-${dataID} div.description div.html`,
      );

      const companyLink = $(
        `tr.expand.expand-${dataID} div.description div.company_profile > p > a`,
      ).attr("href");
      const applyLink = $(
        `tr.expand.expand-${dataID} div.description a.button.action-apply[data-job-id="${dataID}"]`,
      ).attr("href");
      const views = $(
        `tr.expand.expand-${dataID} div.description p:contains("👀")`,
      )
        .text()
        .trim();
      const applied = $(
        `tr.expand.expand-${dataID} div.description p:contains("✅")`,
      )
        .text()
        .trim();

      console.log(secondaryParentEl.html());

      const {
        choices: [gptResponse],
      } = await this.openai.chat.completions.create({
        messages: [
          {
            role: "user",
            content: `${data}\n\nGo through this HTML markup and output a new HTML markup without any extra text and info with this structure: 1. Job Description (make a <div> with class name as job-description and place a <p> tag inside this div and place all the content about job description inside this <p> tag)\n2. Responsibilities (make a <div> with class name as job-responsibilities and place a <p> tag inside this div and place all the content about job responsibilities inside this <p> tag)\n3. Requirements (make a <div> with class name as job-requirements and place a <p> tag inside this div and place all the content about job requirements inside this <p> tag)\n4. Tech Stack (make a <div> with class name as job-tech-stack and place a <p> tag inside this div and place all the content about job tech stack inside this <p> tag)\n5. Benefits (make a <div> with class name as job-benefits and place a <p> tag inside this div and place all the content about job benefits inside this <p> tag)\n6. Salary (make a <div> with class name as job-salary and place a <p> tag inside this div and place all the content about job salary inside this <p> tag)\n\nPS: If any of the following section is not available in the given markup, then do not produce the resultant markup regarding it.`,
          },
        ],
        model: "gpt-3.5-turbo",
      });

      const $details = cheerio.load(gptResponse.message.content);

      const description = $details("div.job-description > p").text().trim();
      const responsibilities = $details("div.job-responsibilities > p")
        .text()
        .trim();
      const requirements = $details("div.job-requirements > p").text().trim();
      const techStack = $details("div.job-tech-stack > p").text().trim();
      const benefits = $details("div.job-benefits > p").text().trim();
      const salary = $details("div.job-salary > p").text().trim();

      return {
        description,
        responsibilities,
        requirements,
        techStack,
        benefits,
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
