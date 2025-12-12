import { GoogleGenAI, Type, Schema } from "@google/genai";
import { DiagramResponse } from "../types";

const diagramSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: "A short, descriptive title for the diagram.",
    },
    mermaidCode: {
      type: Type.STRING,
      description: "Valid Mermaid.js code representing the requested diagram. Do not include markdown code blocks (```mermaid), just the raw code.",
    },
    explanation: {
      type: Type.STRING,
      description: "A brief explanation of what the diagram represents in Portuguese.",
    },
  },
  required: ["title", "mermaidCode", "explanation"],
};

export const generateDiagram = async (prompt: string): Promise<DiagramResponse> => {
  try {
    // Initialize client inside the function to ensure process.env.API_KEY is available at call time
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Using gemini-2.0-flash-exp as it is currently available and performant. 
    // 'gemini-2.5-flash' may be restricted or not yet public, causing 403 errors.
    const model = "gemini-2.0-flash-exp";
    
    const systemInstruction = `
      You are an expert Diagram Engineer specialized in Mermaid.js.
      Your goal is to convert user natural language descriptions into valid, syntactically correct Mermaid.js code.
      
      Supported Diagram Types: Flowchart, Sequence, Class, State, ER, Gantt, User Journey, Mindmap.
      
      Rules:
      1. CRITICAL: Always enclose node text/labels in double quotes to prevent syntax errors with special characters or parentheses. 
         Example: Use node1["Label Text (Details)"] instead of node1[Label Text (Details)].
      2. CRITICAL: For Flowcharts, the first line MUST be just the graph type (e.g., 'graph TD' or 'graph LR'). All node definitions must start on a NEW LINE.
         Incorrect: graph TD A["Start"]
         Correct: 
         graph TD
         A["Start"]
      3. Use clear labels and meaningful logic.
      4. Use styling (subgraphs, classes) to make diagrams look professional if complex.
      5. Respond in Portuguese for the title and explanation.
      6. Do NOT wrap the mermaid code in markdown backticks.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: diagramSchema,
        temperature: 0.2, // Low temperature for deterministic code generation
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response from AI");
    }

    const data = JSON.parse(text) as DiagramResponse;
    return data;
  } catch (error) {
    console.error("Error generating diagram:", error);
    throw error;
  }
};