import Anthropic from '@anthropic-ai/sdk';
import { aiConfig } from '@/config';
import logger from '@/utils/logger';

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

  constructor(apiKey?: string, model = aiConfig.anthropic.defaultModel) {
    this.client = new Anthropic({
      apiKey: apiKey || aiConfig.anthropic.apiKey,
    });
    this.model = model;
    logger.debug(`Claude model initialized with model: ${this.model}`);
  }

  async complete(
    systemPrompt: string,
    userPrompt: string,
    maxTokens = aiConfig.anthropic.defaultMaxTokens,
  ): Promise<ModelResponse> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        max_tokens: maxTokens,
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
          outputTokens: response.usage.output_tokens,
        },
      };
    } catch (error) {
      logger.error(`Error calling Claude API: ${error}`);
      throw error;
    }
  }
}