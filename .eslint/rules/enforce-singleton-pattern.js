/**
 * @fileoverview Rule to enforce the singleton pattern with getInstance/resetInstance/createFresh methods
 * @author Claude
 */

/**
 * Check if a class has a static method with the given name
 * @param {object} classNode - The ESTree node for the class declaration
 * @param {string} methodName - The name of the static method to look for
 * @returns {boolean} True if the method exists, false otherwise
 */
function hasStaticMethod(classNode, methodName) {
  return classNode.body.body.some(
    (node) => 
      node.type === 'MethodDefinition' && 
      node.static === true && 
      node.key.type === 'Identifier' &&
      node.key.name === methodName
  );
}

const rule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce classes with getInstance() to also have resetInstance() and createFresh()',
      category: 'Best Practices',
      recommended: false,
    },
    fixable: null,
    schema: [], // no options
    messages: {
      missingResetInstance: 'Classes with getInstance() should also have resetInstance()',
      missingCreateFresh: 'Classes with getInstance() should also have createFresh()',
    },
  },

  create(context) {
    return {
      // Look for class declarations
      ClassDeclaration(node) {
        // Check if class has getInstance method
        const hasGetInstance = hasStaticMethod(node, 'getInstance');
        
        if (hasGetInstance) {
          // Check if class has resetInstance method
          const hasResetInstance = hasStaticMethod(node, 'resetInstance');
          if (!hasResetInstance) {
            context.report({
              node,
              messageId: 'missingResetInstance',
              data: {
                className: node.id.name,
              },
            });
          }

          // Check if class has createFresh method
          const hasCreateFresh = hasStaticMethod(node, 'createFresh');
          if (!hasCreateFresh) {
            context.report({
              node,
              messageId: 'missingCreateFresh',
              data: {
                className: node.id.name,
              },
            });
          }
        }
      },

      // Also handle class expressions
      ClassExpression(node) {
        // Check if class has getInstance method
        const hasGetInstance = hasStaticMethod(node, 'getInstance');
        
        if (hasGetInstance) {
          // Check if class has resetInstance method
          const hasResetInstance = hasStaticMethod(node, 'resetInstance');
          if (!hasResetInstance) {
            context.report({
              node,
              messageId: 'missingResetInstance',
            });
          }

          // Check if class has createFresh method
          const hasCreateFresh = hasStaticMethod(node, 'createFresh');
          if (!hasCreateFresh) {
            context.report({
              node,
              messageId: 'missingCreateFresh',
            });
          }
        }
      }
    };
  },
};

export default rule;