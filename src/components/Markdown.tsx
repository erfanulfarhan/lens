import { Fragment } from 'react'
import { parseMarkdown, type Block, type Inline } from '../markdown.js'

/**
 * Renders model output as React elements rather than injected HTML.
 *
 * Model output is untrusted text, so it is parsed into a token tree and rendered
 * as elements. Nothing reaches innerHTML, which means a model cannot inject
 * markup no matter what it returns.
 */
function Runs({ content }: { content: Inline[] }) {
  return (
    <>
      {content.map((run, i) => {
        switch (run.type) {
          case 'bold':
            return <strong key={i} className="font-semibold text-paper">{run.value}</strong>
          case 'italic':
            return <em key={i}>{run.value}</em>
          case 'code':
            return (
              <code
                key={i}
                className="rounded bg-raise px-1 py-0.5 font-[family-name:var(--font-read)] text-[11.5px] text-brass"
              >
                {run.value}
              </code>
            )
          default:
            return <Fragment key={i}>{run.value}</Fragment>
        }
      })}
    </>
  )
}

function Rendered({ block, index }: { block: Block; index: number }) {
  switch (block.type) {
    case 'heading':
      return (
        <p
          className={
            'mt-2 mb-1 font-semibold text-paper ' +
            (block.level <= 2 ? 'text-[13.5px]' : 'text-[12.5px]')
          }
        >
          <Runs content={block.content} />
        </p>
      )

    case 'bullet':
      return (
        <ul className="my-1 space-y-1">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-2">
              <span aria-hidden className="mt-[7px] size-1 shrink-0 rounded-full bg-brass/70" />
              <span className="min-w-0"><Runs content={item} /></span>
            </li>
          ))}
        </ul>
      )

    case 'numbered':
      return (
        <ol className="my-1 space-y-1">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-2">
              <span className="readout mt-[3px] shrink-0 text-brass/70">{i + 1}</span>
              <span className="min-w-0"><Runs content={item} /></span>
            </li>
          ))}
        </ol>
      )

    case 'codeblock':
      return (
        <pre className="my-1.5 overflow-x-auto rounded-lg border border-line bg-ink p-2.5">
          <code className="font-[family-name:var(--font-read)] text-[11px] leading-relaxed text-paper/90">
            {block.value}
          </code>
        </pre>
      )

    default:
      return (
        <p className={index > 0 ? 'mt-2' : undefined}>
          <Runs content={block.content} />
        </p>
      )
  }
}

export function Markdown({ text, className = '' }: { text: string; className?: string }) {
  const blocks = parseMarkdown(text)
  return (
    <div className={`text-[13px] leading-relaxed ${className}`}>
      {blocks.map((block, i) => (
        <Rendered key={i} block={block} index={i} />
      ))}
    </div>
  )
}
