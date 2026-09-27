/**
 * Tags a request with the attack it carries, from its path (+ query) and user agent.
 * Ported from the honeypot-pr web sensor classifier, trimmed for real traffic:
 * patterns that fire on normal apps there (/login, /dashboard, any JWT, ?next=https://,
 * private IPs, LDAP parens) are left out, since every hit here raises an incident.
 */

// Payload-carrying attacks, checked in this order. Each one is its own incident rule.
const EXPLOIT_PATTERNS: [string, RegExp[]][] = [
  ['log4shell', [/\$\{jndi:/i, /\$\{(lower|upper|env|sys|::-)[:}]/i]],
  [
    'sqli',
    [
      // whitespace-separated so slugs like /how-to-select-items-from-x don't match
      /\bunion\s+(all\s+)?select\b/i,
      /\bselect\s+[\w*,\s()'"]{1,40}\s+from\s+\w/i,
      /'\s*(or|and)\s*'?\d/i,
      /\bor\s+1\s*=\s*1\b/i,
      /\b(sleep|benchmark)\s*\(|waitfor\s+delay/i,
      /information_schema|xp_cmdshell|;\s*drop\s+table/i,
    ],
  ],
  [
    'xss',
    [/<\s*script[\s>]/i, /javascript\s*:/i, /\bon(load|error|mouseover|focus|click)\s*=/i, /<\s*(svg|img|iframe)[^>]*\bon\w+\s*=/i],
  ],
  ['ssti', [/\{\{\s*\d+\s*\*\s*\d+\s*\}\}/, /\$\{\s*\d+\s*\*\s*\d+\s*\}/, /__(class|globals|builtins)__/, /T\s*\(\s*java\.lang/i]],
  [
    'cmdi',
    [
      /(;|\|\|?|&&)\s*(ls|cat|id|whoami|uname|wget|curl|bash|sh|nc|python3?|perl|php)\b/i,
      /\$\([^)]*\)|`[^`]+`/,
      /\$\{IFS\}/i,
    ],
  ],
  [
    'lfi',
    [
      /\.\.[/\\]/,
      /%2e%2e|%252e%252e|%c0%ae/i,
      /etc\/(passwd|shadow)|proc\/self\/|win\.ini|boot\.ini/i,
      /=\s*(php|expect|file|phar|zip|data):/i,
    ],
  ],
  ['ssrf', [/169\.254\.169\.254|metadata\.google\.internal|100\.100\.100\.200/i]],
  ['crlf', [/%0d%0a|%0a(set-cookie|location)\s*:/i]],
]

export const EXPLOITS = EXPLOIT_PATTERNS.map(([name]) => name)

// What bots probe for: secrets, VCS dirs, admin panels, backups, known-vulnerable endpoints.
const PROBE_RE =
  /\/\.(env|git|svn|aws|ssh|htaccess|htpasswd|DS_Store|vscode|idea)\b|\/(wp-admin|wp-login\.php|wp-config|xmlrpc\.php|phpmyadmin|pma\/|phpinfo|info\.php|server-status|actuator|cgi-bin\/|vendor\/phpunit|boaform|HNAP1|config\.php|web\.config|docker-compose\.ya?ml)|\.(bak|old|swp|sql)$/i

// Offensive tooling that announces itself in the user agent.
const TOOL_UA_RE =
  /sqlmap|nikto|nuclei|gobuster|dirbuster|\bdirb\/|ffuf|feroxbuster|wfuzz|hydra|wpscan|acunetix|nessus|openvas|masscan|zgrab|nmap|metasploit|jaeles/i

function decode(s: string) {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

/** Returns an EXPLOITS name, 'probe', 'scanner' (tool user agent) or null. */
export function classifyRequest(path: string | null, userAgent: string | null): string | null {
  if (path) {
    // raw for encoding tricks (%2e%2e, %0d%0a), decoded for everything else; + is a space in queries
    const text = `${path} ${decode(path.replace(/\+/g, ' '))}`
    for (const [name, patterns] of EXPLOIT_PATTERNS) {
      if (patterns.some((p) => p.test(text))) return name
    }
    if (PROBE_RE.test(decode(path).split('?')[0])) return 'probe'
  }
  if (userAgent && TOOL_UA_RE.test(userAgent)) return 'scanner'
  return null
}
