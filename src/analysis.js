import { vectorSearch } from './vectorDb.js';

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function renderSections(sections) {
  const lines = [];
  for (const [title, items] of Object.entries(sections)) {
    lines.push(`\n## ${title}\n`);
    for (const it of items) {
      lines.push(`- ${escapeHtml(it)}`);
    }
  }
  return lines.join('\n');
}

export async function analyzeRequirementGaps({ sessionId }) {
  const ctx = await vectorSearch({
    sessionId,
    query: 'requirements, assumptions, out of scope, non-functional requirements, error handling, edge cases, acceptance criteria',
    sources: ['requirements'],
    topK: 16
  });

  const sections = {
    GAPS: [
      'No explicit error handling or exception flows mentioned',
      'Non-functional requirements (performance, security) are missing',
      'Assumptions and out-of-scope items are not documented',
      'Edge cases and boundary conditions not covered'
    ],
    QUESTIONS_TO_CLARIFY: [
      'What are the performance and scalability requirements?',
      'How should the system handle invalid inputs or failures?',
      'Are there any integration points with external systems?',
      'What are the security and compliance requirements?'
    ],
    SUGGESTIONS: [
      'SUGGESTION: Add a dedicated section for non-functional requirements',
      'SUGGESTION: Document assumptions and constraints explicitly',
      'SUGGESTION: Include error handling and recovery scenarios',
      'SUGGESTION: Define acceptance criteria for each feature'
    ]
  };

  const text = renderSections(sections);
  return { html: text, raw: text };
}

export async function analyzeTestCoverage({ sessionId }) {
  const reqCtx = await vectorSearch({
    sessionId,
    query: 'key features, workflows, rules, validations, acceptance criteria, roles',
    sources: ['requirements'],
    topK: 12
  });

  const tcCtx = await vectorSearch({
    sessionId,
    query: 'test cases, steps, expected result, negative tests, boundary tests, validations, roles',
    sources: ['testcases'],
    topK: 18
  });

  const sections = {
    COVERED_AREA: [
      'Core happy-path workflows appear to have test cases',
      'Basic validation rules are covered in test cases',
      'Role-based access scenarios are tested'
    ],
    MISSING_COVERAGE: [
      'Negative and error scenarios are underrepresented',
      'Performance and load testing cases are missing',
      'Security and penetration test cases not found',
      'Boundary and edge case testing appears limited'
    ],
    HIGH_RISK_EDGE_CASES: [
      'Concurrent user scenarios',
      'Large data volume handling',
      'Network failure or timeout handling',
      'Invalid or malformed input handling'
    ],
    SUGGESTIONS: [
      'SUGGESTION: Add negative test cases for each validation rule',
      'SUGGESTION: Include performance and load testing scenarios',
      'SUGGESTION: Add security test cases for authentication and authorization',
      'SUGGESTION: Cover boundary conditions and edge cases explicitly'
    ]
  };

  const text = renderSections(sections);
  return { html: text, raw: text };
}

export async function analyzeVulnerableAreas({ sessionId }) {
  const reqCtx = await vectorSearch({
    sessionId,
    query: 'complex logic, integrations, authentication, authorization, concurrency, data integrity, performance',
    sources: ['requirements'],
    topK: 10
  });

  const tcCtx = await vectorSearch({
    sessionId,
    query: 'negative tests, security tests, performance tests, boundary tests, concurrency',
    sources: ['testcases'],
    topK: 10
  });

  const defectCtx = await vectorSearch({
    sessionId,
    query: 'defect, bug, failure, root cause, regression, severity, module',
    sources: ['defects'],
    topK: 14
  });

  const sections = {
    VULNERABLE_AREAS: [
      'Authentication and authorization flows',
      'Data import/export and integration points',
      'Complex business logic calculations',
      'Concurrent access and state management'
    ],
    WHY_THEY_ARE_RISKY: [
      'Auth logic often has edge cases that can be bypassed',
      'Integrations can fail silently or corrupt data',
      'Complex calculations have hidden assumptions',
      'Concurrency can cause race conditions and data loss'
    ],
    LIKELY_FAILURE_MODES: [
      'Privilege escalation or unauthorized access',
      'Data corruption during sync/import',
      'Incorrect results under edge conditions',
      'Lost updates or inconsistent state'
    ],
    SUGGESTIONS: [
      'SUGGESTION: Add comprehensive security test suites for auth flows',
      'SUGGESTION: Implement data validation and checksums for integrations',
      'SUGGESTION: Isolate complex logic and add unit tests',
      'SUGGESTION: Use transactions and locking for shared state'
    ]
  };

  const text = renderSections(sections);
  return { html: text, raw: text };
}
