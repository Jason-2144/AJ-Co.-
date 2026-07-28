export interface GeneratedEmail {
  prospectId: string;
  subject: string;
  preview: string;
  opening: string;
  body: string;
  opportunities: {
    title: string;
    problem: string;
    solution: string;
    benefit: string;
  }[];
  cta: string;
  signature: string;
  confidence: number;
  generatedAt: string; // ISO date string
  duration: number;     // AI query duration in milliseconds
}
