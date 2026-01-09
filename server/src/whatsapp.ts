/**
 * WhatsApp Integration
 *
 * Handles WhatsApp messages via Twilio and responds using Claude API.
 * Supports triggering phone calls when user says "call me".
 */

import type { LLMProvider } from './providers/types.js';

export interface WhatsAppConfig {
  accountSid: string;
  authToken: string;
  whatsappNumber: string;  // Twilio WhatsApp number (e.g., +14155238886)
  userWhatsappNumber: string;  // User's WhatsApp number
}

export interface WhatsAppMessage {
  from: string;
  to: string;
  body: string;
}

export class WhatsAppHandler {
  private config: WhatsAppConfig;
  private llm: LLMProvider;
  private conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  private onCallRequested: ((context: string) => Promise<void>) | null = null;

  constructor(config: WhatsAppConfig, llm: LLMProvider) {
    this.config = config;
    this.llm = llm;
  }

  /**
   * Set callback for when user requests a call
   */
  setCallRequestHandler(handler: (context: string) => Promise<void>): void {
    this.onCallRequested = handler;
  }

  /**
   * Process incoming WhatsApp message and generate response
   */
  async handleIncomingMessage(message: WhatsAppMessage): Promise<string> {
    const userMessage = message.body.trim();
    console.error(`[WhatsApp] Received: ${userMessage}`);

    // Check if user wants a call
    const callTriggers = ['call me', 'call now', 'phone me', 'give me a call', 'ring me'];
    const wantsCall = callTriggers.some(trigger =>
      userMessage.toLowerCase().includes(trigger)
    );

    if (wantsCall && this.onCallRequested) {
      // Extract context from the message (everything after the trigger)
      let context = userMessage;
      for (const trigger of callTriggers) {
        const idx = userMessage.toLowerCase().indexOf(trigger);
        if (idx !== -1) {
          context = userMessage.substring(idx + trigger.length).trim() || 'User requested a call via WhatsApp';
          break;
        }
      }

      // Send acknowledgment
      await this.sendMessage("Got it! I'm calling you now...");

      // Trigger the call
      await this.onCallRequested(context);

      return "Call initiated";
    }

    // Regular chat - add to history and get Claude response
    this.conversationHistory.push({ role: 'user', content: userMessage });

    // Keep conversation history manageable (last 20 messages)
    if (this.conversationHistory.length > 20) {
      this.conversationHistory = this.conversationHistory.slice(-20);
    }

    const systemPrompt = `You are Claude, an AI assistant chatting via WhatsApp.
Keep responses concise and suitable for mobile messaging (1-3 short paragraphs max).
Be helpful, friendly, and conversational.
Don't use markdown formatting - plain text only.
If the user asks you to call them, let them know they can say "call me" and you'll phone them.`;

    try {
      const response = await this.llm.generateResponse(systemPrompt, this.conversationHistory);

      this.conversationHistory.push({ role: 'assistant', content: response });

      // Send response via WhatsApp
      await this.sendMessage(response);

      return response;
    } catch (error) {
      console.error('[WhatsApp] Error generating response:', error);
      const errorMsg = "Sorry, I encountered an error. Please try again.";
      await this.sendMessage(errorMsg);
      return errorMsg;
    }
  }

  /**
   * Send a WhatsApp message to the user
   */
  async sendMessage(body: string): Promise<void> {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.config.accountSid}/Messages.json`;

    const auth = Buffer.from(`${this.config.accountSid}:${this.config.authToken}`).toString('base64');

    const formData = new URLSearchParams();
    formData.append('From', `whatsapp:${this.config.whatsappNumber}`);
    formData.append('To', `whatsapp:${this.config.userWhatsappNumber}`);
    formData.append('Body', body);

    console.error(`[WhatsApp] Sending to ${this.config.userWhatsappNumber}: ${body.substring(0, 50)}...`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[WhatsApp] Send failed: ${response.status} - ${errorText}`);
      throw new Error(`Failed to send WhatsApp message: ${response.status}`);
    }

    const result = await response.json();
    console.error(`[WhatsApp] Message sent: ${result.sid}`);
  }

  /**
   * Parse incoming Twilio webhook data
   */
  static parseWebhook(params: URLSearchParams): WhatsAppMessage | null {
    const from = params.get('From');
    const to = params.get('To');
    const body = params.get('Body');

    if (!from || !to || !body) {
      return null;
    }

    // Remove 'whatsapp:' prefix if present
    return {
      from: from.replace('whatsapp:', ''),
      to: to.replace('whatsapp:', ''),
      body,
    };
  }
}
