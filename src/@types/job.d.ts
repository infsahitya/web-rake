interface JobProps {
  datePosted: string;
  salary: {
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
  jobTitle: string;
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
  dataID: string;
  dataSlug: string;
  dataURL: string;
  dataSearch: string;
  applyLink: string;
  tags: string[];
}
