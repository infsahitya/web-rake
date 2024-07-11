interface JobProps {
  url: string;
  dataSlug: string;
  tags: string[];
  dataID: string;
  salary: string;
  companyImage: string;
  companyTitle: string;
  jobTitle: string;
  location: string;
  benefits: string;
  // benefits: string[];
  techStack: string;
  // techStack: string[];
  description: string;
  // requirements: string[];
  requirements: string;
  // responsibilities: string[];
  responsibilities: string;
  companyLink: string;
  applyLink: string;
  views: string;
  applied: string;
}

type PrimaryJobProps = Pick<
  JobProps,
  | "tags"
  | "dataSlug"
  | "dataID"
  | "jobTitle"
  | "companyImage"
  | "companyTitle"
  | "url"
>;

type SecondaryJobProps = Partial<Omit<JobProps, keyof PrimaryJobProps>>;
