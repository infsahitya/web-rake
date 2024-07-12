interface JobProps {
  datePosted: string;
  baseSalary: {
    "@type": string;
    currency: string;
    value: {
      "@type": string;
      minValue: number;
      maxValue: number;
      unitText: string;
    };
  };
  employmentType: string;
  industry: string;
  jobLocationType: string;
  applicantLocationRequirements: {
    "@type": string;
    name: string;
  };
  jobLocation: {
    address: {
      "@type": string;
      addressCountry: string;
      addressRegion: string;
      streetAddress: string;
      postalCode: string;
      addressLocality: string;
    };
  };
  title: string;
  occupationalCategory: string;
  workHours: string;
  validThrough: string;
  hiringOrganization: {
    "@type": string;
    name: string;
    url: string;
    sameAs: string;
    logo: {
      "@type": string;
      url: string;
    };
  };
  description: string;
  jobBenefits: string;
  data_id: string;
  data_slug: string;
  data_url: string;
  data_search: string;
  applyLink: string;
  tags: string[];
  skills: string[];
  directApply: string;
}
