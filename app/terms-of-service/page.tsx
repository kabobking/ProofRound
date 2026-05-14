import type { Metadata } from 'next';
import LegalPageShell from '@/components/LegalPageShell';

export const metadata: Metadata = {
  title: 'Terms of Service | Proofround',
  description: 'Terms governing use of the Proofround platform.',
};

export default function TermsOfServicePage() {
  return (
    <LegalPageShell title="Terms of Service" updatedAt="May 13, 2026">
      <section>
        <h2 className="text-lg font-semibold text-[var(--text)]">Agreement</h2>
        <p className="mt-3">
          By using Proofround, you agree to these Terms of Service and any additional policies referenced here. If you
          do not agree, do not use the service.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[var(--text)]">Use of the service</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>You may use Proofround only for lawful purposes.</li>
          <li>You are responsible for the accuracy of information you submit.</li>
          <li>You may not interfere with the operation or security of the platform.</li>
          <li>You may not attempt to access data you are not authorized to see.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[var(--text)]">Accounts and Stripe access</h2>
        <p className="mt-3">
          Founder accounts may connect Stripe in read-only mode so Proofround can generate verified revenue packets. You
          are responsible for maintaining control of your account and any shared links you create.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[var(--text)]">Content and intellectual property</h2>
        <p className="mt-3">
          Proofround and its content, branding, and software are owned by Proofround or its licensors. You retain rights
          to the content you submit, subject to the permissions necessary for us to operate the service.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[var(--text)]">Disclaimers</h2>
        <p className="mt-3">
          Verification packets are informational and do not replace legal, financial, or accounting advice. While we aim
          for accuracy, the service is provided on an as-is and as-available basis.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[var(--text)]">Limitation of liability</h2>
        <p className="mt-3">
          To the maximum extent permitted by law, Proofround will not be liable for indirect, incidental, special, or
          consequential damages arising from your use of the service.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[var(--text)]">Changes to these terms</h2>
        <p className="mt-3">
          We may update these terms from time to time. Continued use of the service after an update means you accept the
          revised terms.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[var(--text)]">Contact</h2>
        <p className="mt-3">
          Questions about these terms can be sent to support@proofround.com.
        </p>
      </section>
    </LegalPageShell>
  );
}