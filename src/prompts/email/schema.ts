export const emailSchema = {
  subject: "A compelling, short subject line. Under 6 words. Never clickbaity.",
  preview: "An engaging preview text snippet (1 sentence) summarizing the core value hook.",
  opening: "A personalized, friendly opening sentence addressing the prospect. Sound human and professional.",
  body: "The main body of the email. Keep it concise. Focus on the value of optimizing their operations.",
  opportunities: [
    {
      title: "Title of opportunity 1",
      problem: "The current operational challenge or bottleneck identified from their business model.",
      solution: "How a custom AI automation or LLM workflow would solve this challenge.",
      benefit: "The tangible business benefit (e.g. saves 15 hours/week, cuts error rates by 40%)."
    },
    {
      title: "Title of opportunity 2",
      problem: "The current operational challenge or bottleneck identified from their business model.",
      solution: "How a custom AI automation or LLM workflow would solve this challenge.",
      benefit: "The tangible business benefit."
    },
    {
      title: "Title of opportunity 3",
      problem: "The current operational challenge or bottleneck identified from their business model.",
      solution: "How a custom AI automation or LLM workflow would solve this challenge.",
      benefit: "The tangible business benefit."
    }
  ],
  cta: "A clear, low-friction call-to-action inviting them to a brief chat. Never sound aggressive.",
  signature: "A friendly professional sign-off (e.g., 'Best regards,', 'Sincerely,') followed by the sender placeholder 'AJ & Co. Outreach Team'.",
  confidence: 85
};
export default emailSchema;
