import { NextRequest, NextResponse } from 'next/server'
import {
  requireAuthenticatedUser,
  getUserOrganization,
  createErrorResponse,
  createSuccessResponse,
} from '@/lib/api-utils'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const profile = await getUserOrganization(user.id)

    const body = await request.json()
    const { content, variables, whatsappTemplate } = body

    if (!content) {
      return NextResponse.json({ error: 'Content is required for validation' }, { status: 400 })
    }

    const validationResults = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: [],
      variableValidation: {
        detected: [],
        missing: [],
        unused: [],
      },
      whatsappValidation: null,
    }

    // Basic content validation
    if (content.length > 1024) {
      validationResults.errors.push('Template content exceeds 1024 character limit')
      validationResults.isValid = false
    }

    if (content.trim().length === 0) {
      validationResults.errors.push('Template content cannot be empty')
      validationResults.isValid = false
    }

    // Variable validation
    const detectedVariables = extractVariablesFromContent(content)
    const declaredVariables = variables || []

    validationResults.variableValidation.detected = detectedVariables

    // Check for missing variable declarations
    for (const detectedVar of detectedVariables) {
      const isDeclared = declaredVariables.some(declared => declared.name === detectedVar.name)
      if (!isDeclared) {
        validationResults.variableValidation.missing.push(detectedVar)
        validationResults.warnings.push(`Variable '${detectedVar.name}' is used but not declared`)
      }
    }

    // Check for unused variable declarations
    for (const declaredVar of declaredVariables) {
      const isUsed = detectedVariables.some(detected => detected.name === declaredVar.name)
      if (!isUsed) {
        validationResults.variableValidation.unused.push(declaredVar)
        validationResults.warnings.push(`Variable '${declaredVar.name}' is declared but not used`)
      }
    }

    // WhatsApp template validation
    if (whatsappTemplate) {
      validationResults.whatsappValidation = validateWhatsAppTemplate(whatsappTemplate)

      if (validationResults.whatsappValidation.errors.length > 0) {
        validationResults.isValid = false
        validationResults.errors.push(...validationResults.whatsappValidation.errors)
      }

      validationResults.warnings.push(...validationResults.whatsappValidation.warnings)
      validationResults.suggestions.push(...validationResults.whatsappValidation.suggestions)
    }

    // Content quality suggestions
    const qualitySuggestions = generateQualitySuggestions(content)
    validationResults.suggestions.push(...qualitySuggestions)

    return createSuccessResponse(validationResults)
  } catch (error) {
    console.error('Template validation error:', error)
    return createErrorResponse(error)
  }
}

function extractVariablesFromContent(
  content: string
): Array<{ name: string; position: number; type: 'simple' | 'whatsapp' }> {
  const variables = []

  // Match {{variable}} pattern (WhatsApp style)
  const whatsappMatches = content.matchAll(/\{\{(\w+)\}\}/g)
  for (const match of whatsappMatches) {
    variables.push({
      name: match[1],
      position: match.index,
      type: 'whatsapp',
    })
  }

  // Match {variable} pattern (simple style)
  const simpleMatches = content.matchAll(/\{(\w+)\}/g)
  for (const match of simpleMatches) {
    // Skip if already captured as WhatsApp variable
    const isWhatsApp = variables.some(
      v =>
        v.position <= match.index && v.position + v.name.length + 4 >= match.index + match[0].length
    )

    if (!isWhatsApp) {
      variables.push({
        name: match[1],
        position: match.index,
        type: 'simple',
      })
    }
  }

  return variables
}

