'use client';

import { useState } from 'react';

interface FAQItem {
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  {
    question: 'What does "verified" mean here?',
    answer:
      '"Verified" means metrics are computed directly from Stripe transaction and subscription records using documented rules. Each packet includes a time-stamped snapshot, consistent definitions, and drill-down to underlying Stripe objects. Metrics cannot be manually edited within Proofround.',
  },
  {
    question: 'Is access read-only?',
    answer:
      'Yes. Proofround requests read-only access to your Stripe account. We cannot initiate charges, issue refunds, or modify any account settings. We only read transaction and customer data to generate verification packets.',
  },
  {
    question: 'Do investors need an account?',
    answer:
      'No. Investors receive a shareable link that displays the verification packet in a read-only view. No account creation or login is required on their end.',
  },
  {
    question: 'Can access be revoked?',
    answer:
      'Yes. You can revoke access to any shared link at any time. Revoked links will no longer display the verification packet.',
  },
  {
    question: 'What data is stored?',
    answer:
      'We store minimal data necessary to generate and serve verification packets: aggregated metrics, time-stamped snapshots, and basic account information. Raw transaction data is processed but not permanently stored. You can review our data practices in the Security section.',
  },
  {
    question: 'Is this a data room?',
    answer:
      'No. Proofround generates focused verification packets for revenue metrics and related financial indicators. It is not a comprehensive data room solution and does not replace full diligence processes.',
  },
  {
    question: 'How long does packet generation take?',
    answer:
      'Packet generation typically completes within a few minutes after connecting your Stripe account. Processing time may vary based on transaction volume and selected time range.',
  },
  {
    question: 'What metrics are included?',
    answer:
      'Verification packets include MRR/ARR, gross vs. net revenue, refunds and chargebacks, revenue churn and logo churn, customer concentration, payout reconciliation indicators, and anomaly flags. All metrics are derived directly from Stripe objects with explicit definitions displayed.',
  },
  {
    question: 'Are accounting tools supported?',
    answer:
      'Currently, Proofround supports Stripe as the primary data source. Support for additional accounting platforms and payment processors is planned for future releases.',
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-0">
      {faqItems.map((item, index) => (
        <div
          key={index}
          className={`group border-b border-zinc-200 last:border-b-0 pb-5 last:pb-0 -mx-4 px-4 rounded-lg transition-all ${
            openIndex === index 
              ? 'bg-indigo-50/50 border-l-2 border-l-indigo-500' 
              : 'hover:bg-zinc-50/50'
          }`}
        >
          <button
            type="button"
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
            className="flex w-full items-start justify-between text-left transition-colors py-4"
            aria-expanded={openIndex === index}
          >
            <h3 className={`text-base font-medium pr-4 transition-colors leading-snug ${
              openIndex === index ? 'text-indigo-700' : 'text-zinc-900 group-hover:text-indigo-600'
            }`}>
              {item.question}
            </h3>
            <svg
              className={`h-5 w-5 flex-shrink-0 transition-all ${
                openIndex === index 
                  ? 'rotate-180 text-indigo-600' 
                  : 'text-zinc-400 group-hover:text-indigo-600'
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          {openIndex === index && (
            <div className="mt-2 pb-2 text-sm text-zinc-600 leading-relaxed">
              {item.answer}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

