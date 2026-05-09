# Evaluation Report: BP & AF Insurance Broker CRM Prompts

## 1. Executive Summary
I have reviewed the three prompts provided for the **BP & AF Insurance Broker CRM** project. 

The prompts are exceptionally well-crafted. They progress logically from **high-level architectural planning** to **detailed field mapping/UX analysis**, and finally to **concrete frontend implementation**. They provide strong constraints, clear personas, and highly structured output requirements. 

These prompts are **perfectly workable** for advanced LLMs (like Claude 3.5 Sonnet, Gemini 1.5 Pro, or GPT-4o) and will yield high-quality, production-ready outputs.

Below is the detailed evaluation of each prompt.

---

## 2. Evaluation of Prompt 1: Architecture & Implementation Plan
**Objective:** Create a comprehensive implementation plan for transforming the current system into a unified CRM.

### Strengths:
* **Clear Persona & Context:** Sets the stage perfectly by acting as a senior product architect. Outlining the "Current-State" vs "Future-State" provides the exact context an AI needs to avoid generating generic CRM advice.
* **Highly Structured Output (A-R):** Demanding specific sections forces the AI to be organized and exhaustive. 
* **Strict Constraints:** "Do not write production code" and "Reuse the current platform where possible" are critical guardrails that prevent the AI from generating useless boilerplate code or suggesting a complete rewrite.
* **Business-Centric Logic:** Recognizing that GMC and Fleet are "specialized engines" rather than standalone apps shows deep domain understanding, which forces the AI to design a modular architecture.

### Workability: **Perfect**
The AI will generate an outstanding architectural roadmap. The enforcement of "Minimum Must-Have MVP" at the end ensures actionable takeaways for the engineering team.

---

## 3. Evaluation of Prompt 2: Field-Mapping & Feature Plan
**Objective:** Extract fields and workflows from reference systems (screenshots) and map them to the new unified CRM architecture.

### Strengths:
* **Clear Anti-Patterns:** Instructions like "Do not simply clone the old systems screen by screen" and "Do not flatten everything into one giant form" prevent the AI from making lazy, 1-to-1 copies of legacy UI.
* **Exhaustive Scope:** Listing out the exact fields expected (e.g., IMT selections, IDV, engine protector, nominee details) gives the AI a powerful checklist to cross-reference against the screenshots.
* **OCR-First Approach:** Dedicating a massive section to OCR logic (confidence scores, field mapping, pre-filling, human review) ensures that AI integrations are treated as first-class citizens in the architecture, rather than an afterthought.
* **Output Structure:** The logical flow from Section A to Section K ensures that the AI categorizes the massive amount of data intelligently.

### Workability: **Perfect**
*(Note: To execute this prompt, ensure you attach the actual reference screenshots/documents so the AI has the visual data to extract from.)*

---

## 4. Evaluation of Prompt 3: Frontend Implementation (Add Customer Page)
**Objective:** Build the "Manual Add Customer" page inside the new CRM architecture.

### Strengths:
* **Actionable and Specific:** Shifts the persona from planning to execution seamlessly. The route structure, page layout, and collapsible sections are highly detailed.
* **Conditional Logic:** Clearly defines how the form should react based on the "Individual" vs "Corporate" selection.
* **Integration Focus:** Mandates integration with the existing `Customer Master`, existing components, and existing routing, rather than building an isolated sandbox component.
* **UX & Validation Constraints:** Enforcing "draft-safe UX", "no broken alignment", and "clean error handling" ensures the AI generates production-ready code, not a flimsy prototype.

### Workability: **Perfect**
The prompt provides the exact data model mapping and UX behavior required. The AI will be able to generate precise React/Next.js code, using the specified Tailwind/glassmorphism design language.

---

## 5. Overall Cohesion & Recommendations

### Cohesion:
The three prompts form a **masterclass in AI orchestration**. 
1. **Prompt 1** builds the blueprint.
2. **Prompt 2** defines the data and workflow payload.
3. **Prompt 3** executes the first major piece of the UI.

### Minor Suggestions for Execution:
While the prompts are perfect, keep the following in mind when running them:
1. **Context Windows:** When running Prompt 3, make sure you provide the AI with your existing UI components (e.g., `Card`, `Input`, `Select`, `Button`) so it doesn't hallucinate generic HTML inputs. 
2. **Provide Screenshots:** For Prompt 2, ensure all legacy system screenshots are attached in high resolution so the AI can accurately extract the fields.
3. **Run Sequentially:** For the best results, feed the output of Prompt 1 and Prompt 2 back into the context window before running Prompt 3. This ensures the frontend code aligns perfectly with the architectural decisions made in the earlier steps.

## Conclusion
The prompts are exceptionally well-made, highly professional, and ready for execution. No changes are required.
