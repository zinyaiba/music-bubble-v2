/**
 * タイムラインサービスのユニットテスト
 * Music Bubble Explorer V2
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { TimelineService } from './timelineService'
import { TourGroupingService } from './tourGroupingService'
import type { Song, Live } from '../types'
import type { FirebaseService } from './firebaseService'
import type { LiveService } from './liveService'

describe('TimelineService', () => {
  let timelineService: TimelineService
  let mockFirebaseService: FirebaseService
  let mockLiveService: LiveService
  let tourGroupingService: TourGroupingService

  beforeEach(() => {
    // モックサービスを作成
    mockFirebaseService = {} as FirebaseService
    mockLiveService = {} as LiveService
    tourGroupingService = TourGroupingService.getInstance()

    timelineService = TimelineService.getInstance(
      mockFirebaseService,
      mockLiveService,
      tourGroupingService
    )
  })

  describe('convertSongsToTimelineItems', () => {
    it('should convert songs with singleName to release units', () => {
      const songs: Song[] = [
        {
          id: '1',
          title: 'Song A',
          lyricists: [],
          composers: [],
          arrangers: [],
          releaseYear: 2020,
          releaseDate: '0315',
          singleName: 'Single X',
        },
        {
          id: '2',
          title: 'Song B',
          lyricists: [],
          composers: [],
          arrangers: [],
          releaseYear: 2020,
          releaseDate: '0315',
          singleName: 'Single X',
        },
      ]

      const items = timelineService.convertSongsToTimelineItems(songs)

      expect(items).toHaveLength(1)
      expect(items[0].type).toBe('release-unit')
      
      if (items[0].type === 'release-unit') {
        expect(items[0].releaseName).toBe('Single X')
        expect(items[0].releaseType).toBe('single')
        expect(items[0].songs).toHaveLength(2)
        expect(items[0].position).toBe('right')
        expect(items[0].yearMonth).toBe('2020-03')
        expect(items[0].date).toBe('2020-03-15T00:00:00.000Z')
      }
    })

    it('should convert songs with albumName to release units', () => {
      const songs: Song[] = [
        {
          id: '3',
          title: 'Song C',
          lyricists: [],
          composers: [],
          arrangers: [],
          releaseYear: 2021,
          releaseDate: '0801',
          albumName: 'Album Y',
        },
        {
          id: '4',
          title: 'Song D',
          lyricists: [],
          composers: [],
          arrangers: [],
          releaseYear: 2021,
          releaseDate: '0801',
          albumName: 'Album Y',
        },
      ]

      const items = timelineService.convertSongsToTimelineItems(songs)

      expect(items).toHaveLength(1)
      expect(items[0].type).toBe('release-unit')
      
      if (items[0].type === 'release-unit') {
        expect(items[0].releaseName).toBe('Album Y')
        expect(items[0].releaseType).toBe('album')
        expect(items[0].songs).toHaveLength(2)
        expect(items[0].position).toBe('right')
        expect(items[0].yearMonth).toBe('2021-08')
      }
    })

    it('should prioritize singleName over albumName', () => {
      const songs: Song[] = [
        {
          id: '5',
          title: 'Song E',
          lyricists: [],
          composers: [],
          arrangers: [],
          releaseYear: 2022,
          releaseDate: '0501',
          singleName: 'Single Z',
          albumName: 'Album W',
        },
      ]

      const items = timelineService.convertSongsToTimelineItems(songs)

      expect(items).toHaveLength(1)
      expect(items[0].type).toBe('release-unit')
      
      if (items[0].type === 'release-unit') {
        expect(items[0].releaseName).toBe('Single Z')
        expect(items[0].releaseType).toBe('single')
      }
    })

    it('should convert songs without release info to standalone items', () => {
      const songs: Song[] = [
        {
          id: '6',
          title: 'Song F',
          lyricists: [],
          composers: [],
          arrangers: [],
          releaseYear: 2023,
          releaseDate: '1225',
        },
      ]

      const items = timelineService.convertSongsToTimelineItems(songs)

      expect(items).toHaveLength(1)
      expect(items[0].type).toBe('song')
      
      if (items[0].type === 'song') {
        expect(items[0].song.id).toBe('6')
        expect(items[0].position).toBe('right')
        expect(items[0].yearMonth).toBe('2023-12')
        expect(items[0].date).toBe('2023-12-25T00:00:00.000Z')
      }
    })

    it('should handle mixed release and standalone songs', () => {
      const songs: Song[] = [
        {
          id: '7',
          title: 'Song G',
          lyricists: [],
          composers: [],
          arrangers: [],
          releaseYear: 2020,
          releaseDate: '0101',
          singleName: 'Single A',
        },
        {
          id: '8',
          title: 'Song H',
          lyricists: [],
          composers: [],
          arrangers: [],
          releaseYear: 2020,
          releaseDate: '0202',
        },
      ]

      const items = timelineService.convertSongsToTimelineItems(songs)

      expect(items).toHaveLength(2)
      expect(items.some(item => item.type === 'release-unit')).toBe(true)
      expect(items.some(item => item.type === 'song')).toBe(true)
    })

    it('should handle songs with missing date information', () => {
      const songs: Song[] = [
        {
          id: '9',
          title: 'Song I',
          lyricists: [],
          composers: [],
          arrangers: [],
        },
      ]

      const items = timelineService.convertSongsToTimelineItems(songs)

      expect(items).toHaveLength(1)
      expect(items[0].yearMonth).toBe('9999-99')
      expect(items[0].date).toBe('9999-12-31T00:00:00.000Z')
    })
  })

  describe('convertLivesToTimelineItems', () => {
    it('should convert solo lives to major event items', () => {
      const lives: Live[] = [
        {
          id: 'live1',
          liveType: 'solo',
          title: 'Solo Live',
          venueName: 'Tokyo Hall',
          dateTime: '2023-06-15T18:00:00.000Z',
          setlist: [],
        },
      ]

      const items = timelineService.convertLivesToTimelineItems(lives)

      expect(items).toHaveLength(1)
      expect(items[0].type).toBe('major-event')
      
      if (items[0].type === 'major-event') {
        expect(items[0].eventType).toBe('solo')
        expect(items[0].position).toBe('center')
        expect(items[0].live?.id).toBe('live1')
        expect(items[0].yearMonth).toBe('2023-06')
      }
    })

    it('should convert tour groups to major event items', () => {
      const tourLives: Live[] = [
        {
          id: 'perf1',
          liveType: 'tour',
          title: 'Tour 2023',
          venueName: 'Osaka Hall',
          dateTime: '2023-09-01T18:00:00.000Z',
          setlist: [],
        },
        {
          id: 'perf2',
          liveType: 'tour',
          title: 'Tour 2023',
          venueName: 'Tokyo Hall',
          dateTime: '2023-09-10T18:00:00.000Z',
          setlist: [],
        },
      ]

      const items = timelineService.convertLivesToTimelineItems(tourLives)

      expect(items).toHaveLength(1)
      expect(items[0].type).toBe('major-event')
      
      if (items[0].type === 'major-event') {
        expect(items[0].eventType).toBe('tour')
        expect(items[0].position).toBe('center')
        expect(items[0].tourGroup?.tourName).toBe('Tour 2023')
        expect(items[0].yearMonth).toBe('2023-09')
        expect(items[0].date).toBe('2023-09-01T18:00:00.000Z')
      }
    })

    it('should convert festival/event/release lives to left position items', () => {
      const lives: Live[] = [
        {
          id: 'festival1',
          liveType: 'festival',
          title: 'Music Festival',
          venueName: 'Festival Ground',
          dateTime: '2023-08-20T14:00:00.000Z',
          setlist: [],
        },
        {
          id: 'event1',
          liveType: 'event',
          title: 'Special Event',
          venueName: 'Event Hall',
          dateTime: '2023-07-10T19:00:00.000Z',
          setlist: [],
        },
      ]

      const items = timelineService.convertLivesToTimelineItems(lives)

      expect(items).toHaveLength(2)
      expect(items[0].type).toBe('live')
      expect(items[1].type).toBe('live')
      
      if (items[0].type === 'live') {
        expect(items[0].position).toBe('left')
        expect(items[0].live.liveType).toBe('festival')
        expect(items[0].yearMonth).toBe('2023-08')
      }
      
      if (items[1].type === 'live') {
        expect(items[1].position).toBe('left')
        expect(items[1].live.liveType).toBe('event')
        expect(items[1].yearMonth).toBe('2023-07')
      }
    })

    it('should handle mixed live types', () => {
      const lives: Live[] = [
        {
          id: 'perf1',
          liveType: 'tour',
          title: 'Tour 2024',
          venueName: 'Osaka Hall',
          dateTime: '2024-01-15T18:00:00.000Z',
          setlist: [],
        },
        {
          id: 'perf2',
          liveType: 'tour',
          title: 'Tour 2024',
          venueName: 'Tokyo Hall',
          dateTime: '2024-02-15T18:00:00.000Z',
          setlist: [],
        },
        {
          id: 'solo1',
          liveType: 'solo',
          title: 'Solo Concert',
          venueName: 'Arena',
          dateTime: '2024-03-20T19:00:00.000Z',
          setlist: [],
        },
        {
          id: 'fest1',
          liveType: 'festival',
          title: 'Summer Fest',
          venueName: 'Open Air',
          dateTime: '2024-07-01T15:00:00.000Z',
          setlist: [],
        },
      ]

      const items = timelineService.convertLivesToTimelineItems(lives)

      expect(items).toHaveLength(3)
      
      // Tour should be major event
      const tourItem = items.find(item => item.type === 'major-event' && item.eventType === 'tour')
      expect(tourItem).toBeDefined()
      if (tourItem?.type === 'major-event') {
        expect(tourItem.position).toBe('center')
      }
      
      // Solo should be major event
      const soloItem = items.find(item => item.id === 'major-event-solo-solo1')
      expect(soloItem?.type).toBe('major-event')
      if (soloItem?.type === 'major-event') {
        expect(soloItem.eventType).toBe('solo')
        expect(soloItem.position).toBe('center')
      }
      
      // Festival should be regular live item
      const festItem = items.find(item => item.id === 'live-fest1')
      expect(festItem?.type).toBe('live')
      if (festItem?.type === 'live') {
        expect(festItem.position).toBe('left')
      }
    })
  })

  describe('extractYearMonth', () => {
    it('should extract year-month from ISO 8601 string', () => {
      const result = timelineService.extractYearMonth('2023-06-15T18:00:00.000Z')
      expect(result).toBe('2023-06')
    })

    it('should extract year-month from release data object', () => {
      const result = timelineService.extractYearMonth({ year: 2022, date: '0315' })
      expect(result).toBe('2022-03')
    })

    it('should return 9999-99 for missing year', () => {
      const result = timelineService.extractYearMonth({ date: '0315' })
      expect(result).toBe('9999-99')
    })

    it('should return 9999-99 for missing date', () => {
      const result = timelineService.extractYearMonth({ year: 2022 })
      expect(result).toBe('9999-99')
    })

    it('should return 9999-99 for invalid ISO string', () => {
      const result = timelineService.extractYearMonth('invalid-date')
      expect(result).toBe('9999-99')
    })
  })

  describe('groupSongsByRelease', () => {
    it('should group songs by singleName', () => {
      const songs: Song[] = [
        {
          id: '1',
          title: 'Song A',
          lyricists: [],
          composers: [],
          arrangers: [],
          singleName: 'Single X',
        },
        {
          id: '2',
          title: 'Song B',
          lyricists: [],
          composers: [],
          arrangers: [],
          singleName: 'Single X',
        },
      ]

      const result = timelineService.groupSongsByRelease(songs)

      expect(result.releaseUnits.size).toBe(1)
      expect(result.releaseUnits.get('Single X')).toHaveLength(2)
      expect(result.standaloneSongs).toHaveLength(0)
    })

    it('should group songs by albumName when no singleName', () => {
      const songs: Song[] = [
        {
          id: '3',
          title: 'Song C',
          lyricists: [],
          composers: [],
          arrangers: [],
          albumName: 'Album Y',
        },
      ]

      const result = timelineService.groupSongsByRelease(songs)

      expect(result.releaseUnits.size).toBe(1)
      expect(result.releaseUnits.get('Album Y')).toHaveLength(1)
      expect(result.standaloneSongs).toHaveLength(0)
    })

    it('should place songs with neither singleName nor albumName in standalone', () => {
      const songs: Song[] = [
        {
          id: '4',
          title: 'Song D',
          lyricists: [],
          composers: [],
          arrangers: [],
        },
      ]

      const result = timelineService.groupSongsByRelease(songs)

      expect(result.releaseUnits.size).toBe(0)
      expect(result.standaloneSongs).toHaveLength(1)
      expect(result.standaloneSongs[0].id).toBe('4')
    })
  })
})
