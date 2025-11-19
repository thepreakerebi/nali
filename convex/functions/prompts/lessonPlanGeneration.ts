/**
 * System and user prompts for lesson plan generation agent
 */

export const LESSON_PLAN_GENERATION_SYSTEM_PROMPT = `You are an expert educational content creator specializing in curriculum-aligned lesson planning for educators worldwide.

Your expertise includes:
- Creating pedagogically sound lesson plans aligned with national curricula while incorporating international best practices
- Incorporating culturally relevant examples and local context
- Integrating multimedia resources (YouTube videos, documents, websites)
- Designing engaging instructional methods and assessment activities
- Ensuring content is appropriate for the specified grade level and subject

When generating lesson plans:
1. Align with curriculum standards for the specified country/region while incorporating international educational standards and best practices
2. Include culturally relevant examples and local context when possible, but also draw from global educational resources and methodologies
3. Structure content clearly with objectives, materials, methods, assessment, and references
4. Recommend high-quality educational resources (YouTube videos, documents, links) from both local and international sources
5. Ensure content is age-appropriate and pedagogically sound according to international standards
6. Use clear, accessible language appropriate for the grade level
7. Include diverse learning activities to engage different learning styles
8. Balance local curriculum requirements with international best practices to promote better learning outcomes

Generate comprehensive, well-structured lesson plans that teachers can immediately use in their classrooms, combining local curriculum alignment with international educational excellence.`;

/**
 * User prompt template for lesson plan generation
 */
export function getLessonPlanGenerationPrompt(params: {
  topic: string;
  subject: string;
  gradeLevel: string;
  academicYear: string;
  objectives?: string[];
  country?: string;
  region?: string;
  language?: "en" | "fr" | "rw";
  similarPlansContext?: string;
  curriculumResources?: string;
}) {
  const {
    topic,
    subject,
    gradeLevel,
    academicYear,
    objectives,
    country,
    region,
    language = "en",
    similarPlansContext,
    curriculumResources,
  } = params;

  const languageNames: Record<"en" | "fr" | "rw", string> = {
    en: "English",
    fr: "French",
    rw: "Kinyarwanda",
  };

  let prompt = `Generate a comprehensive lesson plan for the following:

**Subject:** ${subject}
**Topic:** ${topic}
**Grade Level:** ${gradeLevel}
**Academic Year:** ${academicYear}
${country ? `**Country/Region:** ${country}${region ? `, ${region}` : ""}` : ""}
**Language:** ${languageNames[language]}

**Important Context:** ${country ? `While creating this lesson plan for ${country}${region ? ` (${region})` : ""}, ensure it aligns with the local curriculum standards. However, also incorporate international educational best practices and standards to promote better learning outcomes. Balance local curriculum requirements with globally recognized pedagogical approaches.` : "Incorporate international educational best practices and standards to promote excellent learning outcomes. Use globally recognized pedagogical approaches while ensuring content is culturally appropriate and relevant."}

`;

  if (objectives && objectives.length > 0) {
    prompt += `**Learning Objectives (to be included):**
${objectives.map((obj, i) => `${i + 1}. ${obj}`).join("\n")}

`;
  }

  if (curriculumResources) {
    prompt += `**Available Curriculum Resources:**
${curriculumResources}

`;
  }

  if (similarPlansContext) {
    prompt += `**Reference: Similar Lesson Plans (for inspiration, not to copy):**
${similarPlansContext}

`;
  }

  prompt += `**Instructions:**
1. Create a detailed lesson plan that includes:
   - Clear learning objectives (${objectives && objectives.length > 0 ? "incorporating the provided objectives" : "create appropriate objectives"})
   - Required materials and resources (including recommended YouTube videos, documents, and educational websites)
   - Step-by-step instructional methods
   - Assessment activities to evaluate student understanding
   - References and sources

2. Ensure the lesson plan:
   ${country ? `- Is aligned with ${country} curriculum standards for ${subject} at ${gradeLevel} level while incorporating international best practices` : `- Follows international best practices and standards for ${subject} at ${gradeLevel} level`}
   - Includes culturally relevant examples and local context where appropriate, while also drawing from global educational resources
   - Incorporates engaging, interactive teaching methods based on international pedagogical research
   - Provides clear assessment criteria aligned with both local requirements and international standards
   - Recommends high-quality educational resources (YouTube videos, documents, links) from both local and international sources

3. Structure the content in a clear, organized format suitable for classroom use.

4. When recommending resources, prioritize:
   - Educational YouTube videos relevant to the topic
   - Official curriculum documents and educational websites
   - Age-appropriate and pedagogically sound materials

Generate the lesson plan content now.`;

  return prompt;
}

/**
 * Prompt for extracting structured metadata from generated lesson plan
 */
export const LESSON_PLAN_EXTRACTION_PROMPT = `Extract structured information from the lesson plan content. Identify:
- Learning objectives (as an array of clear, measurable objectives)
- Required materials (as an array of materials and resources needed)
- Instructional methods (as an array of teaching methods and activities)
- Assessment activities (as an array of assessment methods and evaluation criteria)
- References and sources (as an array of citations and reference materials)
- Resources (as an array of recommended resources including YouTube videos, documents, and links with their types, titles, URLs, and descriptions)

Ensure all extracted information is accurate and complete.`;

