import { Aperture } from './components/Aperture';
import { Download } from './components/Download';
import { Faq } from './components/Faq';
import { LEDGER, REPO, STEPS, VERSION } from './content';

/** Section shell: consistent rhythm, more space above a heading than below it. */
function Section({
  id,
  heading,
  lede,
  children,
}: {
  id: string;
  heading: string;
  lede?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mx-auto w-full max-w-[1080px] px-6 pt-32 sm:pt-40">
      <h2 className="display max-w-[26ch] text-[2.1rem] font-extrabold sm:text-[2.9rem]">{heading}</h2>
      {lede && (
        <p className="measure mt-6 text-[16px] leading-[1.72] text-[var(--muted)]">{lede}</p>
      )}
      {children}
    </section>
  );
}

export default function App() {
  return (
    <>
      <header className="mx-auto flex w-full max-w-[1080px] items-center justify-between px-6 py-7">
        <div className="flex items-center gap-3">
          <Aperture size={26} animate={false} id="ap-nav" />
          <span className="text-[19px] font-semibold tracking-tight">Lens</span>
        </div>
        <nav className="-my-3 flex items-center gap-5 text-[13px] text-[var(--muted)] sm:gap-7">
          <a href="#how" className="py-3 transition-colors hover:text-[var(--paper)]">How it works</a>
          <a href="#price" className="hidden py-3 transition-colors hover:text-[var(--paper)] sm:inline-block">Price</a>
          <a href={REPO} className="py-3 transition-colors hover:text-[var(--paper)]">Source</a>
        </nav>
      </header>

      {/* ---------------------------------------------------------------- hero */}
      <main>
        <section className="mx-auto w-full max-w-[1080px] px-6 pt-16 pb-8 sm:pt-24">
          {/* Two columns rather than an overlay. Absolutely positioning the mark
              behind the headline ran the type straight through the metal, which
              read as an accident rather than a composition. */}
          <div className="grid items-center gap-14 lg:grid-cols-[1fr_auto] lg:gap-16">
          <div className="hero-resolve">
            <h1 className="display max-w-[19ch] text-[clamp(2.5rem,6.4vw,4.9rem)] font-black">
              It reads your screen. Your machine keeps it.
            </h1>

            <p className="measure mt-9 text-[17px] leading-[1.7] text-[var(--muted)] sm:text-[18px]">
              Ask about anything on screen, anything just said on a call, or anything in your own
              documents. The model runs on your computer, so there is no subscription and nothing is
              uploaded — the same idea as the assistants you rent, built the other way round.
            </p>

            <div className="mt-11">
              <Download />
            </div>
          </div>

            {/* The mark opens once, alongside the claim it illustrates. Shown at
                every width: hiding it below lg removed the page's one authored
                moment from every phone. */}
            <div className="pointer-events-none order-first justify-self-start lg:order-none lg:justify-self-end">
              <span className="block lg:hidden">
                <Aperture size={132} id="ap-hero-sm" />
              </span>
              <span className="hidden lg:block">
                <Aperture size={248} id="ap-hero" />
              </span>
            </div>
          </div>

          {/* Real product screenshot, not a mockup. */}
          <figure className="shot-rise mt-20 mb-4">
            <div
              className="overflow-hidden rounded-xl border border-[var(--line)]"
              style={{ boxShadow: '0 40px 90px -40px rgba(0,0,0,0.9)' }}
            >
              <img
                src="/shot-answer.png"
                alt="The Lens panel answering a question about what is on screen"
                className="block w-full"
                loading="eager"
              />
            </div>
            <figcaption className="mt-4 text-[13px] text-[var(--faint)]">
              Answering from a screen capture, with a local model. Nothing in this exchange left the
              machine.
            </figcaption>
          </figure>
        </section>

        <div className="rule mx-auto mt-24 max-w-[1080px]" />

        {/* -------------------------------------------------- honest "proof" */}
        <Section
          id="true"
          heading="No testimonials yet. Here is what is true instead."
          lede="Lens is new, so there is no wall of logos to show you and none will be invented here. What can be checked is checkable: the builds exist, the code is readable, and the privacy claims are specific rather than reassuring."
        >
          <dl className="mt-14 border-t border-[var(--line)]">
            {LEDGER.map((row) => (
              <div
                key={row.fact}
                className="grid gap-2 border-b border-[var(--line)] py-6 sm:grid-cols-[19rem_1fr] sm:gap-10"
              >
                <dt className="flex items-start gap-2.5 text-[1.02rem] font-semibold">
                  {row.local && (
                    <span
                      aria-hidden="true"
                      className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: 'var(--sage)', boxShadow: '0 0 12px var(--sage)' }}
                    />
                  )}
                  <span>{row.fact}</span>
                </dt>
                <dd className="m-0 text-[15px] leading-[1.7] text-[var(--muted)]">{row.detail}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 flex items-center gap-2.5 text-[13px] text-[var(--faint)]">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: 'var(--sage)' }}
            />
            Sage marks what happens only on your own hardware.
          </p>
        </Section>

        {/* ----------------------------------------------------- how it works */}
        <Section
          id="how"
          heading="Three steps, then a keyboard shortcut."
          lede="The only genuine setup cost is choosing a model, and Lens does that part for you."
        >
          <ol className="mt-14 list-none p-0">
            {STEPS.map((step, i) => (
              <li
                key={step.title}
                className="grid gap-5 border-t border-[var(--line)] py-10 last:border-b sm:grid-cols-[4rem_1fr_18rem] sm:gap-10"
              >
                <span className="display text-[2.2rem] leading-none font-bold text-[var(--brass)]">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-[1.22rem] font-semibold">{step.title}</h3>
                  <p className="measure mt-3 text-[15px] leading-[1.7] text-[var(--muted)]">
                    {step.body}
                  </p>
                </div>
                <div className="flex flex-col gap-2.5">
                  <code
                    className="mono rounded-lg border border-[var(--line)] px-3.5 py-2.5 text-[12.5px]"
                    style={{ background: 'var(--panel)', color: 'var(--brass-lit)' }}
                  >
                    {step.code}
                  </code>
                  <span className="text-[12.5px] leading-relaxed text-[var(--faint)]">
                    {step.aside}
                  </span>
                </div>
              </li>
            ))}
          </ol>

          <figure className="mt-20">
            <div className="grid gap-5 sm:grid-cols-2">
              {[
                { src: '/shot-history.png', alt: 'Chat history sidebar, with past conversations searchable' },
                { src: '/shot-settings.png', alt: 'Settings: choosing a provider and viewing shortcuts' },
              ].map((s) => (
                <img
                  key={s.src}
                  src={s.src}
                  alt={s.alt}
                  loading="lazy"
                  className="block w-full rounded-xl border border-[var(--line)]"
                  style={{ boxShadow: '0 28px 60px -34px rgba(0,0,0,0.85)' }}
                />
              ))}
            </div>
          </figure>
        </Section>

        {/* ------------------------------------------------------------ price */}
        <Section
          id="price"
          heading="It costs nothing, and that is not a trial."
          lede="There is no server between you and the model, so there is no bill to pass on. That is the whole pricing story."
        >
          <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-[var(--line)] sm:grid-cols-2">
            <div className="p-9" style={{ background: 'var(--panel)' }}>
              <h3 className="text-[1.16rem] font-semibold tracking-wide uppercase">Lens</h3>
              <p className="display mt-5 text-[3.6rem] leading-none font-black text-[var(--brass)]">
                Free
              </p>
              <p className="mt-2 text-[13px] text-[var(--faint)]">forever, and without an account</p>
              <ul className="mt-8 flex list-none flex-col gap-3.5 p-0 text-[14.5px] leading-relaxed">
                {[
                  'Every feature, on every platform',
                  'Your own model, running on your own hardware',
                  'Documents and history stay on the machine',
                  'Bring an API key instead, if you would rather',
                ].map((line) => (
                  <li key={line} className="flex gap-3">
                    <span aria-hidden="true" style={{ color: 'var(--sage)' }}>—</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-9">
                <Download compact />
              </div>
            </div>

            <div className="p-9" style={{ background: 'var(--ink)' }}>
              <h3 className="text-[1.16rem] font-semibold tracking-wide uppercase text-[var(--muted)]">
                The rented kind
              </h3>
              <p className="display mt-5 text-[3.6rem] leading-none font-black text-[var(--faint)]">
                Monthly
              </p>
              <p className="mt-2 text-[13px] text-[var(--faint)]">for as long as you keep using it</p>
              <ul className="mt-8 flex list-none flex-col gap-3.5 p-0 text-[14.5px] leading-relaxed text-[var(--muted)]">
                {[
                  'Your screen is processed on their servers',
                  'The model is whichever one they chose',
                  'Access ends when the payment does',
                  'Retention policy is a document, not a guarantee',
                ].map((line) => (
                  <li key={line} className="flex gap-3">
                    <span aria-hidden="true" className="text-[var(--faint)]">—</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Section>

        {/* -------------------------------------------------------------- faq */}
        <Section id="faq" heading="Questions worth answering plainly.">
          <Faq />
        </Section>
      </main>

      {/* ----------------------------------------------------------- footer */}
      <footer className="mx-auto mt-40 w-full max-w-[1080px] px-6 pb-16">
        <div className="rule" />
        <div className="flex flex-col justify-between gap-10 pt-12 sm:flex-row">
          <div className="max-w-[34ch]">
            <div className="flex items-center gap-3">
              <Aperture size={30} animate={false} id="ap-foot" />
              <span className="text-[19px] font-semibold">Lens</span>
            </div>
            <p className="mt-4 text-[13.5px] leading-relaxed text-[var(--faint)]">
              An aperture, not an eye: something you open to let light in from your own side of the
              machine.
            </p>
          </div>

          <div className="flex gap-14 text-[13.5px]">
            <div className="-my-2 flex flex-col">
              <span className="py-2 text-[var(--faint)]">Get it</span>
              <a href={`${REPO}/releases`} className="py-2.5 text-[var(--muted)] transition-colors hover:text-[var(--paper)]">
                Downloads
              </a>
              <a href={REPO} className="py-2.5 text-[var(--muted)] transition-colors hover:text-[var(--paper)]">
                Source
              </a>
            </div>
            <div className="-my-2 flex flex-col">
              <span className="py-2 text-[var(--faint)]">Read</span>
              <a href={`${REPO}#readme`} className="py-2.5 text-[var(--muted)] transition-colors hover:text-[var(--paper)]">
                Documentation
              </a>
              <a href="https://ollama.com" className="py-2.5 text-[var(--muted)] transition-colors hover:text-[var(--paper)]">
                Ollama
              </a>
            </div>
          </div>
        </div>
        <p className="mt-14 text-[12.5px] text-[var(--faint)]">
          {VERSION} · Lens does not hide itself from screen sharing, by design.
        </p>
      </footer>
    </>
  );
}
