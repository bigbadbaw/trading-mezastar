import { useTranslations } from 'next-intl';

import type { ScoreBreakdown } from '@/data/catalog';

/**
 * Renders the transparent score breakdown returned by the engine. Reads
 * `score.components` directly — never recomputes — so the rows always sum to the
 * headline total (M2's transparency-by-construction).
 */
export function ScoreBreakdownTable({ score }: { score: ScoreBreakdown }) {
  const t = useTranslations('scoring');
  const tTier = useTranslations('gradeTier');
  const tMech = useTranslations('mechanics');
  const { scarcity, popularity, market, mechanic } = score.components;

  return (
    <table className="w-full border-collapse text-base">
      <thead>
        <tr className="border-b border-vault-hairline text-left text-sm text-vault-muted">
          <th className="py-2 pr-4 font-medium">{t('headComponent')}</th>
          <th className="py-2 pr-4 font-medium">{t('headDetail')}</th>
          <th className="py-2 text-right font-medium">{t('headPoints')}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-vault-hairline">
        <tr>
          <td className="py-2 pr-4 font-medium text-vault-text">{t('component.scarcity')}</td>
          <td className="py-2 pr-4 text-vault-muted">{tTier(scarcity.tier)}</td>
          <td className="py-2 text-right font-mono tabular-nums text-vault-text">{scarcity.points}</td>
        </tr>
        <tr>
          <td className="py-2 pr-4 font-medium text-vault-text">{t('component.popularity')}</td>
          <td className="py-2 pr-4 text-vault-muted">
            {t('popScore', { score: popularity.popScore })} ·{' '}
            {t('sourceLabel.' + popularity.source)}
          </td>
          <td className="py-2 text-right font-mono tabular-nums text-vault-text">{popularity.points}</td>
        </tr>
        <tr>
          <td className="py-2 pr-4 font-medium text-vault-text">{t('component.market')}</td>
          <td className="py-2 pr-4 text-vault-muted">
            NT${Math.round(market.medianPrice)}
            {market.confidence < 1 && (
              <span className="ml-1 text-status-slight">
                {t('confidence', { confidence: market.confidence })}
              </span>
            )}
          </td>
          <td className="py-2 text-right font-mono tabular-nums text-vault-text">{market.points}</td>
        </tr>
        <tr>
          <td className="py-2 pr-4 font-medium text-vault-text">{t('component.mechanic')}</td>
          <td className="py-2 pr-4 text-vault-muted">
            {mechanic.flags.length > 0
              ? mechanic.flags.map((f) => tMech(f)).join(', ')
              : t('none')}
          </td>
          <td className="py-2 text-right font-mono tabular-nums text-vault-text">{mechanic.points}</td>
        </tr>
      </tbody>
      <tfoot>
        <tr className="border-t-2 border-vault-hairline font-bold text-vault-text">
          <td className="py-2 pr-4" colSpan={2}>
            {t('total')}
          </td>
          <td className="py-2 text-right font-mono tabular-nums">{score.total}</td>
        </tr>
      </tfoot>
    </table>
  );
}
