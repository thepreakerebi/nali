/**
 * System and user prompts for lesson note generation agent
 */

export const LESSON_NOTE_GENERATION_SYSTEM_PROMPT = `You are an expert educational content creator specializing in creating detailed, comprehensive lesson notes for teachers worldwide.

Your expertise includes:
- Expanding lesson plans into full instructional content with step-by-step explanations
- Creating detailed teaching scripts and explanations that teachers can use directly in the classroom
- Incorporating culturally relevant examples and local context while drawing from global educational resources
- Providing practical activities, visuals, and evaluation tasks
- Ensuring content is pedagogically sound and aligned with international best practices
- Writing in a clear, accessible style appropriate for the grade level

When generating lesson notes:
1. Use the provided lesson plan as your foundation and template
2. Expand each section with detailed explanations, examples, and step-by-step instructions
3. Include culturally relevant examples and local context when possible, while also incorporating global educational methodologies
4. Provide practical teaching scripts that teachers can use verbatim or adapt
5. Include diverse activities, discussion questions, and interactive elements
6. Ensure content balances local curriculum requirements with international educational standards
7. Use clear, engaging language that maintains student attention
8. Include assessment strategies and evaluation criteria throughout

Generate comprehensive, detailed lesson notes that teachers can use directly in their classrooms, expanding lesson plans into full instructional content.`;

/**
 * User prompt template for lesson note generation
 */
export function getLessonNoteGenerationPrompt(params: {
  lessonPlanTitle: string;
  lessonPlanContent: string;
  lessonPlanObjectives?: string[];
  lessonPlanMethods?: string[];
  lessonPlanResources?: Array<{
    type: "youtube" | "document" | "link";
    title: string;
    url: string;
    description?: string;
  }>;
  topic: string;
  subject: string;
  gradeLevel: string;
  country?: string;
  region?: string;
  language?: "en" | "fr" | "rw";
  detailedResourcesContext?: string;
  similarNotesContext?: string;
  additionalContext?: string;
}) {
  const {
    lessonPlanTitle,
    lessonPlanContent,
    lessonPlanObjectives,
    lessonPlanMethods,
    lessonPlanResources,
    topic,
    subject,
    gradeLevel,
    country,
    region,
    language = "en",
    detailedResourcesContext,
    similarNotesContext,
    additionalContext,
  } = params;

  const languageNames: Record<"en" | "fr" | "rw", string> = {
    en: "English",
    fr: "French",
    rw: "Kinyarwanda",
  };

  let prompt = `Generate comprehensive, detailed lesson notes based on the following lesson plan:

**Lesson Plan Title:** ${lessonPlanTitle}
**Subject:** ${subject}
**Topic:** ${topic}
**Grade Level:** ${gradeLevel}
${country ? `**Country/Region:** ${country}${region ? `, ${region}` : ""}` : ""}
**Language:** ${languageNames[language]}

**Important Context:** ${country ? `While creating these lesson notes for ${country}${region ? ` (${region})` : ""}, ensure they align with local curriculum standards. However, also incorporate international educational best practices and standards to promote better learning outcomes. Balance local curriculum requirements with globally recognized pedagogical approaches.` : "Incorporate international educational best practices and standards to promote excellent learning outcomes. Use globally recognized pedagogical approaches while ensuring content is culturally appropriate and relevant."}

**Original Lesson Plan Content:**
${lessonPlanContent}

`;

  if (lessonPlanObjectives && lessonPlanObjectives.length > 0) {
    prompt += `**Learning Objectives (from lesson plan):**
${lessonPlanObjectives.map((obj, i) => `${i + 1}. ${obj}`).join("\n")}

`;
  }

  if (lessonPlanMethods && lessonPlanMethods.length > 0) {
    prompt += `**Instructional Methods (from lesson plan):**
${lessonPlanMethods.map((method, i) => `${i + 1}. ${method}`).join("\n")}

`;
  }

  if (lessonPlanResources && lessonPlanResources.length > 0) {
    prompt += `**Available Resources (from lesson plan):**
${lessonPlanResources.map((r, i) => `${i + 1}. ${r.title} (${r.type}): ${r.url}${r.description ? ` - ${r.description}` : ""}`).join("\n")}

`;
  }

  if (detailedResourcesContext) {
    prompt += `**Detailed Resource Content and Examples:**
${detailedResourcesContext}

`;
  }

  if (similarNotesContext) {
    prompt += `**Reference: Similar Lesson Notes (for inspiration, not to copy):**
${similarNotesContext}

`;
  }

  if (additionalContext) {
    prompt += `**Additional Context:**
${additionalContext}

`;
  }

  prompt += `**Instructions for Lesson Notes:**

1. Expand the lesson plan into comprehensive, detailed lesson notes that include:
   - **Introduction**: Engaging opening that captures student attention and sets the context
   - **Detailed Explanations**: Step-by-step explanations of key concepts with examples
   - **Teaching Scripts**: Practical scripts teachers can use verbatim or adapt
   - **Activities**: Detailed descriptions of interactive activities, discussions, and hands-on tasks
   - **Examples**: Multiple examples including culturally relevant local examples and international best practices
   - **Visual Aids**: Suggestions for diagrams, charts, images, or multimedia to use
   - **Assessment**: Embedded assessment strategies and evaluation criteria throughout
   - **Conclusion**: Summary and reinforcement of key learning points

2. Ensure the lesson notes:
   ${country ? `- Are aligned with ${country} curriculum standards for ${subject} at ${gradeLevel} level while incorporating international best practices` : `- Follow international best practices and standards for ${subject} at ${gradeLevel} level`}
   - Provide practical, actionable content teachers can use directly in the classroom
   - Include culturally relevant examples and local context where appropriate, while also drawing from global educational resources
   - Use engaging, clear language appropriate for the grade level
   - Incorporate diverse learning activities to engage different learning styles
   - Include assessment strategies aligned with both local requirements and international standards

3. Structure the content in a clear, organized format suitable for classroom delivery.

4. Make the notes comprehensive enough that a teacher can use them as a complete teaching guide, but also flexible enough to adapt to their teaching style.

Generate the detailed lesson notes content now.`;

  return prompt;
}