function validateWhatsAppTemplate(whatsappTemplate: any): {
  isValid: boolean
  errors: string[]
  warnings: string[]
  suggestions: string[]
} {
  const validation = {
    isValid: true,
    errors: [],
    warnings: [],
    suggestions: [],
  }

  // Required fields
  if (!whatsappTemplate.name) {
    validation.errors.push('WhatsApp template name is required')
    validation.isValid = false
  } else {
    // Name validation
    if (!/^[a-z0-9_]+$/.test(whatsappTemplate.name)) {
      validation.errors.push(
        'WhatsApp template name must contain only lowercase letters, numbers, and underscores'
      )
      validation.isValid = false
    }

    if (whatsappTemplate.name.length > 512) {
      validation.errors.push('WhatsApp template name must be 512 characters or less')
      validation.isValid = false
    }
  }

  if (!whatsappTemplate.language) {
    validation.errors.push('WhatsApp template language is required')
    validation.isValid = false
  }

  if (!whatsappTemplate.category) {
    validation.errors.push('WhatsApp template category is required')
    validation.isValid = false
  } else {
    const validCategories = ['AUTHENTICATION', 'MARKETING', 'UTILITY']
    if (!validCategories.includes(whatsappTemplate.category)) {
      validation.errors.push(
        `WhatsApp template category must be one of: ${validCategories.join(', ')}`
      )
      validation.isValid = false
    }
  }

  // Components validation
  if (!whatsappTemplate.components || !Array.isArray(whatsappTemplate.components)) {
    validation.errors.push('WhatsApp template components are required')
    validation.isValid = false
  } else {
    const hasBodyComponent = whatsappTemplate.components.some(c => c.type === 'BODY')
    if (!hasBodyComponent) {
      validation.errors.push('WhatsApp template must have at least one BODY component')
      validation.isValid = false
    }

    // Validate each component
    for (const [index, component] of whatsappTemplate.components.entries()) {
      if (!component.type) {
        validation.errors.push(`Component ${index + 1}: type is required`)
        validation.isValid = false
        continue
      }

      const validComponentTypes = ['HEADER', 'BODY', 'FOOTER', 'BUTTONS']
      if (!validComponentTypes.includes(component.type)) {
        validation.errors.push(`Component ${index + 1}: invalid type '${component.type}'`)
        validation.isValid = false
      }

      // Type-specific validations
      switch (component.type) {
        case 'BODY':
          if (!component.text) {
            validation.errors.push(`Component ${index + 1}: BODY component must have text`)
            validation.isValid = false
          } else if (component.text.length > 1024) {
            validation.errors.push(`Component ${index + 1}: BODY text exceeds 1024 character limit`)
            validation.isValid = false
          }
          break

        case 'HEADER':
          if (component.format === 'TEXT' && !component.text) {
            validation.errors.push(`Component ${index + 1}: TEXT HEADER must have text`)
            validation.isValid = false
          } else if (component.format === 'TEXT' && component.text.length > 60) {
            validation.errors.push(`Component ${index + 1}: HEADER text exceeds 60 character limit`)
            validation.isValid = false
          }
          break

        case 'FOOTER':
          if (!component.text) {
            validation.errors.push(`Component ${index + 1}: FOOTER component must have text`)
            validation.isValid = false
          } else if (component.text.length > 60) {
            validation.errors.push(`Component ${index + 1}: FOOTER text exceeds 60 character limit`)
            validation.isValid = false
          }
          break

        case 'BUTTONS':
          if (!component.buttons || !Array.isArray(component.buttons)) {
            validation.errors.push(
              `Component ${index + 1}: BUTTONS component must have buttons array`
            )
            validation.isValid = false
          } else if (component.buttons.length > 3) {
            validation.errors.push(`Component ${index + 1}: Maximum 3 buttons allowed`)
            validation.isValid = false
          }
          break
      }
    }
  }

  // Category-specific validations
  if (whatsappTemplate.category === 'MARKETING') {
    validation.warnings.push(
      'Marketing templates require pre-approval and may take longer to approve'
    )
  }

  if (whatsappTemplate.category === 'AUTHENTICATION') {
    validation.suggestions.push(
      'Authentication templates should include clear instructions for the user'
    )
  }

  // General suggestions
  if (whatsappTemplate.components) {
    const bodyComponent = whatsappTemplate.components.find(c => c.type === 'BODY')
    if (bodyComponent && bodyComponent.text) {
      if (bodyComponent.text.length < 20) {
        validation.suggestions.push('Consider adding more context to make the message clearer')
      }

      if (!/[.!?]$/.test(bodyComponent.text.trim())) {
        validation.suggestions.push('Consider ending the message with proper punctuation')
      }
    }
  }

  return validation
}

function generateQualitySuggestions(content: string): string[] {
  const suggestions = []

  // Length suggestions
  if (content.length < 20) {
    suggestions.push('Consider adding more context to make the message clearer')
  }

  if (content.length > 800) {
    suggestions.push('Consider shortening the message for better readability')
  }

  // Formatting suggestions
  if (!/[.!?]$/.test(content.trim())) {
    suggestions.push('Consider ending the message with proper punctuation')
  }

  if (content.includes('  ')) {
    suggestions.push('Remove extra spaces for cleaner formatting')
  }

  // Content suggestions
  if (!/\b(please|thank|welcome|hello|hi)\b/i.test(content)) {
    suggestions.push('Consider adding polite language to improve user experience')
  }

  if (content.toUpperCase() === content && content.length > 10) {
    suggestions.push('Avoid using ALL CAPS as it may appear aggressive')
  }

  // Variable usage suggestions
  const variableCount = (content.match(/\{[\w]+\}/g) || []).length
  if (variableCount > 5) {
    suggestions.push('Consider reducing the number of variables for simpler template management')
  }

  return suggestions
}
