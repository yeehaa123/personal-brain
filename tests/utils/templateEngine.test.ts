import { beforeEach, describe, expect, test } from 'bun:test';

import { TemplateEngine } from '@/utils/templateEngine';

describe('TemplateEngine', () => {
  beforeEach(() => {
    TemplateEngine.resetInstance();
  });

  test('should render a template with simple variables', () => {
    const engine = TemplateEngine.getInstance();
    const template = 'Hello, {{name}}! You are {{age}} years old.';
    const data = { name: 'John', age: 30 };
    
    const result = engine.render(template, data);
    
    expect(result).toBe('Hello, John! You are 30 years old.');
  });

  test('should leave unmatched variables untouched', () => {
    const engine = TemplateEngine.getInstance();
    const template = 'Hello, {{name}}! You are {{age}} years old and your email is {{email}}.';
    const data = { name: 'John', age: 30 };
    
    const result = engine.render(template, data);
    
    expect(result).toBe('Hello, John! You are 30 years old and your email is {{email}}.');
  });

  test('should handle nested objects using dot notation', () => {
    const engine = TemplateEngine.getInstance();
    const template = 'Hello, {{user.name}}! Your address is {{user.address.city}}.';
    const data = { 
      user: { 
        name: 'John', 
        address: { 
          city: 'New York', 
        }, 
      }, 
    };
    
    const result = engine.render(template, data);
    
    expect(result).toBe('Hello, John! Your address is New York.');
  });

  test('should handle arrays', () => {
    const engine = TemplateEngine.getInstance();
    const template = 'First item: {{items.0}}, Second item: {{items.1}}';
    const data = { 
      items: ['apple', 'banana', 'orange'], 
    };
    
    const result = engine.render(template, data);
    
    expect(result).toBe('First item: apple, Second item: banana');
  });

  test('should handle conditional blocks with if statements', () => {
    const engine = TemplateEngine.getInstance();
    const template = 'Hello{% if showName %}, {{name}}{% endif %}!';
    
    const dataWithName = { showName: true, name: 'John' };
    const resultWithName = engine.renderWithConditionals(template, dataWithName);
    expect(resultWithName).toBe('Hello, John!');
    
    const dataWithoutName = { showName: false, name: 'John' };
    const resultWithoutName = engine.renderWithConditionals(template, dataWithoutName);
    expect(resultWithoutName).toBe('Hello!');
  });

  test('should handle nested conditionals', () => {
    const engine = TemplateEngine.getInstance();
    const template = 'Hello{% if user %}{% if user.name %}, {{user.name}}{% endif %}{% endif %}!';
    
    const dataWithUser = { user: { name: 'John' } };
    const resultWithUser = engine.renderWithConditionals(template, dataWithUser);
    expect(resultWithUser).toBe('Hello, John!');
    
    // For these cases, we just test that the user name does not appear
    const dataWithoutName = { user: {} };
    const resultWithoutName = engine.renderWithConditionals(template, dataWithoutName);
    expect(resultWithoutName).not.toContain('John');
    
    const dataWithoutUser = {};
    const resultWithoutUser = engine.renderWithConditionals(template, dataWithoutUser);
    expect(resultWithoutUser).not.toContain('John');
  });

  test('should handle complex templates with both conditionals and variables', () => {
    const engine = TemplateEngine.getInstance();
    const template = `
Hello, {{name}}!
{% if hasBio %}
Bio: {{bio}}
{% endif %}
{% if hasContact %}
Contact: {{contact.email}}
{% if contact.phone %}
Phone: {{contact.phone}}
{% endif %}
{% endif %}
Goodbye!
`;
    
    const data = {
      name: 'John',
      hasBio: true,
      bio: 'Software engineer',
      hasContact: true,
      contact: {
        email: 'john@example.com',
        phone: '123-456-7890',
      },
    };
    
    const result = engine.renderWithConditionals(template, data);
    
    // Verify each expected line is present in the output
    expect(result).toContain('Hello, John!');
    expect(result).toContain('Bio: Software engineer');
    expect(result).toContain('Contact: john@example.com');
    expect(result).toContain('Phone: 123-456-7890');
    expect(result).toContain('Goodbye!');
    
    // Also verify that the empty conditional blocks are removed
    const dataWithoutBio = {
      name: 'John',
      hasBio: false,
      hasContact: true,
      contact: {
        email: 'john@example.com',
      },
    };
    
    const resultWithoutBio = engine.renderWithConditionals(template, dataWithoutBio);
    expect(resultWithoutBio).not.toContain('Bio:');
    expect(resultWithoutBio).not.toContain('Phone:');
  });

  test('should create a fresh instance', () => {
    const instance1 = TemplateEngine.getInstance();
    const instance2 = TemplateEngine.createFresh();
    
    expect(instance1).not.toBe(instance2);
  });

  test('should handle empty or undefined input', () => {
    const engine = TemplateEngine.getInstance();
    
    expect(engine.render('', {})).toBe('');
    expect(engine.render(undefined as unknown as string, {})).toBe('');
    expect(engine.renderWithConditionals('', {})).toBe('');
    expect(engine.renderWithConditionals(undefined as unknown as string, {})).toBe('');
  });
});