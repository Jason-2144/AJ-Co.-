export interface CompanyAnalysis {
  prospectId: string;
  companySummary: string;
  industry: string;
  businessModel: string;
  targetCustomers: string;
  products: string[];
  services: string[];
  technologies: string[];
  painPoints: string[];
  aiOpportunities: {
    title: string;
    description: string;
    estimatedImpact: string;
  }[];
  confidence: number;
  generatedAt: string; // ISO date string
  duration: number;     // AI query duration in milliseconds
}
