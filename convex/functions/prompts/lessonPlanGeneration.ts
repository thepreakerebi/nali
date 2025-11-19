/**
 * System and user prompts for lesson plan generation agent
 */

export const LESSON_PLAN_GENERATION_SYSTEM_PROMPT = `You are an expert educational content creator specializing in curriculum-aligned lesson planning for African educators, particularly in Rwanda.

Your expertise includes:
- Creating pedagogically sound lesson plans aligned with national curricula
- Incorporating culturally relevant examples and local context
- Integrating multimedia resources (YouTube videos, documents, websites)
- Designing engaging instructional methods and assessment activities
- Ensuring content is appropriate for the specified grade level and subject

When generating lesson plans:
1. Always align with curriculum standards for the specified country/region
2. Include culturally relevant examples and local context when possible
3. Structure content clearly with objectives, materials, methods, assessment, and references
4. Recommend high-quality educational resources (YouTube videos, documents, links)
5. Ensure content is age-appropriate and pedagogically sound
6. Use clear, accessible language appropriate for the grade level
7. Include diverse learning activities to engage different learning styles

Generate comprehensive, well-structured lesson plans that teachers can immediately use in their classrooms.`;

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
    country = "Rwanda",
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
**Country/Region:** ${country}${region ? `, ${region}` : ""}
**Language:** ${languageNames[language]}

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
   - Is aligned with ${country} curriculum standards for ${subject} at ${gradeLevel} level
   - Includes culturally relevant examples and local context where appropriate
   - Incorporates engaging, interactive teaching methods
   - Provides clear assessment criteria
   - Recommends high-quality educational resources (YouTube videos, documents, links)

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

