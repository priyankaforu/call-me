/**
 * Claude LLM Provider
 *
 * Uses Claude API to generate conversational responses for autonomous phone calls.
 */

import type { LLMProvider, LLMConfig } from './types.js';

export class ClaudeLLMProvider implements LLMProvider {
  readonly name = 'claude';
  private apiKey: string = '';
  private model: string = 'claude-sonnet-4-20250514';

  initialize(config: LLMConfig): void {
    this.apiKey = config.apiKey;
    if (config.model) {
      this.model = config.model;
    }
  }

  async generateResponse(
    systemPrompt: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Claude API key not configured');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 300,  // Keep responses concise for voice
        system: systemPrompt,
        messages: conversationHistory,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as {
      content: Array<{ type: string; text?: string }>;
    };

    // Extract text from response
    const textContent = data.content.find(block => block.type === 'text');
    if (!textContent?.text) {
      throw new Error('No text response from Claude');
    }

    return textContent.text;
  }
}
