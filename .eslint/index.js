/**
 * @fileoverview Custom ESLint rules for personal-brain
 * @author Claude
 */

import enforceSingletonPattern from './rules/enforce-singleton-pattern.js';

export default {
  rules: {
    'enforce-singleton-pattern': enforceSingletonPattern,
  },
};