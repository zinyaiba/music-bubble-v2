import { isValidElement, type ReactElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import type { KaraokeSong } from '../../types'
import { KaraokeSongDetail } from './KaraokeSongDetail'

const completeSong: KaraokeSong = {
  id: 'karaoke-1',
  title: 'Shining☆Days',
  originalArtist: '栗林みな実',
  releaseYear: 2004,
  streamingEpisodes: [10, 3, 20],
  notes: 'キーを変更',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

interface ElementProps {
  children?: ReactNode
  className?: string
  onClick?: () => void
}

function findByClassName(node: ReactNode, className: string): ReactElement<ElementProps> | null {
  if (!isValidElement<ElementProps>(node)) return null
  if (node.props.className === className) return node

  const children = Array.isArray(node.props.children) ? node.props.children : [node.props.children]

  for (const child of children) {
    const match = findByClassName(child, className)
    if (match) return match
  }

  return null
}

describe('KaraokeSongDetail', () => {
  it('情報カードに全項目を表示し、配信回を保存順で個別に描画する', () => {
    const markup = renderToStaticMarkup(
      <KaraokeSongDetail song={completeSong} onBack={vi.fn()} onDelete={vi.fn()} />
    )

    expect(markup).toContain('Shining☆Days')
    expect(markup).toContain('原曲アーティスト名')
    expect(markup).toContain('栗林みな実')
    expect(markup).toContain('発売年')
    expect(markup).toContain('>2004<')
    expect(markup).not.toContain('2004年')
    expect(markup).toContain('備考')
    expect(markup).toContain('キーを変更')

    const episodePositions = completeSong.streamingEpisodes.map((episode) =>
      markup.indexOf(`第${episode}回`)
    )
    expect(episodePositions).toEqual([...episodePositions].sort((a, b) => a - b))
    expect(markup.match(/class="karaoke-song-detail__episode"/g)).toHaveLength(3)
  })

  it('optional項目がない場合は各項目を未登録と表示する', () => {
    const song: KaraokeSong = {
      ...completeSong,
      originalArtist: undefined,
      releaseYear: undefined,
      streamingEpisodes: [],
      notes: undefined,
    }

    const markup = renderToStaticMarkup(
      <KaraokeSongDetail song={song} onBack={vi.fn()} onDelete={vi.fn()} />
    )

    expect(markup.match(/未登録/g)).toHaveLength(4)
    expect(markup.match(/class="karaoke-song-detail__episode"/g)).toHaveLength(1)
  })

  it('戻る操作と削除操作を対応するボタンへ接続する', () => {
    const onBack = vi.fn()
    const onDelete = vi.fn()
    const detail = KaraokeSongDetail({ song: completeSong, onBack, onDelete })

    findByClassName(detail, 'karaoke-song-detail__back-button')?.props.onClick?.()
    findByClassName(detail, 'karaoke-song-detail__delete-button')?.props.onClick?.()

    expect(onBack).toHaveBeenCalledOnce()
    expect(onDelete).toHaveBeenCalledOnce()
  })

  it('操作アイコンを読み上げ対象から除外し、可視テキストを操作名にする', () => {
    const markup = renderToStaticMarkup(
      <KaraokeSongDetail song={completeSong} onBack={vi.fn()} onDelete={vi.fn()} />
    )

    expect(markup).toContain('カラオケ歌唱一覧へ戻る')
    expect(markup).toContain('このカラオケ歌唱曲を削除')
    expect(markup.match(/aria-hidden="true"/g)).toHaveLength(2)
  })
})
