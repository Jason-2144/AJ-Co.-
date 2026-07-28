export const emailExamples = `
Example 1:
Analysis Input:
{
  "companySummary": "Flip Health provides mobile-first digital healthcare consultations and automated patient support services in Hyderabad.",
  "industry": "Healthcare",
  "businessModel": "B2C Mobile consultations",
  "targetCustomers": "Patients seeking quick, remote healthcare guidance",
  "products": ["Flip Consultation App"],
  "services": ["Telehealth consulting"],
  "painPoints": ["High operational costs of manually triaging user medical queries", "Slow response time during peak hours", "Manual appointment tracking"],
  "aiOpportunities": [
    {"title": "Automated Medical Triage", "description": "Implement a chatbot to classify patient urgency levels based on symptoms.", "estimatedImpact": "High"},
    {"title": "AI Consultation Synthesizer", "description": "Summarize doctor-patient conversations into medical charts automatically.", "estimatedImpact": "High"},
    {"title": "Smart Scheduler", "description": "Automate booking and cancelations dynamically.", "estimatedImpact": "Medium"}
  ]
}

Expected Output JSON:
{
  "subject": "Optimizing patient triage for Flip Health",
  "preview": "How custom AI workflows can streamline consultations and reduce patient wait times.",
  "opening": "Hi team,",
  "body": "I came across Flip Health's mobile consultation app and was impressed by how you are improving healthcare access in Hyderabad. Managing patient triaging manually can become a bottleneck during peak hours, and we specialize in building light-touch automation to solve exactly that.",
  "opportunities": [
    {
      "title": "Automated Symptoms Triage",
      "problem": "Manual triage slows down consultations and increases overhead costs.",
      "solution": "Deploy a lightweight conversational assistant to capture and classify patient symptoms.",
      "benefit": "Saves up to 10 hours per triage shift while cutting response times down to seconds."
    },
    {
      "title": "AI Conversation Summaries",
      "problem": "Doctors spend valuable minutes typing notes and medical charts after each call.",
      "solution": "Use audio transcription to automatically draft doctor-patient summaries.",
      "benefit": "Saves 3-5 minutes per consultation, allowing doctors to focus entirely on patient care."
    },
    {
      "title": "Smart Calendar Scheduler",
      "problem": "Manual booking systems result in empty slots from last-minute cancelations.",
      "solution": "Integrate an automated SMS scheduler to notify waitlisted patients.",
      "benefit": "Reduces scheduling gaps and improves doctor utilization by 15%."
    }
  ],
  "cta": "Would you be open to a quick 10-minute call next Tuesday to see how we can build this for you?",
  "signature": "Best regards,\\n\\nAJ & Co. Outreach Team",
  "confidence": 95
}
`;
export default emailExamples;
