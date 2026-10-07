import { useI18n } from '../i18n'
import { presetRange } from '../lib/dates'

const presets = ['today', 'week', 'month', 'lastMonth', 'custom'] as const

export type DatePreset = (typeof presets)[number]

export function DateRangeControl({
  preset,
  from,
  to,
  onChange,
}: {
  preset: DatePreset
  from: string
  to: string
  onChange: (next: { preset: DatePreset; from: string; to: string }) => void
}) {
  const { t } = useI18n()
  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label={t('dates.range')}>
        {presets.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={preset === value}
            className={`shrink-0 rounded-full px-3 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
              preset === value ? 'bg-brand text-white' : 'bg-white text-ink ring-1 ring-[#D0D5DD] hover:bg-brand-soft'
            }`}
            onClick={() => {
              if (value === 'custom') {
                onChange({ preset: 'custom', from, to })
                return
              }
              const range = presetRange(value)
              onChange({ preset: value, ...range })
            }}
          >
            {t(`dates.${value}`)}
          </button>
        ))}
      </div>
      {preset === 'custom' ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-ink">
            {t('common.from')}
            <input
              type="date"
              value={from}
              onChange={(event) => onChange({ preset: 'custom', from: event.target.value, to })}
              className="mt-1.5 min-h-11 w-full rounded-lg border border-[#D0D5DD] px-3"
            />
          </label>
          <label className="block text-sm font-medium text-ink">
            {t('common.to')}
            <input
              type="date"
              value={to}
              onChange={(event) => onChange({ preset: 'custom', from, to: event.target.value })}
              className="mt-1.5 min-h-11 w-full rounded-lg border border-[#D0D5DD] px-3"
            />
          </label>
        </div>
      ) : null}
    </div>
  )
}
