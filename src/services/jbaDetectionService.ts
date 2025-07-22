/**
 * JBADetectionService - AI-powered detection of CLE (Continuing Legal Education) codes
 * Uses OpenRouter/Claude to intelligently identify JBA codes in legal transcripts
 */

import OpenAI from "openai";
import { JBADetectionResult, AssemblyAIResults } from "../types";

export class JBADetectionService {
  private openai: OpenAI | null = null;
  private model: string = "anthropic/claude-3.5-sonnet";

  constructor() {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.warn(
        "⚠️ OPENROUTER_API_KEY not found - JBA detection will be disabled"
      );
      return;
    }

    this.openai = new OpenAI({
      apiKey: apiKey,
      baseURL: "https://openrouter.ai/api/v1",
    });
    console.log("🏛️ JBADetectionService initialized with Claude 3.5 Sonnet");
  }

  /**
   * Detect JBA codes in a transcript using AI
   */
  public async detectJBACodes(
    transcriptionResults: AssemblyAIResults,
    options?: {
      contextWindow?: number;
      confidenceThreshold?: number;
    }
  ): Promise<JBADetectionResult[]> {
    if (!this.openai) {
      console.warn("⚠️ JBA detection skipped - OpenRouter not configured");
      return [];
    }

    const contextWindow = options?.contextWindow || 50; // words around detection
    const confidenceThreshold = options?.confidenceThreshold || 0.7;

    console.log("🔍 Starting JBA code detection...");
    console.log(
      `📝 Transcript length: ${transcriptionResults.text.length} characters`
    );

    try {
      const prompt = this.buildDetectionPrompt(transcriptionResults.text);

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content: this.getSystemPrompt(),
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.1, // Low temperature for consistent results
        max_tokens: 4000,
      });

      const aiResponse = response.choices[0]?.message?.content;
      if (!aiResponse) {
        console.warn("⚠️ No response from AI model");
        return [];
      }

      console.log("🤖 AI Response received, parsing results...");

      // Parse the AI response to extract JBA codes
      const detectedCodes = this.parseAIResponse(
        aiResponse,
        transcriptionResults,
        contextWindow
      );

      // Filter by confidence threshold
      const filteredCodes = detectedCodes.filter(
        (code) => code.confidence >= confidenceThreshold
      );

      console.log(
        `✅ JBA detection complete: ${filteredCodes.length} codes found`
      );
      if (filteredCodes.length > 0) {
        filteredCodes.forEach((code, index) => {
          console.log(
            `   ${index + 1}. "${code.code}" at ${this.formatTimestamp(
              code.timestamp
            )} (confidence: ${(code.confidence * 100).toFixed(1)}%)`
          );
        });
      }

      return filteredCodes;
    } catch (error) {
      console.error("❌ JBA detection failed:", error);
      throw new Error(
        `JBA detection failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Get the system prompt that defines the AI's role and approach
   */
  private getSystemPrompt(): string {
    return `You are an expert legal transcript analyzer specializing in detecting Continuing Legal Education (CLE) codes, specifically JBA codes.

CONTEXT:
- JBA codes are alphanumeric codes given during legal education sessions
- Attorneys need these codes to receive CLE credits
- Speakers typically announce when they're about to provide a code
- Due to speech-to-text conversion, "JBA" may appear as various forms

YOUR TASK:
Analyze the transcript and identify all JBA codes with high accuracy. Look for:

1. ANNOUNCEMENT PATTERNS (speakers often say):
   - "Here's your JBA code"
   - "The code is..."
   - "For your CLE credits, the code is..."
   - "Please write down this code"
   - "Your participation code is..."

2. JBA VARIATIONS (due to speech-to-text):
   - "JBA" (exact)
   - "jay bee aye" or "jay-bee-aye"
   - "j b a" or "J-B-A"
   - "jba" (lowercase)
   - Any phonetic variation

3. CODE FORMATS:
   - Usually starts with JBA/jay-bee-aye variations
   - Followed by numbers/letters (e.g., "JBA123", "JBA-45-B")
   - May include hyphens, spaces, or other separators
   - Typically 5-15 characters total

4. CONTEXT CLUES:
   - Often mentioned at end of sessions
   - May be repeated for clarity
   - Speaker may spell it out letter by letter
   - Often preceded by instructions to "write this down"

RESPONSE FORMAT:
Return a JSON array of detected codes. For each detection, provide:
{
  "code": "normalized_code_here",
  "originalText": "exact_text_from_transcript",
  "context": "surrounding_context_for_verification",
  "confidence": 0.95,
  "variationType": "standard|spaced|phonetic|spelled_out"
}

Be thorough but precise. High confidence codes only. Include surrounding context for verification.`;
  }

  /**
   * Build the detection prompt with the transcript
   */
  private buildDetectionPrompt(transcript: string): string {
    // Split transcript into manageable chunks if it's very long
    const maxLength = 15000; // Characters
    let textToAnalyze = transcript;

    if (transcript.length > maxLength) {
      // Take the last portion of the transcript (codes often come at the end)
      textToAnalyze = "..." + transcript.slice(-maxLength);
      console.log(
        `📄 Analyzing last ${maxLength} characters of transcript (codes typically appear at end)`
      );
    }

    return `Please analyze this legal education transcript and identify all JBA codes for CLE credits.

TRANSCRIPT TO ANALYZE:
${textToAnalyze}

Remember to look for announcement patterns, handle speech-to-text variations of "JBA", and provide high-confidence detections only. Return results as JSON array.`;
  }

  /**
   * Parse the AI response and map to timestamps
   */
  private parseAIResponse(
    aiResponse: string,
    transcriptionResults: AssemblyAIResults,
    contextWindow: number
  ): JBADetectionResult[] {
    try {
      // Extract JSON from the response (AI might include explanation text)
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.warn("⚠️ No JSON array found in AI response");
        return [];
      }

      const detections = JSON.parse(jsonMatch[0]);
      const results: JBADetectionResult[] = [];

      for (const detection of detections) {
        // Find the timestamp for this detection using word-level data
        const timestamp = this.findTimestampForCode(
          detection.originalText,
          transcriptionResults.words || []
        );

        if (timestamp !== null) {
          results.push({
            code: this.normalizeCode(detection.code),
            originalText: detection.originalText,
            context: detection.context,
            timestamp: timestamp,
            confidence: Math.min(Math.max(detection.confidence || 0.8, 0), 1), // Clamp between 0-1
            variationType: this.classifyVariationType(detection.originalText),
          });
        } else {
          console.warn(
            `⚠️ Could not find timestamp for code: ${detection.originalText}`
          );
        }
      }

      return results;
    } catch (error) {
      console.error("❌ Failed to parse AI response:", error);
      console.log("Raw AI response:", aiResponse);
      return [];
    }
  }

  /**
   * Find timestamp for a detected code using word-level data
   */
  private findTimestampForCode(
    originalText: string,
    words: any[]
  ): number | null {
    if (!words || words.length === 0) return null;

    // Normalize the search text
    const searchText = originalText.toLowerCase().replace(/[^\w\s]/g, " ");
    const searchWords = searchText
      .split(/\s+/)
      .filter((word) => word.length > 0);

    if (searchWords.length === 0) return null;

    // Find the best match in the words array
    for (let i = 0; i <= words.length - searchWords.length; i++) {
      let matchCount = 0;
      let startIndex = i;

      for (let j = 0; j < searchWords.length; j++) {
        const wordIndex = i + j;
        if (wordIndex >= words.length) break;

        const transcriptWord = words[wordIndex].text
          .toLowerCase()
          .replace(/[^\w]/g, "");
        const searchWord = searchWords[j];

        // Check for exact match or phonetic similarity
        if (
          transcriptWord === searchWord ||
          this.areSimilar(transcriptWord, searchWord)
        ) {
          matchCount++;
        } else if (matchCount > 0) {
          // If we had a partial match but it broke, reset
          break;
        }
      }

      // If we found a good match (at least 70% of words)
      if (matchCount >= Math.ceil(searchWords.length * 0.7)) {
        return words[startIndex].start;
      }
    }

    return null;
  }

  /**
   * Check if two words are phonetically similar (for JBA variations)
   */
  private areSimilar(word1: string, word2: string): boolean {
    // Handle JBA variations specifically
    const jbaVariations = ["jba", "jay", "bee", "aye", "j", "b", "a"];

    if (jbaVariations.includes(word1) && jbaVariations.includes(word2)) {
      return true;
    }

    // Simple similarity check for other words
    if (Math.abs(word1.length - word2.length) > 2) return false;

    let differences = 0;
    const maxLength = Math.max(word1.length, word2.length);

    for (let i = 0; i < maxLength; i++) {
      if (word1[i] !== word2[i]) differences++;
    }

    return differences <= 2; // Allow up to 2 character differences
  }

  /**
   * Normalize a detected code to standard format
   */
  private normalizeCode(code: string): string {
    // Remove extra spaces and normalize
    let normalized = code.trim().toUpperCase();

    // Handle common variations
    normalized = normalized
      .replace(/JAY\s*BEE\s*AYE/gi, "JBA")
      .replace(/J\s*B\s*A/gi, "JBA")
      .replace(/\s+/g, "")
      .replace(/[^\w-]/g, "");

    return normalized;
  }

  /**
   * Classify the type of variation found
   */
  private classifyVariationType(
    originalText: string
  ):
    | "standard"
    | "spaced"
    | "dotted"
    | "hyphenated"
    | "lowercase"
    | "spoken"
    | "extended" {
    const text = originalText.toLowerCase();

    if (text.includes("jay") || text.includes("bee") || text.includes("aye")) {
      return "spoken";
    }
    if (text.includes("j.b.a")) {
      return "dotted";
    }
    if (text.includes("j-b-a") || text.includes("jba-")) {
      return "hyphenated";
    }
    if (text.includes("j b a")) {
      return "spaced";
    }
    if (text === text.toLowerCase() && text.includes("jba")) {
      return "lowercase";
    }
    if (text.length > 10) {
      return "extended";
    }

    return "standard";
  }

  /**
   * Format timestamp for display
   */
  private formatTimestamp(milliseconds: number): string {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  /**
   * Check if OpenRouter is available and configured
   */
  public isAvailable(): boolean {
    return !!this.openai;
  }

  /**
   * Get service status for health checks
   */
  public getStatus(): { available: boolean; model?: string; error?: string } {
    if (!this.openai) {
      return {
        available: false,
        error: "OPENROUTER_API_KEY not configured",
      };
    }

    return {
      available: true,
      model: this.model,
    };
  }
}
