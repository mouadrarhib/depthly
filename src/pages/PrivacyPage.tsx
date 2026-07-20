import type { CSSProperties, ReactNode } from 'react'

import { LegalLayout } from '@/components/legal/LegalLayout'

const EMAIL = 'contact@getdepthly.com'
const MAILTO = `mailto:${EMAIL}`

const h2Style: CSSProperties = { fontSize: 17, fontWeight: 500, color: '#E8E6F0', letterSpacing: '-0.01em' }
const h3Style: CSSProperties = { fontSize: 15, fontWeight: 500, color: '#E8E6F0' }
const pStyle: CSSProperties = { fontSize: 14, color: '#7A7890', lineHeight: 1.75 }
const ulStyle: CSSProperties = { paddingLeft: 20, margin: 0, listStyleType: 'disc', display: 'flex', flexDirection: 'column', gap: 6 }
const linkStyle: CSSProperties = { color: '#4B9EFF', textDecoration: 'underline', textDecorationColor: 'rgba(75,158,255,0.35)' }
const strongStyle: CSSProperties = { color: '#E8E6F0' }

const TOC_ITEMS = [
  { id: 'intro', label: '1. INTRODUCTION' },
  { id: 'scope', label: '2. WHO THIS POLICY APPLIES TO' },
  { id: 'collect', label: '3. INFORMATION WE COLLECT' },
  { id: 'use', label: '4. HOW WE USE YOUR INFORMATION' },
  { id: 'share', label: '5. HOW WE SHARE YOUR INFORMATION' },
  { id: 'cookies', label: '6. COOKIES AND TRACKING TECHNOLOGIES' },
  { id: 'retention', label: '7. DATA RETENTION' },
  { id: 'security', label: '8. DATA SECURITY' },
  { id: 'rights', label: '9. YOUR PRIVACY RIGHTS' },
  { id: 'children', label: '10. CHILDREN’S PRIVACY' },
  { id: 'transfers', label: '11. INTERNATIONAL DATA TRANSFERS' },
  { id: 'dpo', label: '12. DATA PROTECTION OFFICER' },
  { id: 'gpc', label: '13. GLOBAL PRIVACY CONTROL' },
  { id: 'changes', label: '14. CHANGES TO THIS PRIVACY POLICY' },
  { id: 'contact', label: '15. CONTACT US' },
]

