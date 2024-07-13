// interface JobProps {
//   datePosted: string;
//   baseSalary_minValue: number,
//   baseSalary_maxValue: number,
//   employmentType: string;
//   industry: string;
//   jobLocationType: string;
//   applicantLocationRequirements: {
//     "@type": string;
//     name: string;
//   };
//   jobLocation: {
//     address: {
//       "@type": string;
//       addressCountry: string;
//       addressRegion: string;
//       streetAddress: string;
//       postalCode: string;
//       addressLocality: string;
//     };
//   };
//   title: string;
//   occupationalCategory: string;
//   workHours: string;
//   validThrough: string;
//   hiringOrganization: {
//     "@type": string;
//     name: string;
//     url: string;
//     sameAs: string;
//     logo: {
//       "@type": string;
//       url: string;
//     };
//   };
//   description: string;
//   jobBenefits: string;
//   data_id: string;
//   data_slug: string;
//   data_url: string;
//   data_search: string;
//   applyLink: string;
//   tags: string[];
//   skills: string[];
//   directApply: string;
// }

interface JobProps {
  datePosted: string;
  description: string | null;
  baseSalary_minValue: number | null;
  baseSalary_maxValue: number | null;
  employmentType: string | null;
  industry: string | null;
  jobLocationType: string | null;
  applicantLocationRequirements: string | null;
  title: string | null;
  image: string | null;
  occupationalCategory: string | null;
  workHours: string | null;
  validThrough: string | null;
  hiringOrganization_name: string | null;
  hiringOrganization_url: string | null;
  hiringOrganization_logo: string | null;
  directApply: boolean | null;
  data_slug: string | null;
  data_url: string | null;
  data_company: string | null;
  data_id: string | null;
  data_search: string | null;
  tags: string[];
  skills: string[];
  jobBenefits: string | null;
  applyLink: string | null;
}
