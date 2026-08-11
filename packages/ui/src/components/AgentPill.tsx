import { agentAccents, type AgentName } from '@axiom/design-tokens';
import { cn } from '../utils.js';

const AGENT_PERSONAS: Record<AgentName, { persona: string; emoji: string }> = {
  drishti: { persona: 'Discovery', emoji: '◎' },
  vibhaag: { persona: 'Classification', emoji: '◇' },
  parikshan: { persona: 'Assessment', emoji: '⊕' },
  saakshi: { persona: 'Evidence', emoji: '◈' },
  sudhaar: { persona: 'Remediation', emoji: '◊' },
  karya: { persona: 'Execution', emoji: '◆' },
  lekha: { persona: 'Audit', emoji: '▤' },
  nazar: { persona: 'Regulatory Watch', emoji: '◉' },
  prativedan: { persona: 'Reporting', emoji: '▥' },
  sanket: { persona: 'Market Signal', emoji: '◐' },
};

export interface AgentPillProps {
  agent: AgentName;
  showPersona?: boolean;
  className?: string;
}

export function AgentPill({ agent, showPersona = true, className }: AgentPillProps) {
  const accent = agentAccents[agent];
  const persona = AGENT_PERSONAS[agent];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border bg-white px-2 py-0.5 text-xs font-medium',
        className,
      )}
      style={{ borderColor: accent, color: accent }}
    >
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: accent }}
        aria-hidden="true"
      />
      <span className="font-heading capitalize">{agent}</span>
      {showPersona && (
        <span className="text-slate-500">· {persona.persona}</span>
      )}
    </span>
  );
}

export { AGENT_PERSONAS };
