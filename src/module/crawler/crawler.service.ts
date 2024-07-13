import * as cheerio from "cheerio";
import * as tough from "tough-cookie";
import { Injectable } from "@nestjs/common";
import { wrapper } from "axios-cookiejar-support";
import axios, { AxiosInstance, AxiosResponse } from "axios";

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
    const maxOffset: number = 30;

    while (offsetValue <= maxOffset) {
      try {
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
      } catch (error) {
        console.error(`Error fetching data:`, error);
        offsetValue += offsetJump;
        continue;
      }
    }

    console.log(
      `Extracted ${result.length} jobs with current offset value of ${offsetValue}`,
    );

    return result;
  }

  private async extractData($: cheerio.CheerioAPI): Promise<JobProps[]> {
    const jobs: JobProps[] = [];
    const jobElements = $("tr.job");

    for (const elementSource of jobElements.toArray()) {
      const job = this.extractJob($, elementSource);
      if (job) {
        jobs.push(job);
      }
    }

    return jobs;
  }

  private extractJob(
    $: cheerio.CheerioAPI,
    elementSource: cheerio.Element,
  ): JobProps {
    const el = $(elementSource);

    const scriptTag = el.find('script[type="application/ld+json"]').html();
    if (!scriptTag) {
      console.log("No script tag found");
      return null;
    }

    const jobData = JSON.parse(scriptTag);

    const skillsAndTags =
      el
        .find(".tags .tag")
        .map((_, tag) => $(tag).text().trim())
        .toArray() || [];

    const applicantLocationRequirements = Array.isArray(
      jobData.applicantLocationRequirements,
    )
      ? jobData.applicantLocationRequirements
          .map((location: any) => location?.name)
          .join(", ")
      : jobData.applicantLocationRequirements?.name;

    const job: JobProps = {
      datePosted: jobData.datePosted,
      description: jobData.description || null,
      baseSalary_minValue: jobData.baseSalary.value?.minValue || null,
      baseSalary_maxValue: jobData.baseSalary.value?.maxValue || null,
      employmentType: jobData.employmentType || null,
      industry: jobData.industry || null,
      jobLocationType: jobData.jobLocationType || null,
      applicantLocationRequirements: applicantLocationRequirements,
      title: jobData.title || null,
      image: jobData.hiringOrganization.logo?.url || null,
      occupationalCategory: jobData.occupationalCategory || null,
      workHours: jobData.workHours || null,
      validThrough: jobData.validThrough || null,
      hiringOrganization_name: jobData.hiringOrganization?.name || null,
      hiringOrganization_url: jobData.hiringOrganization?.url || null,
      hiringOrganization_logo: jobData.hiringOrganization?.logo?.url || null,
      directApply: jobData.directApply || null,
      data_slug: el.attr("data-slug") || null,
      data_url: el.attr("data-url") || null,
      data_company: jobData.hiringOrganization?.name || null,
      data_id: el.attr("data-id") || null,
      data_search:
        el.attr("data-search").split(" [")[0] ||
        el.attr("data-search").split(" {")[0] ||
        null,
      tags: skillsAndTags,
      skills: skillsAndTags,
      jobBenefits: jobData.jobBenefits || null,
      applyLink: $(
        `a.button.action-apply[data-job-id="${el.attr("data-id")}"]`,
      ).attr("href"),
    };

    return job;
  }
}
