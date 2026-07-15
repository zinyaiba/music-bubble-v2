import type { Live } from '../../types'
import { LazyEmbed } from '../common/LazyEmbed'
import './LiveEmbedList.css'

interface LiveEmbedListProps {
  live: Live
}

function getEmbedServiceName(embed: string, label?: string): string {
  if (label) return label
  if (embed.includes('spotify')) return 'Spotify'
  if (embed.includes('youtube') || embed.includes('youtu.be')) return 'YouTube'
  if (embed.includes('apple')) return 'Apple Music'
  if (embed.includes('soundcloud')) return 'SoundCloud'
  return '動画'
}

export function LiveEmbedList({ live }: LiveEmbedListProps) {
  const embeds = live.embeds?.filter((item) => item.embed.trim() !== '') ?? []

  if (embeds.length === 0) return null

  return (
    <div
      className="live-embed-list"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      {embeds.map((item, index) => (
        <div key={`${item.embed}-${index}`} className="live-embed-list__item">
          <LazyEmbed
            embed={item.embed}
            title={`${live.title} - ${getEmbedServiceName(item.embed, item.label)}`}
            label={item.label}
          />
        </div>
      ))}
    </div>
  )
}
