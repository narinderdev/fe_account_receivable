import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { PasswordRule } from '../../utils/password-rules.util';

@Component({
  selector: 'app-password-rules',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './password-rules.component.html',
  styleUrls: ['./password-rules.component.css'],
})
export class PasswordRulesComponent {
  @Input() rules: PasswordRule[] = [];
  @Input() visible = false;
  @Input() helperId?: string;

  trackByRuleKey(_: number, rule: PasswordRule) {
    return rule.key;
  }
}
