import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export type PasswordRuleKey = 'length' | 'uppercase' | 'lowercase' | 'special';

export interface PasswordRule {
  key: PasswordRuleKey;
  label: string;
  met: boolean;
}

interface PasswordRuleDefinition {
  key: PasswordRuleKey;
  label: string;
  predicate: (value: string) => boolean;
}

const RULE_DEFINITIONS: PasswordRuleDefinition[] = [
  {
    key: 'length',
    label: 'Minimum 12 characters',
    predicate: (value) => value.length >= 12,
  },
  {
    key: 'uppercase',
    label: 'Uppercase letters',
    predicate: (value) => /[A-Z]/.test(value),
  },
  {
    key: 'lowercase',
    label: 'Lowercase letters',
    predicate: (value) => /[a-z]/.test(value),
  },
  {
    key: 'special',
    label: 'Special characters',
    predicate: (value) => /[^A-Za-z0-9]/.test(value),
  },
];

export function evaluatePasswordRules(rawValue: string | null | undefined): PasswordRule[] {
  const value = rawValue ?? '';
  return RULE_DEFINITIONS.map((rule) => ({
    key: rule.key,
    label: rule.label,
    met: rule.predicate(value),
  }));
}

export function passwordComplexityValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const rules = evaluatePasswordRules(control.value);
    const unmetRules = rules.filter((rule) => !rule.met).map((rule) => rule.key);

    if (unmetRules.length === 0) {
      return null;
    }

    return {
      passwordComplexity: {
        unmetRules,
      },
    };
  };
}
