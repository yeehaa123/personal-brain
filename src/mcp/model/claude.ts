import Anthropic from '@anthropic-ai/sdk';

export interface ModelResponse {
  response: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export class ClaudeModel {
  private client: Anthropic;
  private model: string;

  constructor(apiKey?: string, model = 'claude-3-opus-20240229') {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY
    });
    this.model = model;
  }

  async complete(
    systemPrompt: string,
    userPrompt: string,
    maxTokens = 1000
  ): Promise<ModelResponse> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        max_tokens: maxTokens
      });

      let responseText = '';
      if (response.content[0].type === 'text') {
        responseText = response.content[0].text;
      } else {
        responseText = JSON.stringify(response.content[0]);
      }
      
      return {
        response: responseText,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens
        }
      };
    } catch (error) {
      console.error('Error calling Claude API:', error);
      throw error;
    }
  }
}