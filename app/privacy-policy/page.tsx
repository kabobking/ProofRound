import type { Metadata } from 'next';
import LegalPageShell from '@/components/LegalPageShell';

export const metadata: Metadata = {
  title: 'Privacy Policy | Proofround',
  description: 'How Proofround collects, uses, and protects information.',
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPageShell title="Privacy Policy" updatedAt="May 13, 2026">
      <section>
        <h2 className="text-lg font-semibold text-[var(--text)]">Overview</h2>
        <p className="mt-3">
          Proofround is built to minimize the data we need to operate the product. We collect only what is necessary to
          provide verification packets, support accounts, and improve the service.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[var(--text)]">Information we collect</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>Account details such as name, email address, and role.</li>
          <li>Startup profile data and fundraising information entered by founders.</li>
          <li>Stripe connection metadata and verified revenue packet snapshots.</li>
          <li>Basic usage and device data used for security, debugging, and analytics.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[var(--text)]">How we use information</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>To provide and secure the Proofround platform.</li>
          <li>To generate and display verification packets and related startup pages.</li>
          <li>To communicate with users about product updates, support, and account changes.</li>
          <li>To improve reliability, analytics, and fraud prevention.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[var(--text)]">Data sharing</h2>
        <p className="mt-3">
          We do not sell personal information. We may share information with trusted service providers that help us run
          the product, or when required to comply with law or protect our rights.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[var(--text)]">Security and retention</h2>
        <p className="mt-3">
          We use reasonable administrative and technical safeguards to protect information. We retain data only as long
          as needed to provide the service, meet legal obligations, or support legitimate business needs.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[var(--text)]">Your choices</h2>
        <p className="mt-3">
          You can request access, correction, or deletion of certain information by contacting us. If you disconnect
          Stripe or remove a startup, associated access may be revoked according to product behavior and legal needs.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[var(--text)]">Contact</h2>
        <p className="mt-3">
          Questions about privacy can be sent to support@proofround.com.
        </p>
      </section>
    </LegalPageShell>
  );
}