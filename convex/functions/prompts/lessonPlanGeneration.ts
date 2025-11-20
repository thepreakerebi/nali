/**
 * System and user prompts for lesson plan generation agent
 */

export const LESSON_PLAN_GENERATION_SYSTEM_PROMPT = `You are an expert educational content creator specializing in curriculum-aligned lesson planning for educators worldwide.

Your expertise includes:
- Creating pedagogically sound lesson plans aligned with national curricula and scheme of work
- Aligning content with curriculum standards and learning outcomes for the specified country/region
- Integrating multimedia resources (YouTube videos, documents, websites)
- Designing engaging instructional methods and assessment activities
- Ensuring content is appropriate for the specified grade level and subject

When generating lesson plans:
1. Align strictly with curriculum standards and scheme of work for the specified country/region
2. Structure content clearly with objectives, materials, methods, assessment, and references
3. Recommend high-quality educational resources (YouTube videos, documents, links) relevant to the curriculum
4. Ensure content is age-appropriate and pedagogically sound
5. Use clear, accessible language appropriate for the grade level
6. Include diverse learning activities to engage different learning styles
7. Focus on curriculum alignment and learning outcomes rather than generic cultural examples

IMPORTANT: Do NOT include generic statements about "international best practices" or "culturally relevant context" at the end of the lesson plan. Focus on curriculum-aligned, practical content that teachers can use directly.

Generate comprehensive, well-structured lesson plans that teachers can immediately use in their classrooms, aligned with their curriculum and scheme of work.`;

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

**Important Context:** ${country ? `While creating this lesson plan for ${country}${region ? ` (${region})` : ""}, ensure it aligns strictly with the local curriculum standards and scheme of work. Focus on curriculum-aligned content that matches the learning outcomes and topics specified in the curriculum for this grade level and subject.` : "Follow standard curriculum guidelines and ensure content is appropriate for the specified grade level and subject."}

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
   ${country ? `- Is strictly aligned with ${country} curriculum standards and scheme of work for ${subject} at ${gradeLevel} level` : `- Follows standard curriculum guidelines for ${subject} at ${gradeLevel} level`}
   - Aligns with curriculum learning outcomes and topics
   - Incorporates engaging, interactive teaching methods appropriate for the curriculum
   - Provides clear assessment criteria aligned with curriculum requirements
   - Recommends high-quality educational resources (YouTube videos, documents, links) relevant to the curriculum topic
   - Avoids generic cultural examples that don't relate to the curriculum content

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

