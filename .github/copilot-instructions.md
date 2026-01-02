# Proofround AI Agent Guide
- **Stack**: Next.js 16 App Router with React 19; Tailwind-style utility classes live in components under app/ and components/. Use the `@/*` path alias defined in tsconfig.json.
- **Entry points**: Root layout in [app/layout.tsx](app/layout.tsx) and marketing surface in [app/page.tsx](app/page.tsx). Auth and legal stubs live in app/login, app/signup, app/privacy, and app/terms.
- **Dev server**: Run `npm install` then `npm run dev`. Production build uses `npm run build && npm run start`. Lint with `npm run lint`, which reads the flat config in eslint.config.mjs.

## Packet Data Pipeline
- **Domain goal**: Enforce Stripe data minimization. Only store aggregates plus Stripe IDs—never raw Stripe objects.
- **Generation**: `generatePacket` in [lib/packet-generator.ts](lib/packet-generator.ts) consumes in-memory Stripe payloads and returns a `ProofroundPacket`. Raw inputs are discarded after this call.
- **Packet shape**: Types in [lib/packet-types.ts](lib/packet-types.ts) define allowed aggregates, anomaly flags, audit metadata, and reference ID arrays. Reuse these types when extending APIs.
- **Barrel exports**: Import packet helpers from [lib/packet/index.ts](lib/packet/index.ts) to avoid deep paths.

## Storage & Validation
- **Save flow**: Always persist via `savePacket` from [lib/packet-storage.ts](lib/packet-storage.ts); it validates minimization, size (<5 MB), and reference purity before writing.
- **Storage backend**: `InMemoryPacketStorage` is demo-only. For real persistence, implement the `PacketStorage` interface and reuse `validateBeforeStorage` via `savePacket` to keep safeguards.
- **Debugging**: Enabling NODE_ENV=development or PACKET_DEBUG=true logs packet sizes and reference counts. See [lib/VERIFICATION_GUIDE.md](lib/VERIFICATION_GUIDE.md).
- **Verification tools**: `verifyPacketRecord` in [lib/packet-verification.ts](lib/packet-verification.ts) performs deep Stripe-object scans; call it in migrations or health checks.

## Drill-Down Pattern
- **Live fetches**: `fetchCustomerDrillDown` and peers in [lib/packet-drilldown.ts](lib/packet-drilldown.ts) pull fresh data using stored IDs. Never persist their results; use `validateNoDrillDownStorage` to guard against leaks.
- **API route usage**: [app/api/packets/route.ts](app/api/packets/route.ts) shows packet CRUD with view-tracking via `recordPacketView`. [app/api/packets/drilldown/route.ts](app/api/packets/drilldown/route.ts) validates IDs against packet references before hitting Stripe.
- **Credentials**: Drill-down endpoints expect STRIPE_SECRET_KEY in the environment. Replace `ExampleStripeClient` with the real Stripe SDK when wiring production.

## Frontend Patterns
- **Animations**: Landing sections rely on in-view detection and reduced-motion helpers in [components/landing/motion.ts](components/landing/motion.ts). Components such as Navigation, Hero, and Section compose Tailwind classes for layout.
- **Forms**: Reuse validation from [lib/validate.ts](lib/validate.ts) for waitlist-style submissions; extend its schema instead of revalidating inputs ad hoc.
- **Styling**: Global styles live in [app/globals.css](app/globals.css); prefer utility classes and shared Section primitives over bespoke CSS.

## Working Tips
- **Extending packets**: Add new aggregates to packet types and generator together, then update storage validation docs in [lib/DATA_MINIMIZATION.md](lib/DATA_MINIMIZATION.md).
- **Testing gaps**: No automated tests exist; lean on TypeScript and verification utilities when changing packet structures.
- **Common pitfalls**: Do not instantiate `InMemoryPacketStorage` per request—lift it to module scope or swap for durable storage. Avoid returning raw Stripe payloads from API routes.
- **Docs**: Refactoring context and minimization principles are summarized in [lib/REFACTORING_SUMMARY.md](lib/REFACTORING_SUMMARY.md) and [lib/DATA_MINIMIZATION.md](lib/DATA_MINIMIZATION.md).