function Section({ id, number, title, children }: { id: string; number: number; title: string; children: ReactNode }) {
  return (
    <section
      id={id}
      style={{
        marginTop: 32,
        paddingTop: 32,
        borderTop: '0.5px solid #2E2E38',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <h2 style={h2Style}>{number}. {title}</h2>
      {children}
    </section>
  )
}

function SubHeading({ children }: { children: ReactNode }) {
  return <h3 style={{ ...h3Style, marginTop: 4 }}>{children}</h3>
}

export function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated="July 20, 2026">
      {/* Table of contents */}
      <h2 style={{ ...h2Style, marginBottom: 4 }}>TABLE OF CONTENTS</h2>
      <nav
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '6px 16px',
        }}
      >
        {TOC_ITEMS.map(({ id, label }) => (
          <a key={id} href={`#${id}`} style={{ ...linkStyle, fontSize: 13 }}>
            {label}
          </a>
        ))}
      </nav>

      <Section id="intro" number={1} title="INTRODUCTION">
        <p style={pStyle}>We are Depthly ("Company," "we," "us," "our").</p>
        <p style={pStyle}>
          This Privacy Policy describes how we collect, use, store, and share information when you
          use our website and application at{' '}
          <a href="https://www.getdepthly.com" target="_blank" rel="noopener noreferrer" style={linkStyle}>
            https://www.getdepthly.com
          </a>{' '}
          (the "Site"), together with any other related products and services that refer or link
          to this Privacy Policy (collectively, the "Services").
        </p>
        <p style={pStyle}>
          Depthly is a focus session and time-tracking web application for students, freelancers,
          and developers. Users track deep work sessions with a Pomodoro/custom timer, organize
          work into projects and tasks (list and kanban views), and review their focus habits
          through daily, weekly, monthly, and yearly analytics. Depthly includes an optional public
          leaderboard and profile system, and offers a free plan alongside a paid subscription tier
          with expanded limits and features.
        </p>
        <p style={pStyle}>
          By using the Services, you agree to the collection and use of information described in
          this Privacy Policy. If you do not agree with this Policy, please do not use the
          Services.
        </p>
        <p style={pStyle}>
          You may contact us regarding this Privacy Policy by email at{' '}
          <a href={MAILTO} style={linkStyle}>{EMAIL}</a>.
        </p>
        <p style={pStyle}>
          We may update this Privacy Policy from time to time. When we do, the "Last updated" date
          at the top of this page will be revised to reflect the change. Continued use of the
          Services after such changes constitutes acceptance of the updated Policy.
        </p>
      </Section>

      <Section id="scope" number={2} title="WHO THIS POLICY APPLIES TO">
        <p style={pStyle}>
          We have users located in the United States, the European Economic Area (EEA), the United
          Kingdom, Switzerland, Iceland, Liechtenstein, Norway, and Canada. This Policy is written
          to address the requirements of applicable privacy laws in these regions, including the
          GDPR (EU/UK), PIPEDA (Canada), the CCPA and other U.S. state privacy laws.
        </p>
      </Section>

      <Section id="collect" number={3} title="INFORMATION WE COLLECT">
        <SubHeading>Information You Provide Directly</SubHeading>
        <p style={pStyle}>When you use Depthly, we collect the following information that you provide to us directly:</p>
        <ul style={ulStyle}>
          <li style={pStyle}><strong style={strongStyle}>Name</strong> (your display name)</li>
          <li style={pStyle}><strong style={strongStyle}>Email address</strong> (used for account access and login)</li>
          <li style={pStyle}><strong style={strongStyle}>Username</strong> (your public profile slug/URL)</li>
          <li style={pStyle}>
            <strong style={strongStyle}>Password</strong> (for accounts created via email/password;
            stored securely, hashed, and never in plain text)
          </li>
          <li style={pStyle}><strong style={strongStyle}>Contact preferences</strong> (notification and reminder settings you configure)</li>
          <li style={pStyle}><strong style={strongStyle}>Contact or authentication data</strong> (associated with signing in via Google OAuth)</li>
          <li style={pStyle}><strong style={strongStyle}>Profile photos</strong> (avatar images you choose to upload)</li>
        </ul>

        <SubHeading>Information Collected Automatically</SubHeading>
        <p style={pStyle}>We automatically collect certain log and usage data as part of operating our infrastructure, including:</p>
        <ul style={ulStyle}>
          <li style={pStyle}>IP address</li>
          <li style={pStyle}>Browser type and settings</li>
          <li style={pStyle}>Device and request information</li>
          <li style={pStyle}>Information about how you interact with the Services (e.g., timestamps of activity)</li>
        </ul>
        <p style={pStyle}>
          This information is generated by our hosting and authentication infrastructure (Vercel
          and Supabase) as a normal part of running a secure web application, and is used for
          diagnosing problems, maintaining security, and preventing fraudulent or abusive activity
          (such as manipulation of the leaderboard or streak features).
        </p>

        <SubHeading>Information We Do Not Collect</SubHeading>
        <p style={pStyle}>
          We do not collect phone numbers, mailing addresses, job titles, billing addresses, or
          debit/credit card numbers. Billing and payment details are collected and processed
          directly by our payment processor, Lemon Squeezy, and are never transmitted to or stored
          on our servers.
        </p>
        <p style={pStyle}>
          We do not collect information from sources other than you directly (e.g., we do not
          purchase or obtain data from data brokers, public records, or other third parties).
        </p>
      </Section>

      <Section id="use" number={4} title="HOW WE USE YOUR INFORMATION">
        <p style={pStyle}>We use your information for the following purposes:</p>
        <ul style={ulStyle}>
          <li style={pStyle}>
            <strong style={strongStyle}>To deliver and facilitate the Services</strong> — operating
            your focus timer, projects, tasks, analytics, and (if enabled) your public profile and
            leaderboard participation.
          </li>
          <li style={pStyle}>
            <strong style={strongStyle}>To respond to your inquiries</strong> — when you contact us
            with questions or support requests.
          </li>
          <li style={pStyle}>
            <strong style={strongStyle}>To send administrative information</strong> — such as
            billing confirmations, password reset emails, and notices about changes to our legal
            terms.
          </li>
          <li style={pStyle}>
            <strong style={strongStyle}>To identify usage trends</strong> — to understand how the
            Services are used so that we can maintain and improve them.
          </li>
          <li style={pStyle}>
            <strong style={strongStyle}>To protect the Services</strong> — to diagnose technical
            problems and prevent fraudulent or abusive activity, including automated manipulation
            of focus sessions, streaks, or leaderboard rankings.
          </li>
        </ul>
        <p style={pStyle}>
          We do not use your information for targeted advertising, marketing communications, or
          automated profiling that produces legal or similarly significant effects on you.
        </p>
        <p style={pStyle}>
          <strong style={strongStyle}>Legal basis for processing (EEA/UK users):</strong> We
          process your information primarily to perform our contract with you (i.e., to provide the
          Services you signed up for), and, where applicable, based on our legitimate interests in
          maintaining the security, integrity, and usability of the Services — which we have
          balanced against your rights and interests.
        </p>
      </Section>

      <Section id="share" number={5} title="HOW WE SHARE YOUR INFORMATION">
        <p style={pStyle}>
          We disclose certain personal information to trusted third-party service providers who
          process it on our behalf, to help us operate the Services. We do not sell your personal
          information, and we do not share it with third parties for their own independent
          marketing or advertising purposes.
        </p>
        <p style={pStyle}>The third-party services we use are:</p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', color: '#E8E6F0', fontWeight: 500, padding: '8px 12px 8px 0', borderBottom: '0.5px solid #2E2E38' }}>
                  Service Provider
                </th>
                <th style={{ textAlign: 'left', color: '#E8E6F0', fontWeight: 500, padding: '8px 0', borderBottom: '0.5px solid #2E2E38' }}>
                  Purpose
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Supabase', 'Database, authentication, and file storage'],
                ['Lemon Squeezy', 'Payment processing and subscription billing'],
                ['Google', 'OAuth sign-in (if you choose to sign in with Google)'],
                ['Vercel', 'Website hosting'],
              ].map(([provider, purpose]) => (
                <tr key={provider}>
                  <td style={{ padding: '8px 12px 8px 0', borderBottom: '0.5px solid #2E2E38', color: '#E8E6F0', whiteSpace: 'nowrap' }}>
                    {provider}
                  </td>
                  <td style={{ padding: '8px 0', borderBottom: '0.5px solid #2E2E38', ...pStyle }}>{purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={pStyle}>
          Each of these providers maintains its own privacy policy and data processing terms
          governing how they handle information on our behalf. In particular, if you make a payment
          through Lemon Squeezy, that transaction is subject to Lemon Squeezy's own Privacy Policy,
          available at:{' '}
          <a href="https://www.lemonsqueezy.com/privacy" target="_blank" rel="noopener noreferrer" style={linkStyle}>
            https://www.lemonsqueezy.com/privacy
          </a>
        </p>
        <p style={pStyle}>
          <strong style={strongStyle}>Business transfers:</strong> If we are involved in a merger,
          acquisition, financing, or sale of all or a portion of our business, your information may
          be transferred as part of that transaction. We will make reasonable efforts to notify you
          before your information becomes subject to a different privacy policy.
        </p>
        <p style={pStyle}>
          <strong style={strongStyle}>Legal disclosures:</strong> We may disclose your information
          if required to do so by law, or in response to valid requests by public authorities.
        </p>
      </Section>

      <Section id="cookies" number={6} title="COOKIES AND TRACKING TECHNOLOGIES">
        <p style={pStyle}>
          Depthly uses essential, functional cookies to keep you signed in and to maintain your
          session while using the Services (for example, through Supabase Auth and Google OAuth
          sign-in flows). We do not use cookies for advertising, targeted marketing, or third-party
          analytics tracking (e.g., we do not use Google Analytics), and we do not use Google Maps
          or similar location-based APIs.
        </p>
        <p style={{ ...pStyle, fontStyle: 'italic' }}>
          A dedicated Cookie Policy page will be linked here once available.
        </p>
      </Section>

      <Section id="retention" number={7} title="DATA RETENTION">
        <p style={pStyle}>
          We retain your personal information for as long as you maintain an account with us. If
          you wish to have your account and associated data deleted, please contact us at{' '}
          <a href={MAILTO} style={linkStyle}>{EMAIL}</a>, and we will process your request
          manually. (Note: a self-service account deletion feature is planned for a future
          release.)
        </p>
      </Section>

      <Section id="security" number={8} title="DATA SECURITY">
        <p style={pStyle}>We take reasonable technical and organizational measures to protect your personal information, including:</p>
        <ul style={ulStyle}>
          <li style={pStyle}>Row Level Security (RLS) policies enforced at the database level, ensuring users can only access their own data</li>
          <li style={pStyle}>Secure authentication and password hashing via Supabase Auth</li>
          <li style={pStyle}>HTTPS encryption for all traffic</li>
          <li style={pStyle}>No direct handling or storage of payment card data (processed entirely by Lemon Squeezy, which maintains PCI-DSS compliance)</li>
        </ul>
        <p style={pStyle}>
          No method of transmission over the internet or electronic storage is 100% secure, and we
          cannot guarantee absolute security. In the event of a security incident affecting your
          personal information, we will notify affected individuals and relevant authorities as
          required by applicable law (e.g., within 72 hours under the GDPR, where applicable).
        </p>
      </Section>

      <Section id="rights" number={9} title="YOUR PRIVACY RIGHTS">
        <p style={pStyle}>Depending on your location, you may have the following rights regarding your personal information:</p>

        <SubHeading>If you are in the EEA, UK, or Switzerland (GDPR)</SubHeading>
        <ul style={ulStyle}>
          <li style={pStyle}>The right to access the personal information we hold about you</li>
          <li style={pStyle}>The right to request correction of inaccurate information</li>
          <li style={pStyle}>The right to request deletion of your information</li>
          <li style={pStyle}>The right to restrict or object to our processing of your information</li>
          <li style={pStyle}>The right to data portability</li>
          <li style={pStyle}>The right to withdraw consent at any time, where processing is based on consent</li>
          <li style={pStyle}>The right to lodge a complaint with your local data protection authority</li>
        </ul>

        <SubHeading>If you are in the United States (CCPA and other applicable state laws)</SubHeading>
        <ul style={ulStyle}>
          <li style={pStyle}>The right to know what personal information we have collected about you</li>
          <li style={pStyle}>The right to request deletion of your personal information</li>
          <li style={pStyle}>The right to opt out of the sale or sharing of your personal information (note: we do not sell or share your personal information)</li>
          <li style={pStyle}>The right to non-discrimination for exercising your privacy rights</li>
        </ul>

        <SubHeading>If you are in Canada (PIPEDA)</SubHeading>
        <ul style={ulStyle}>
          <li style={pStyle}>The right to access your personal information</li>
          <li style={pStyle}>The right to challenge the accuracy and completeness of your information and have it amended as appropriate</li>
        </ul>

        <p style={pStyle}>
          <strong style={strongStyle}>How to exercise your rights:</strong> You may submit a
          request to exercise any of the above rights by emailing us at{' '}
          <a href={MAILTO} style={linkStyle}>{EMAIL}</a>. You may also use this same email address
          to appeal a decision regarding your request. We will respond to your request within the
          timeframe required by applicable law. Where a request depends on rights granted under
          your specific country's privacy law, we will process it in accordance with that law.
        </p>
      </Section>

      <Section id="children" number={10} title="CHILDREN’S PRIVACY">
        <p style={pStyle}>
          The Services are not directed at children, and we do not knowingly collect personal
          information from children under the age of 18 (or the relevant age of majority in your
          jurisdiction) without parental consent. If you believe a child has provided us with
          personal information, please contact us at{' '}
          <a href={MAILTO} style={linkStyle}>{EMAIL}</a> so we can take appropriate action.
        </p>
      </Section>

      <Section id="transfers" number={11} title="INTERNATIONAL DATA TRANSFERS">
        <p style={pStyle}>
          If you access the Services from a region with data protection laws that differ from
          those applicable to Depthly, please be aware that your information may be transferred to,
          stored, and processed outside your region. By using the Services, you consent to this
          transfer.
        </p>
      </Section>

      <Section id="dpo" number={12} title="DATA PROTECTION OFFICER">
        <p style={pStyle}>
          Depthly serves as the entity responsible for privacy matters. You may contact us at{' '}
          <a href={MAILTO} style={linkStyle}>{EMAIL}</a> regarding any privacy-related questions or
          concerns.
        </p>
      </Section>

      <Section id="gpc" number={13} title="GLOBAL PRIVACY CONTROL">
        <p style={pStyle}>
          Depthly does not currently detect or respond to Global Privacy Control (GPC) browser
          signals, as we do not engage in the sale or sharing of personal information that such
          signals are designed to restrict.
        </p>
      </Section>

      <Section id="changes" number={14} title="CHANGES TO THIS PRIVACY POLICY">
        <p style={pStyle}>
          We may update this Privacy Policy from time to time to reflect changes in our practices
          or for legal, operational, or regulatory reasons. Material changes will be reflected by
          an updated "Last updated" date at the top of this page. We encourage you to review this
          Policy periodically.
        </p>
      </Section>

      <Section id="contact" number={15} title="CONTACT US">
        <p style={pStyle}>
          If you have questions, concerns, or requests regarding this Privacy Policy or our data
          practices, please contact us at:
        </p>
        <p style={{ ...pStyle, marginTop: -6 }}>
          <strong style={strongStyle}>Depthly</strong>
          <br />
          Email: <a href={MAILTO} style={linkStyle}>{EMAIL}</a>
        </p>
      </Section>
    </LegalLayout>
  )
}
