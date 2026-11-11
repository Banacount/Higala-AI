export interface CommunityGuideline {
  title: string;
  body: string;
}

export const COMMUNITY_GUIDELINES: CommunityGuideline[] = [
  {
    title: 'Lead with respect',
    body: 'Disagree with the thought, not the person. No insults, mockery, or humiliation. People are allowed to be messy while they figure things out.',
  },
  {
    title: 'Empathy before advice',
    body: 'Listen first. If someone is venting, you do not have to fix them. A short “I hear you” can be more useful than a lecture.',
  },
  {
    title: 'No harassment or discrimination',
    body: 'Do not target anyone because of who they are, where they come from, or what they are going through.',
  },
  {
    title: 'Protect privacy — yours and theirs',
    body: 'Do not post names, addresses, phone numbers, emails, screenshots with identifying details, or anything that could expose another person.',
  },
  {
    title: 'No dangerous medical advice',
    body: 'You can share what helped you, but do not tell people to stop medication, skip professional care, or try something dangerous. Do not pretend to be a doctor or therapist.',
  },
  {
    title: 'Crisis is not a rule violation',
    body: 'If someone is thinking about suicide or self-harm, they need support, not a ban. Use the crisis resources and tell a moderator. Do not shame them.',
  },
  {
    title: 'Anonymity has limits',
    body: 'Your name and profile are never shown, but platform operators, infrastructure providers, and legally required disclosures may still be able to link content to an anonymous account. No system can promise absolute anonymity.',
  },
];

export const COMMUNITY_PRIVACY_NOTE =
  'Your name, email, and profile are never shown on community posts. Higala uses a random anonymous account ID to keep posts secure and to stop duplicate reactions. Platform operators, infrastructure providers, and legally required disclosures may still be able to link content to that ID. Avoid posting names, addresses, phone numbers, or details that could identify you or someone else.';
