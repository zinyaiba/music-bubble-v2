import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { KaraokeSong } from '../../types'
import { KaraokeSongCard } from './KaraokeSongCard'
import { KaraokeSongList } from './KaraokeSongList'

const makeSong = (id: string, title: string, originalArtist?: string): KaraokeSong => ({
  id,
  title,
  originalArtist,
  streamingEpisodes: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
})
const noop = () => undefined

describe('KaraokeSongCard', () => {
  it('ネイティブbuttonに曲名と原曲アーティストを表示する', () => {
    const html = renderToStaticMarkup(
      <KaraokeSongCard song={makeSong('1', 'Shining Days', '栗林みな実')} onClick={noop} />
    )
    expect(html).toContain('<button type="button"')
    expect(html).toContain('Shining Days')
    expect(html).toContain('原曲アーティスト')
    expect(html).toContain('栗林みな実')
    expect(html).toContain('aria-hidden="true"')
  })
})

describe('KaraokeSongList', () => {
  const songs = [
    makeSong('1', 'Shining Days', '栗林みな実'),
    makeSong('2', 'STRAIGHT JET', 'Minami'),
  ]
  const renderList = (items: KaraokeSong[], query: string) =>
    renderToStaticMarkup(
      <KaraokeSongList songs={items} query={query} onQueryChange={noop} onSongClick={noop} />
    )

  it('可視label、検索結果、表示件数と総件数のlive regionを表示する', () => {
    const html = renderList(songs, 'minami')
    expect(html).toContain('aria-label="カラオケ歌唱曲を検索"')
    expect(html).toContain('aria-live="polite"')
    expect(html).toContain('1/2曲')
    expect(html).toContain('STRAIGHT JET')
    expect(html).not.toContain('Shining Days')
  })

  it('登録が0件なら未登録空状態を表示する', () => {
    const html = renderList([], 'anything')
    expect(html).toContain('カラオケ歌唱曲が登録されていません')
    expect(html).not.toContain('検索を解除')
  })

  it('検索結果が0件なら0件状態とネイティブ解除buttonを表示する', () => {
    const html = renderList(songs, 'not-found')
    expect(html).toContain('指定した条件に一致する曲はありません')
    expect(html).toContain('aria-label="検索とフィルターを解除して全件表示"')
    expect(html).toContain('条件を解除</button>')
  })
})
